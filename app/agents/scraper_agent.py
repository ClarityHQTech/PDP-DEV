from __future__ import annotations
import re
import json
import time
from typing import Any
import httpx
from bs4 import BeautifulSoup
from html import unescape
from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)
_settings = get_settings()

_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
_MIN_CHARS = 200
_JINA_THIN_THRESHOLD = 3000
_MAX_CONTENT_CHARS = 80_000
_TIMEOUT = 25.0

_FIRECRAWL_BASE = "https://api.firecrawl.dev/v1/scrape"

BLOCK_TITLE_RE = re.compile(
    r"(site maintenance|access denied|captcha|blocked|forbidden|just a moment|verify you are human)",
    re.I,
)

def _is_blocked(html: str) -> bool:
    if not html:
        return False
        
    # Quick text checks for Cloudflare / bot protection signatures
    html_lower = html.lower()
    if "verify you are human" in html_lower or "just a moment..." in html_lower or "is blocked" in html_lower or "cloudflare" in html_lower and "captcha" in html_lower:
        return True
        
    try:
        soup = BeautifulSoup(html, "html.parser")
        title_tag = soup.find("title")
        title = title_tag.get_text(strip=True) if title_tag else ""
        if BLOCK_TITLE_RE.search(title):
            return True
            
        for h1 in soup.find_all("h1"):
            h1_text = h1.get_text(strip=True).lower()
            if "blocked" in h1_text or "verify you are human" in h1_text:
                return True
    except Exception:
        pass
        
    return False


def _html_to_text(html: str) -> str:
    """Strip tags/scripts and normalize whitespace."""
    if not html:
        return ""
    html_cleaned = re.sub(r"<script[^>]*>[\s\S]*?</script>", " ", html, flags=re.I)
    html_cleaned = re.sub(r"<style[^>]*>[\s\S]*?</style>", " ", html_cleaned, flags=re.I)
    html_cleaned = re.sub(r"<noscript[^>]*>[\s\S]*?</noscript>", " ", html_cleaned, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", html_cleaned)
    text = unescape(text)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:_MAX_CONTENT_CHARS]


async def _fetch_with_firecrawl(url: str) -> tuple[str, str]:
    """Firecrawl — full JS rendering, anti-bot bypass."""
    async with httpx.AsyncClient(timeout=35.0) as client:
        resp = await client.post(
            _FIRECRAWL_BASE,
            headers={"Authorization": f"Bearer {_settings.firecrawl_api_key}"},
            json={"url": url, "formats": ["markdown", "html"], "onlyMainContent": False},
        )
        resp.raise_for_status()
        data = (resp.json().get("data") or {})
        markdown = data.get("markdown", "")
        html = data.get("html", "")
        return markdown, html


async def _fetch_with_zyte(url: str) -> tuple[str, str]:
    """Zyte API — Cloudflare Enterprise bypass, residential proxies."""
    async with httpx.AsyncClient(timeout=40.0) as client:
        resp = await client.post(
            "https://api.zyte.com/v1/extract",
            auth=(_settings.zyte_api_key, ""),
            json={"url": url, "browserHtml": True, "product": True},
        )
        resp.raise_for_status()
        data = resp.json()
        html = data.get("browserHtml", "") or ""
        text = _html_to_text(html) if html else ""
        return text, html


async def _fetch_with_scrapingbee(url: str) -> tuple[str, str]:
    """ScrapingBee — JS rendering + residential proxies."""
    async with httpx.AsyncClient(timeout=35.0) as client:
        resp = await client.get(
            "https://app.scrapingbee.com/api/v1",
            params={
                "api_key": _settings.scrapingbee_api_key,
                "url": url,
                "render_js": "true",
                "premium_proxy": "true",
                "country_code": "in",
                "block_ads": "true",
            },
        )
        resp.raise_for_status()
        html = resp.text
        return _html_to_text(html), html


async def _fetch_with_jina(url: str) -> tuple[str, str]:
    """Jina Reader API - great for clean Markdown conversion."""
    headers = {"Accept": "text/markdown", "User-Agent": _UA}
    if _settings.jina_api_key:
        headers["Authorization"] = f"Bearer {_settings.jina_api_key}"
        
    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        resp = await client.get(f"https://r.jina.ai/{url}", headers=headers)
        resp.raise_for_status()
        return resp.text.strip(), ""


async def _fetch_with_httpx(url: str) -> tuple[str, str]:
    """Direct fetch fallback."""
    async with httpx.AsyncClient(timeout=_TIMEOUT, follow_redirects=True) as client:
        resp = await client.get(url, headers={"User-Agent": _UA})
        resp.raise_for_status()
        html = resp.text
        return _html_to_text(html), html


import random

_WEBSHARE_PROXIES = [
    "38.154.203.95:5863",
    "198.105.121.200:6462",
    "64.137.96.74:6641",
    "209.127.138.10:5784",
    "38.154.185.97:6370",
    "84.247.60.125:6095",
    "142.111.67.146:5611",
    "191.96.254.138:6185",
    "31.58.9.4:6077",
    "104.239.107.47:5699",
]

async def _fetch_with_webshare(url: str) -> tuple[str, str]:
    proxy_user = getattr(_settings, "webshare_proxy_user", "")
    proxy_pass = getattr(_settings, "webshare_proxy_pass", "")
    proxy_url = f"http://{proxy_user}:{proxy_pass}@{random.choice(_WEBSHARE_PROXIES)}"
    async with httpx.AsyncClient(
        timeout=25.0, follow_redirects=True, proxy=proxy_url,
        headers={"User-Agent": _UA, "Accept": "text/html,application/xhtml+xml", "Accept-Language": "en-IN,en;q=0.9"},
    ) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        html = resp.text
        return _html_to_text(html), html


def _extract_dom_features(html: str, url: str) -> dict[str, Any]:
    """Extract SEO-relevant DOM features from raw HTML."""
    if not html:
        return {}
    soup = BeautifulSoup(html, "html.parser")
    head = soup.find("head") or soup

    def meta(name: str = "", prop: str = "") -> str | None:
        if name:
            tag = head.find("meta", attrs={"name": name})
            return tag.get("content", "").strip() if tag else None
        if prop:
            tag = head.find("meta", attrs={"property": prop})
            return tag.get("content", "").strip() if tag else None
        return None

    # Title
    title_tag = head.find("title")
    title = title_tag.get_text(strip=True) if title_tag else None

    # Meta description
    meta_desc = meta(name="description")

    # H1
    h1_tags = soup.find_all("h1")
    h1_values = [t.get_text(strip=True) for t in h1_tags]

    # Headings
    headings = {}
    for level in range(1, 7):
        tags = soup.find_all(f"h{level}")
        headings[f"h{level}"] = [t.get_text(strip=True) for t in tags]

    # Canonical
    canonical_tag = head.find("link", rel="canonical")
    canonical = canonical_tag.get("href", "") if canonical_tag else None

    # Open Graph
    og = {
        "title": meta(prop="og:title"),
        "description": meta(prop="og:description"),
        "image": meta(prop="og:image"),
        "type": meta(prop="og:type"),
    }

    # Twitter Card
    twitter = {
        "card": meta(name="twitter:card"),
        "title": meta(name="twitter:title"),
    }

    # Robots
    robots = meta(name="robots") or ""

    # Schema.org JSON-LD
    schemas = []
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "")
            if isinstance(data, dict):
                schemas.append(data)
            elif isinstance(data, list):
                schemas.extend(data)
        except Exception:
            pass

    # Images
    images = soup.find_all("img")
    img_stats = {
        "total": len(images),
        "missing_alt": sum(1 for img in images if not img.get("alt", "").strip()),
        "lazy_loading": sum(1 for img in images if img.get("loading") == "lazy"),
        "webp_count": sum(1 for img in images if ".webp" in (img.get("src", "") or "")),
    }

    # Links
    all_links = soup.find_all("a", href=True)
    from urllib.parse import urlparse
    base_host = urlparse(url).hostname or ""
    internal_links = [l for l in all_links if base_host in (urlparse(l["href"]).hostname or base_host)]
    external_links = [l for l in all_links if urlparse(l["href"]).hostname and base_host not in urlparse(l["href"]).hostname]

    # Breadcrumbs
    breadcrumb_nav = bool(
        soup.find(attrs={"class": re.compile(r"breadcrumb", re.I)}) or
        soup.find("nav", attrs={"aria-label": re.compile(r"breadcrumb", re.I)})
    )

    # SSL from URL
    ssl_https = url.startswith("https://")

    # Mobile viewport
    vp_tag = head.find("meta", attrs={"name": "viewport"})
    mobile_viewport = bool(vp_tag)

    # Word count in body text
    body_text = soup.get_text(separator=" ", strip=True)
    word_count = len(body_text.split())

    return {
        "title_tag": title,
        "meta_description": meta_desc,
        "h1_values": h1_values,
        "h1_count": len(h1_values),
        "headings": headings,
        "canonical": canonical,
        "open_graph": og,
        "twitter_card": twitter,
        "robots_meta": robots,
        "schemas": schemas,
        "image_stats": img_stats,
        "internal_link_count": len(internal_links),
        "external_link_count": len(external_links),
        "has_breadcrumb_nav": breadcrumb_nav,
        "ssl_https": ssl_https,
        "mobile_viewport": mobile_viewport,
        "word_count": word_count,
        "url": url,
    }


async def scrape_page(url: str) -> dict[str, Any]:
    """Scrape a URL using a tiered failover approach and return markdown + dom features."""
    logger.info(f"scraper.start url={url}")

    content = ""
    html_content = ""
    method = "none"
    errors = []

    # Fast Pre-Check with httpx (2 seconds)
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            r = await client.get(url, headers={"User-Agent": _UA}, follow_redirects=True)
            if r.status_code == 200 and len(r.text) > 3000 and not _is_blocked(r.text):
                fast_text = _html_to_text(r.text)
                if len(fast_text) > _JINA_THIN_THRESHOLD:
                    content, html_content, method = fast_text, r.text, "httpx_fast"
    except Exception:
        pass

    # Tier 1 - Firecrawl
    if not content and _settings.firecrawl_api_key:
        try:
            t, h = await _fetch_with_firecrawl(url)
            if t and len(t.strip()) >= _MIN_CHARS and not _is_blocked(h):
                content, html_content, method = t.strip(), h, "firecrawl"
            elif _is_blocked(h):
                errors.append("firecrawl: blocked")
        except Exception as e:
            errors.append(f"firecrawl: {e}")

    # Tier 2 - Zyte
    if not content and _settings.zyte_api_key:
        try:
            t, h = await _fetch_with_zyte(url)
            if t and len(t.strip()) >= _MIN_CHARS and not _is_blocked(h):
                content, html_content, method = t.strip(), h, "zyte"
            elif _is_blocked(h):
                errors.append("zyte: blocked")
        except Exception as e:
            errors.append(f"zyte: {e}")

    # Tier 2.5 - Webshare Proxy
    if not content and getattr(_settings, "webshare_proxy_pass", ""):
        try:
            t, h = await _fetch_with_webshare(url)
            if t and len(t.strip()) >= _MIN_CHARS and not _is_blocked(h):
                content, html_content, method = t.strip(), h, "webshare"
            elif _is_blocked(h):
                errors.append("webshare: blocked")
        except Exception as e:
            errors.append(f"webshare: {e}")

    # Tier 3 - ScrapingBee
    if not content and _settings.scrapingbee_api_key:
        try:
            t, h = await _fetch_with_scrapingbee(url)
            if t and len(t.strip()) >= _MIN_CHARS and not _is_blocked(h):
                content, html_content, method = t.strip(), h, "scrapingbee"
            elif _is_blocked(h):
                errors.append("scrapingbee: blocked")
        except Exception as e:
            errors.append(f"scrapingbee: {e}")

    # Tier 4 - Jina
    if not content and _settings.jina_api_key:
        try:
            t, h = await _fetch_with_jina(url)
            if t and len(t.strip()) >= _MIN_CHARS:
                # Jina doesn't return HTML, we fetch it with httpx just for DOM
                _, h2 = await _fetch_with_httpx(url)
                content, html_content, method = t.strip(), h2, "jina"
        except Exception as e:
            errors.append(f"jina: {e}")

    # Tier 5 - Fallback HTTPX
    if not content:
        try:
            t, h = await _fetch_with_httpx(url)
            if t and len(t.strip()) >= _MIN_CHARS:
                content, html_content, method = t.strip(), h, "httpx"
        except Exception as e:
            errors.append(f"httpx: {e}")

    if not content:
        logger.warning(f"scraper.failed url={url} errors={errors}")
        return {"markdown": "", "html": "", "dom": {}, "scrape_ok": False, "method": "none"}

    logger.info(f"scraper.done method={method} chars={len(content)}")
    dom = _extract_dom_features(html_content, url)
    return {
        "markdown": content, 
        "html": html_content, 
        "dom": dom, 
        "scrape_ok": True, 
        "method": method
    }
