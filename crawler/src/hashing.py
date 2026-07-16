import hashlib
import re

# Some sites (observed on the AIPCA WordPress site) inconsistently emit
# internal links as http:// vs https:// between requests - same page,
# same content, different scheme. Normalizing before hashing stops that
# from registering as a "changed" page on every single crawl.
_SCHEME_RE = re.compile(r"http://")


def _normalize_for_hash(markdown: str) -> str:
    return _SCHEME_RE.sub("https://", markdown.strip())


def content_hash(markdown: str) -> str:
    """Same algorithm shape as lib/otp.ts on the Next.js side (sha256 hex) - not
    for secrecy here, just a cheap, stable fingerprint to detect real content
    changes between crawls without re-diffing full markdown text."""
    return hashlib.sha256(_normalize_for_hash(markdown).encode("utf-8")).hexdigest()
