from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Optional

import psycopg

from .config import DATABASE_URL


@contextmanager
def get_connection():
    conn = psycopg.connect(DATABASE_URL)
    try:
        yield conn
    finally:
        conn.close()


def start_run(conn: psycopg.Connection) -> str:
    with conn.cursor() as cur:
        cur.execute(
            'INSERT INTO crawl_runs (started_at) VALUES (%s) RETURNING id',
            (datetime.now(timezone.utc),),
        )
        run_id = cur.fetchone()[0]
    conn.commit()
    return run_id


def finish_run(conn: psycopg.Connection, run_id: str, attempted: int, succeeded: int, changed: int, failed: int) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE crawl_runs
            SET finished_at = %s, attempted = %s, succeeded = %s, changed = %s, failed = %s
            WHERE id = %s
            """,
            (datetime.now(timezone.utc), attempted, succeeded, changed, failed, run_id),
        )
    conn.commit()


def fetch_current(conn: psycopg.Connection, url: str) -> Optional[dict]:
    """The one non-SUPERSEDED row for this url, if any - see the schema
    comment on KnowledgeSource for why url isn't a hard unique constraint."""
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, content_hash, review_status
            FROM knowledge_sources
            WHERE url = %s AND review_status != 'SUPERSEDED'
            ORDER BY crawled_at DESC
            LIMIT 1
            """,
            (url,),
        )
        row = cur.fetchone()
    if not row:
        return None
    return {"id": row[0], "content_hash": row[1], "review_status": row[2]}


def touch_last_checked(conn: psycopg.Connection, source_id: str) -> None:
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE knowledge_sources SET last_checked_at = %s WHERE id = %s",
            (datetime.now(timezone.utc), source_id),
        )
    conn.commit()


def insert_first_version(conn: psycopg.Connection, url: str, title: Optional[str], markdown: str, content_hash: str) -> str:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO knowledge_sources (url, title, raw_markdown, content_hash, review_status)
            VALUES (%s, %s, %s, %s, 'PENDING')
            RETURNING id
            """,
            (url, title, markdown, content_hash),
        )
        new_id = cur.fetchone()[0]
    conn.commit()
    return new_id


def update_in_place(conn: psycopg.Connection, source_id: str, title: Optional[str], markdown: str, content_hash: str) -> None:
    """Content changed but the current row isn't APPROVED yet (nothing public
    depends on it) - safe to overwrite rather than fork a new version."""
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE knowledge_sources
            SET title = %s, raw_markdown = %s, content_hash = %s, last_checked_at = %s
            WHERE id = %s
            """,
            (title, markdown, content_hash, datetime.now(timezone.utc), source_id),
        )
    conn.commit()


def supersede_and_insert_new_version(
    conn: psycopg.Connection, old_id: str, url: str, title: Optional[str], markdown: str, content_hash: str
) -> str:
    """Content changed on an already-APPROVED row. The old row is left
    byte-for-byte as-is (any CuratedContent citing it stays accurate) and
    marked SUPERSEDED; the new crawl becomes a fresh PENDING row awaiting
    review."""
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO knowledge_sources (url, title, raw_markdown, content_hash, review_status, previous_version_id)
            VALUES (%s, %s, %s, %s, 'PENDING', %s)
            RETURNING id
            """,
            (url, title, markdown, content_hash, old_id),
        )
        new_id = cur.fetchone()[0]
        cur.execute(
            "UPDATE knowledge_sources SET review_status = 'SUPERSEDED' WHERE id = %s",
            (old_id,),
        )
    conn.commit()
    return new_id
