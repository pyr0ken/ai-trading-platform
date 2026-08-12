import asyncio
import re
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from loguru import logger
from playwright.async_api import Page


def _parse_count(raw: Optional[str]) -> int:
    """
    Convert X's abbreviated engagement labels into integers.

    X renders counts as "1,234", "12.3K", "4.5M" and localises separators, so a
    plain int() fails on most real values. Returns 0 for anything unparseable —
    engagement is a ranking hint, never a reason to drop a tweet.
    """
    if not raw:
        return 0

    text = raw.strip().replace(",", "").replace("\u066c", "").replace("\u060c", "")
    match = re.search(r"(\d+(?:\.\d+)?)\s*([KkMmBb]?)", text)
    if not match:
        return 0

    value = float(match.group(1))
    suffix = match.group(2).upper()
    multiplier = {"": 1, "K": 1_000, "M": 1_000_000, "B": 1_000_000_000}.get(suffix, 1)
    return int(value * multiplier)


async def _extract_engagement(tweet) -> Dict[str, int]:
    """
    Read like / retweet / reply counts from a tweet article element.

    X exposes these on buttons whose aria-label carries the full number, e.g.
    "1234 Likes". The aria-label is preferred because the visible text is
    abbreviated ("1.2K") and loses precision. Every lookup is defensive: a
    layout change degrades engagement to 0 rather than failing the scrape.
    """
    counts = {"like_count": 0, "retweet_count": 0, "reply_count": 0}
    selectors = {
        "like_count": '[data-testid="like"], [data-testid="unlike"]',
        "retweet_count": '[data-testid="retweet"], [data-testid="unretweet"]',
        "reply_count": '[data-testid="reply"]',
    }

    for field, selector in selectors.items():
        try:
            element = tweet.locator(selector).first
            if await element.count() == 0:
                continue

            aria = await element.get_attribute("aria-label")
            if aria:
                counts[field] = _parse_count(aria)
                continue

            # Fall back to visible text when aria-label is absent.
            text = await element.text_content()
            counts[field] = _parse_count(text)
        except Exception:
            # Never let engagement extraction break tweet collection.
            continue

    return counts


async def scrape_user_profile(
    page: Page,
    username: str,
    config: dict
) -> List[Dict[str, Any]]:
    """
    پروفایل کاربر مورد نظر را به صورت Async اسکرپ کرده و توئیت‌های محدوده زمانی تعیین‌شده را استخراج می‌کند.
    """
    scraper_cfg = config.get("scraper", {})
    max_age_hours = scraper_cfg.get("time_window_hours", 24)
    try:
        max_age_hours = int(max_age_hours)
    except (ValueError, TypeError):
        max_age_hours = 24

    logger.info(f"Starting scrape for @{username}...")
    
    try:
        await page.goto(f"https://x.com/{username}", wait_until="domcontentloaded", timeout=30000)
        await page.wait_for_selector('article[data-testid="tweet"]', timeout=20000)
    except Exception as e:
        logger.warning(f"No tweets found or page load timeout for @{username}: {e}")
        return []

    scraped_tweets: List[Dict[str, Any]] = []
    seen_tweet_urls = set()
    cutoff_time = datetime.now(timezone.utc) - timedelta(hours=max_age_hours)
    
    scroll_attempts = 0
    max_scroll_attempts = 5
    old_tweets_streak = 0
    MAX_OLD_STREAK = 3

    while scroll_attempts < max_scroll_attempts:
        tweet_elements = await page.locator('article[data-testid="tweet"]').all()
        new_tweets_in_batch = 0

        for tweet in tweet_elements:
            try:
                # ۱. استخراج و بررسی زمان انتشار (Timestamp)
                time_element = tweet.locator('time').first
                if await time_element.count() == 0:
                    continue
                
                datetime_str = await time_element.get_attribute('datetime')
                if not datetime_str:
                    continue

                # ۲. استخراج لینک یکتا (جلوگیری از بررسی مجدد المان‌های تکراری در اسکرول)
                status_link = await time_element.evaluate("el => el.closest('a')?.href")
                if not status_link or status_link in seen_tweet_urls:
                    continue

                seen_tweet_urls.add(status_link)
                tweet_dt = datetime.fromisoformat(datetime_str.replace('Z', '+00:00'))

                # ۳. بررسی سنجاق‌شده (Pinned) بودن توئیت
                social_context = tweet.locator('div[data-testid="socialContext"]')
                is_pinned = False
                if await social_context.count() > 0:
                    context_text = (await social_context.first.text_content() or "").lower()
                    if any(kw in context_text for kw in ["pinned", "سنجاق", "pin"]):
                        is_pinned = True

                # ۴. بررسی محدوده زمانی با الگوریتم Streak
                if tweet_dt < cutoff_time:
                    if is_pinned:
                        logger.info(f"Skipping old pinned tweet for @{username}.")
                        continue
                    
                    old_tweets_streak += 1
                    logger.debug(
                        f"Tweet older than {max_age_hours}h for @{username} "
                        f"({tweet_dt.strftime('%Y-%m-%d %H:%M')}). Streak: {old_tweets_streak}/{MAX_OLD_STREAK}"
                    )
                    
                    if old_tweets_streak >= MAX_OLD_STREAK:
                        logger.info(f"Reached {MAX_OLD_STREAK} consecutive old tweets for @{username}. Stopping.")
                        return scraped_tweets
                    continue
                else:
                    old_tweets_streak = 0  # با دیدن هر توئیت جدید، شمارنده ریست می‌شود

                # ۵. استخراج متن توئیت
                text_elements = await tweet.locator('div[data-testid="tweetText"]').all_text_contents()
                content_text = text_elements[0].strip() if text_elements else ""
                quoted_text = text_elements[1].strip() if len(text_elements) > 1 else None

                full_text = content_text
                if quoted_text:
                    full_text += f"\n\n[Quoted Tweet]: {quoted_text}"

                new_tweets_in_batch += 1

                # ۶. استخراج معیارهای تعامل (لایک/ریتوییت/ریپلای)
                engagement = await _extract_engagement(tweet)

                # ۷. ساخت دیکشنری خروجی (با تمام نام‌گذاری‌های استاندارد برای جلوگیری از KeyError)
                tweet_data = {
                    "user": username,
                    "username": username,
                    "target_account": username,
                    "tweet_url": status_link,
                    "text": full_text,
                    "content_text": content_text,
                    "quoted_text": quoted_text,
                    "timestamp": datetime_str,
                    "is_pinned": is_pinned,
                    "fetched_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
                    **engagement,
                }
                
                scraped_tweets.append(tweet_data)

            except Exception as e:
                logger.debug(f"Parsing exception: {e}")
                continue

        # اسکرول به پایین جهت دریافت داده‌های جدید
        await page.evaluate("window.scrollBy(0, 1000)")
        await asyncio.sleep(1.5)

        if new_tweets_in_batch == 0:
            scroll_attempts += 1
        else:
            scroll_attempts = 0

    return scraped_tweets