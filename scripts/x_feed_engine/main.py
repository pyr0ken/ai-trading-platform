import argparse
import asyncio
import sys
from pathlib import Path
from loguru import logger

from x_feed.config import load_config
from x_feed.database import init_db, save_tweets_to_db, export_tweets_for_ai
from x_feed.auth.direct import automated_login
from x_feed.auth.manual import manual_login
from x_feed.auth.manager import AuthManager
from x_feed.scraper.feed import scrape_user_profile


def parse_args() -> argparse.Namespace:
    """
    CLI surface.

    The engine previously required interactive stdin, which made it impossible
    to run from cron, systemd, or the trading platform's own scheduler. Every
    interactive prompt now has a flag equivalent; running bare still shows the
    original menu so existing usage is unchanged.
    """
    parser = argparse.ArgumentParser(
        description="X feed engine — scrape recent tweets from configured accounts."
    )
    parser.add_argument(
        "--non-interactive",
        action="store_true",
        help="Never prompt. Requires --auth-mode (defaults to 'existing').",
    )
    parser.add_argument(
        "--auth-mode",
        choices=["auto", "manual", "existing"],
        default=None,
        help="auto: use .env credentials | manual: open browser | existing: reuse storage_state.json",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="Path for the exported AI feed JSON. Defaults to <db_dir>/tweets_ai_feed.json",
    )
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Wipe the tweets table before scraping. Destroys dedup history.",
    )
    parser.add_argument(
        "--export-age-hours",
        type=int,
        default=None,
        help="Only export tweets newer than this. Defaults to the scraper time window.",
    )
    parser.add_argument(
        "--export-limit",
        type=int,
        default=None,
        help="Cap the number of exported tweets.",
    )
    return parser.parse_args()


async def authenticate(config: dict, args: argparse.Namespace) -> bool:
    """Resolve an authenticated session, prompting only when permitted."""
    state_path = config["paths"]["storage_state"]
    mode = args.auth_mode

    if args.non_interactive and mode is None:
        # Reusing a stored session is the only mode that needs no human.
        mode = "existing"

    if mode is None:
        return await interactive_menu(config)

    if mode == "auto":
        return await automated_login(config)

    if mode == "manual":
        if args.non_interactive:
            logger.error("--auth-mode manual needs a browser and cannot run non-interactively.")
            return False
        await manual_login(config)
        return state_path.exists()

    if mode == "existing":
        if not state_path.exists():
            logger.error(
                f"No stored session at '{state_path}'. "
                "Run once with --auth-mode auto (or manual) to create one."
            )
            return False
        return True

    return False


async def interactive_menu(config: dict) -> bool:
    state_path = config["paths"]["storage_state"]

    print("\n" + "=" * 65)
    print("                X ENGINE - AUTHENTICATION MENU              ")
    print("=" * 65)
    print(" 1. Automated Login  (Uses X_USER, X_PASS, X_EMAIL from .env)")
    print(" 2. Manual Login     (Opens browser for interactive login)")
    print(" 3. Existing Session (Use existing storage_state.json directly)")
    print(" 4. Exit")
    print("=" * 65)

    choice = input("Select an option (1-4): ").strip()

    if choice == "1":
        return await automated_login(config)

    if choice == "2":
        await manual_login(config)
        return state_path.exists()

    if choice == "3":
        if not state_path.exists():
            logger.error(f"No existing session found at '{state_path}'. Please select option 1 or 2.")
            return await interactive_menu(config)
        return True

    if choice == "4":
        logger.info("Exiting application.")
        sys.exit(0)

    logger.warning("Invalid option. Enter 1, 2, 3, or 4.")
    return await interactive_menu(config)


async def run_engine(config: dict, args: argparse.Namespace) -> int:
    """Scrape every configured account. Returns a process exit code."""
    db_path = config["paths"]["db_path"]

    # Non-destructive by default so UNIQUE(tweet_url) can deduplicate across runs.
    init_db(db_path, reset=args.reset)

    auth_manager = AuthManager(config)
    try:
        context = await auth_manager.get_context()
        page = await context.new_page()

        if not await auth_manager.verify_login(page):
            logger.error("Aborting run: session is not authenticated.")
            return 2

        target_users = config["scraper"].get("target_users", [])
        if not target_users:
            logger.warning("No target users defined in config.json under 'scraper.target_users'.")
            return 1

        all_collected_tweets = []
        failed_accounts = []

        for username in target_users:
            try:
                tweets = await scrape_user_profile(page, username, config)
                all_collected_tweets.extend(tweets)
            except Exception as exc:
                # One dead account must not abort the whole run.
                logger.warning(f"Skipping @{username} after error: {exc}")
                failed_accounts.append(username)
            await asyncio.sleep(2)

        save_tweets_to_db(db_path, all_collected_tweets)

        output_path = args.output or (db_path.parent / "tweets_ai_feed.json")
        export_age = args.export_age_hours
        if export_age is None:
            export_age = config["scraper"].get("time_window_hours")
        export_tweets_for_ai(
            db_path,
            output_path,
            max_age_hours=export_age,
            limit=args.export_limit,
        )

        if failed_accounts:
            logger.warning(f"Completed with {len(failed_accounts)} failed account(s): {failed_accounts}")

        return 0

    except Exception as e:
        logger.error(f"Engine execution failure: {e}")
        return 3
    finally:
        await auth_manager.close()


async def main() -> int:
    args = parse_args()
    config = load_config()

    if not await authenticate(config, args):
        logger.error("Authentication failed. Aborting pipeline.")
        return 2

    return await run_engine(config, args)


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
