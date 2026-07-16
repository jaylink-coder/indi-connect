from dataclasses import dataclass
from typing import Optional

from crawl4ai import AsyncWebCrawler
from tenacity import retry, stop_after_attempt, wait_exponential


@dataclass
class PageResult:
    success: bool
    title: Optional[str] = None
    markdown: Optional[str] = None
    error: Optional[str] = None


def _extract_markdown(result) -> str:
    """crawl4ai has changed result.markdown's shape across versions (plain
    string vs. a MarkdownGenerationResult object) - handle both rather than
    pin to one and break on the next patch release."""
    markdown = result.markdown
    if markdown is None:
        return ""
    raw = getattr(markdown, "raw_markdown", None)
    if raw is not None:
        return raw
    return str(markdown)


def _extract_title(result) -> Optional[str]:
    metadata = getattr(result, "metadata", None) or {}
    title = metadata.get("title")
    return title.strip() if title else None


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=15))
async def crawl_one(crawler: AsyncWebCrawler, url: str) -> PageResult:
    result = await crawler.arun(url=url)

    if not result.success:
        return PageResult(success=False, error=result.error_message or "Unknown crawl failure")

    markdown = _extract_markdown(result).strip()
    if not markdown:
        return PageResult(success=False, error="Crawled page produced no markdown content")

    return PageResult(success=True, title=_extract_title(result), markdown=markdown)
