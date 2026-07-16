import os
from pathlib import Path

from dotenv import load_dotenv

CRAWLER_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(CRAWLER_ROOT / ".env")

DATABASE_URL = os.environ.get("DATABASE_URL")
SEED_FILE = CRAWLER_ROOT / "seeds" / "seed_urls.yaml"

if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is not set. Copy crawler/.env.example to crawler/.env "
        "and fill in the same database the Next.js app uses."
    )
