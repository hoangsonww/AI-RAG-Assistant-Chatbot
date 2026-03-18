"""
Web retrieval tools — fetch URLs, extract content, search the web.
"""

from __future__ import annotations

import re
from typing import Any, Dict
from html.parser import HTMLParser

import mcp.types as types

from .base import ToolHandler
from ..utils.logger import get_logger

_logger = get_logger("tools.web")

_DEFAULT_TIMEOUT = 30


class _TextExtractor(HTMLParser):
    """Minimal HTML-to-text extractor."""

    def __init__(self) -> None:
        super().__init__()
        self._text: list[str] = []
        self._skip = False

    def handle_starttag(self, tag: str, _: Any) -> None:
        if tag in ("script", "style", "noscript"):
            self._skip = True

    def handle_endtag(self, tag: str) -> None:
        if tag in ("script", "style", "noscript"):
            self._skip = False

    def handle_data(self, data: str) -> None:
        if not self._skip:
            text = data.strip()
            if text:
                self._text.append(text)

    def get_text(self) -> str:
        return "\n".join(self._text)


class FetchUrlTool(ToolHandler):
    def __init__(self) -> None:
        super().__init__(
            types.Tool(
                name="fetch_url",
                description=(
                    "Fetch a URL and return its content. Supports HTML (auto-extracts text), "
                    "JSON, and plain text. Respects timeouts."
                ),
                inputSchema={
                    "type": "object",
                    "properties": {
                        "url": {"type": "string", "description": "URL to fetch"},
                        "raw": {
                            "type": "boolean",
                            "description": "Return raw HTML instead of extracted text (default false)",
                            "default": False,
                        },
                        "max_length": {
                            "type": "integer",
                            "description": "Max characters to return (default 10000)",
                            "default": 10000,
                        },
                        "timeout": {
                            "type": "integer",
                            "description": "Request timeout in seconds (default 30)",
                            "default": 30,
                        },
                    },
                    "required": ["url"],
                },
            )
        )

    async def execute(self, arguments: Dict[str, Any]) -> Any:
        import urllib.request
        import urllib.error

        url = arguments["url"]
        raw = arguments.get("raw", False)
        max_len = arguments.get("max_length", 10000)
        timeout = arguments.get("timeout", _DEFAULT_TIMEOUT)

        _logger.info("Fetching URL: %s", url[:200])
        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "LuminaMCPServer/1.0"},
            )
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                content_type = resp.headers.get("Content-Type", "")
                body = resp.read().decode("utf-8", errors="replace")

            if not raw and "html" in content_type.lower():
                extractor = _TextExtractor()
                extractor.feed(body)
                body = extractor.get_text()

            return {
                "success": True,
                "url": url,
                "content_type": content_type,
                "content": body[:max_len],
                "length": len(body),
                "truncated": len(body) > max_len,
            }
        except urllib.error.URLError as exc:
            return {"success": False, "url": url, "error": str(exc)}
        except Exception as exc:
            return {"success": False, "url": url, "error": str(exc)}


class ExtractContentTool(ToolHandler):
    def __init__(self) -> None:
        super().__init__(
            types.Tool(
                name="extract_content",
                description=(
                    "Extract structured content from raw HTML: title, headings, "
                    "links, paragraphs, and metadata."
                ),
                inputSchema={
                    "type": "object",
                    "properties": {
                        "html": {
                            "type": "string",
                            "description": "Raw HTML string to parse",
                        },
                        "url": {
                            "type": "string",
                            "description": "URL to fetch HTML from (alternative to providing html directly)",
                        },
                    },
                },
            )
        )

    async def execute(self, arguments: Dict[str, Any]) -> Any:
        html = arguments.get("html", "")
        url = arguments.get("url")

        if url and not html:
            import urllib.request

            try:
                req = urllib.request.Request(url, headers={"User-Agent": "LuminaMCPServer/1.0"})
                with urllib.request.urlopen(req, timeout=_DEFAULT_TIMEOUT) as resp:
                    html = resp.read().decode("utf-8", errors="replace")
            except Exception as exc:
                return {"success": False, "error": str(exc)}

        if not html:
            return {"success": False, "error": "Provide 'html' or 'url'"}

        title_match = re.search(r"<title[^>]*>(.*?)</title>", html, re.IGNORECASE | re.DOTALL)
        title = title_match.group(1).strip() if title_match else None

        headings = re.findall(r"<h[1-6][^>]*>(.*?)</h[1-6]>", html, re.IGNORECASE | re.DOTALL)
        headings = [re.sub(r"<[^>]+>", "", h).strip() for h in headings][:20]

        links = re.findall(r'<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>', html, re.IGNORECASE | re.DOTALL)
        links = [{"href": href, "text": re.sub(r"<[^>]+>", "", text).strip()} for href, text in links][:30]

        extractor = _TextExtractor()
        extractor.feed(html)
        text = extractor.get_text()

        return {
            "success": True,
            "title": title,
            "headings": headings,
            "links": links,
            "text_preview": text[:3000],
            "text_length": len(text),
        }


def register(cfg: Any) -> Dict[str, ToolHandler]:
    return {h.name: h for h in [FetchUrlTool(), ExtractContentTool()]}
