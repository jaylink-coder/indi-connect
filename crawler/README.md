# Indi Connect AIPCA Research Crawler

Crawls a human-curated list of AIPCA web sources into `knowledge_sources`
(same Neon database as the main app) as raw markdown for manual review.
Nothing here auto-publishes: promotion to the public site always happens by
hand, later, via a `CuratedContent` row citing the reviewed source.

## Setup

```bash
cd crawler
uv venv --python 3.12
source .venv/Scripts/activate   # Windows Git Bash; use .venv\Scripts\activate.bat on cmd
uv pip install -r requirements.txt
playwright install chromium

cp .env.example .env
# edit .env: DATABASE_URL = the same value as ../.env (Next.js app)

cp seeds/seed_urls.example.yaml seeds/seed_urls.yaml
# edit seeds/seed_urls.yaml with the real, approved source list
```

## Run

```bash
python -m src.run
```

Re-running is idempotent: unchanged pages only touch `last_checked_at`; a
changed page either updates in place (if never approved) or forks a new
`PENDING` version and marks the old one `SUPERSEDED` (if already approved) -
see the `KnowledgeSource` model comment in `prisma/schema.prisma`.

## Reviewing results

For now, review is literally reading `PENDING` rows in Prisma Studio or the
Neon console (`npx prisma studio` from the project root). No review UI yet.
