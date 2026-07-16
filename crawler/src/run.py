import asyncio

import yaml
from crawl4ai import AsyncWebCrawler

from .config import SEED_FILE
from .crawl import crawl_one
from .db import (
    fetch_current,
    finish_run,
    get_connection,
    insert_first_version,
    start_run,
    supersede_and_insert_new_version,
    touch_last_checked,
    update_in_place,
)
from .hashing import content_hash


def load_seed_urls() -> list[str]:
    if not SEED_FILE.exists():
        raise RuntimeError(f"Seed file not found: {SEED_FILE}. Copy the example and fill in real URLs.")
    with open(SEED_FILE, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    urls = data.get("urls") or []
    if not urls:
        raise RuntimeError(f"{SEED_FILE} has no urls listed.")
    return urls


async def run() -> None:
    urls = load_seed_urls()
    attempted = succeeded = changed = failed = 0

    with get_connection() as conn:
        run_id = start_run(conn)
        print(f"Crawl run {run_id} - {len(urls)} seed URL(s)")

        async with AsyncWebCrawler() as crawler:
            for url in urls:
                attempted += 1
                print(f"  Crawling {url} ...", end=" ")
                page = await crawl_one(crawler, url)

                if not page.success:
                    failed += 1
                    print(f"FAILED ({page.error})")
                    continue

                new_hash = content_hash(page.markdown)
                existing = fetch_current(conn, url)

                if existing is None:
                    insert_first_version(conn, url, page.title, page.markdown, new_hash)
                    succeeded += 1
                    changed += 1
                    print("new")
                elif existing["content_hash"] == new_hash:
                    touch_last_checked(conn, existing["id"])
                    succeeded += 1
                    print("unchanged")
                elif existing["review_status"] == "APPROVED":
                    supersede_and_insert_new_version(conn, existing["id"], url, page.title, page.markdown, new_hash)
                    succeeded += 1
                    changed += 1
                    print("changed (new version, old superseded)")
                else:
                    update_in_place(conn, existing["id"], page.title, page.markdown, new_hash)
                    succeeded += 1
                    changed += 1
                    print(f"changed (updated in place, was {existing['review_status']})")

        finish_run(conn, run_id, attempted, succeeded, changed, failed)
        print(f"Done. attempted={attempted} succeeded={succeeded} changed={changed} failed={failed}")


def main() -> None:
    asyncio.run(run())


if __name__ == "__main__":
    main()
