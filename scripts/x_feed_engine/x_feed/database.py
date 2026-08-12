import sqlite3
import json
from pathlib import Path
from loguru import logger


# Schema version. Bump when the tweets table shape changes so init_db can
# migrate instead of silently operating on an incompatible table.
SCHEMA_VERSION = 2


def init_db(db_path: Path, reset: bool = False):
    """
    Prepare the tweets database.

    By default this is NON-DESTRUCTIVE: existing rows are preserved so the
    UNIQUE(tweet_url) constraint can deduplicate across runs. The previous
    behaviour unconditionally dropped the table on every execution, which meant
    a tweet seen on three consecutive runs was exported to the model three
    times, and no run could tell what it had already reported.

    Pass reset=True (CLI: --reset) to deliberately wipe and start clean.
    """
    db_path.parent.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    if reset:
        logger.warning("--reset requested: dropping existing tweets table.")
        cursor.execute("DROP TABLE IF EXISTS tweets")

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tweets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            target_account TEXT,
            user TEXT,
            tweet_url TEXT NOT NULL UNIQUE,
            text TEXT,
            content_text TEXT,
            quoted_text TEXT,
            timestamp TEXT,
            is_pinned INTEGER,
            like_count INTEGER DEFAULT 0,
            retweet_count INTEGER DEFAULT 0,
            reply_count INTEGER DEFAULT 0,
            fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Index the fields the exporter filters and orders by.
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_tweets_timestamp ON tweets(timestamp DESC)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_tweets_account ON tweets(target_account)")

    # Additive migration for databases created before engagement capture.
    existing_cols = {row[1] for row in cursor.execute("PRAGMA table_info(tweets)")}
    for col in ("like_count", "retweet_count", "reply_count"):
        if col not in existing_cols:
            logger.info(f"Migrating schema: adding column '{col}'.")
            cursor.execute(f"ALTER TABLE tweets ADD COLUMN {col} INTEGER DEFAULT 0")

    conn.commit()
    conn.close()
    logger.success(f"Database ready at: {db_path}")


# Backwards-compatible alias. Older callers imported reset_and_init_db and
# expected a wipe; keep that contract explicit rather than silently changing it.
def reset_and_init_db(db_path: Path):
    """Deprecated: use init_db(db_path, reset=True)."""
    init_db(db_path, reset=True)


def save_tweets_to_db(db_path: Path, tweets: list[dict]) -> dict:
    """
    Persist tweets, ignoring ones already stored.

    Returns {"inserted": int, "duplicates": int} so the caller can report how
    much of a run was genuinely new.
    """
    if not tweets:
        logger.warning("No tweets available to persist.")
        return {"inserted": 0, "duplicates": 0}

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    before = cursor.execute("SELECT COUNT(*) FROM tweets").fetchone()[0]

    # INSERT OR IGNORE relies on UNIQUE(tweet_url): re-scraping a tweet is a
    # no-op rather than a duplicate row.
    cursor.executemany(
        """INSERT OR IGNORE INTO tweets
           (target_account, user, tweet_url, text, content_text, quoted_text,
            timestamp, is_pinned, like_count, retweet_count, reply_count, fetched_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        [(
            t.get("target_account", ""),
            t.get("user", ""),
            t.get("tweet_url", ""),
            t.get("text", ""),
            t.get("content_text", ""),
            t.get("quoted_text"),
            t.get("timestamp", ""),
            1 if t.get("is_pinned") else 0,
            int(t.get("like_count") or 0),
            int(t.get("retweet_count") or 0),
            int(t.get("reply_count") or 0),
            t.get("fetched_at", ""),
        ) for t in tweets if t.get("tweet_url")]
    )
    conn.commit()

    after = cursor.execute("SELECT COUNT(*) FROM tweets").fetchone()[0]
    conn.close()

    inserted = after - before
    duplicates = len(tweets) - inserted
    logger.success(
        f"Persisted {inserted} new tweets ({duplicates} already known). Total stored: {after}."
    )
    return {"inserted": inserted, "duplicates": duplicates}


def export_tweets_for_ai(
    db_path: Path,
    output_json_path: Path,
    max_age_hours: int | None = None,
    limit: int | None = None,
):
    """
    Export tweets as structured JSON for the trading platform to consume.

    max_age_hours bounds the export to recent items so a growing database does
    not produce an ever-larger feed file. The downstream relevance scorer
    applies its own freshness decay, but there is no value in shipping
    week-old tweets to it at all.
    """
    if not db_path.exists():
        logger.warning(f"Database file not found at {db_path}. Skipping AI JSON export.")
        return []

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    query = """
        SELECT target_account, user, tweet_url, text, content_text, quoted_text,
               timestamp, is_pinned, like_count, retweet_count, reply_count, fetched_at
        FROM tweets
    """
    params: list = []

    if max_age_hours is not None:
        # SQLite compares ISO-8601 strings lexicographically, which is correct
        # ordering for UTC timestamps in this format.
        query += " WHERE timestamp >= datetime('now', ?)"
        params.append(f"-{int(max_age_hours)} hours")

    query += " ORDER BY timestamp DESC"

    if limit is not None:
        query += " LIMIT ?"
        params.append(int(limit))

    rows = cursor.execute(query, params).fetchall()
    conn.close()

    formatted_tweets = [dict(row) for row in rows]

    output_json_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_json_path, "w", encoding="utf-8") as f:
        json.dump(formatted_tweets, f, ensure_ascii=False, indent=2)

    logger.success(
        f"Exported {len(formatted_tweets)} tweets for AI models at: {output_json_path}"
    )
    return formatted_tweets
