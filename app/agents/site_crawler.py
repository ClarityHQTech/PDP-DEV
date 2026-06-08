"""
app/agents/site_crawler.py
Discovers categories and product URLs from an e-commerce homepage.
Strategy: sitemap.xml → BFS from homepage
"""
from __future__ import annotations
import asyncio
import xml.etree.ElementTree as ET
from urllib.parse import urljoin, urlparse
from typing import Any
import httpx
from bs4 import BeautifulSoup
from app.core.logging import get_logger

logger = get_logger(__name__)

MAX_CATEGORIES = 10
MAX_PRODUCTS_PER_CAT = 15
MAX_TOTAL_PRODUCTS = 60
RATE_LIMIT = 0.8
TIMEOUT = 12.0
_UA = "Mozilla/5.0 (compatible; PDPCrawler/1.0)"

# URL segment hints for product/category detection
_PRODUCT_HINTS = ["/products/", "/product/", "/p/", "/item/", "/pd/", "/catalog/product/"]
_CATEGORY_HINTS = ["/collections/", "/category/", "/categories/", "/c/", "/shop/",
                   "/catalog/category/", "/product-category/"]
_SKIP_PATHS = {"/cart", "/checkout", "/account", "/login", "/signup", "/search",
               "/wishlist", "/admin", "/cdn-cgi", "/_next/", "/blog/"}
_SKIP_EXTS = {".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp", ".css", ".js",
              ".pdf", ".ico", ".mp4", ".zip", ".woff"}


def _is_junk(path: str) -> bool:
    lower = path.lower()
    return (
        any(lower.endswith(e) for e in _SKIP_EXTS) or
        any(s in lower for s in _SKIP_PATHS)
    )


def _same_domain(base: str, link: str) -> bool:
    base_host = urlparse(base).hostname or ""
    link_host = urlparse(link).hostname or ""
    return link_host == "" or link_host == base_host or link_host.endswith(f".{base_host}")


def _is_product_url(path: str) -> bool:
    return any(h in path for h in _PRODUCT_HINTS)


def _is_category_url(path: str) -> bool:
    return any(h in path for h in _CATEGORY_HINTS)


async def _fetch(url: str, client: httpx.AsyncClient) -> str:
    await asyncio.sleep(RATE_LIMIT)
    try:
        resp = await client.get(url, headers={"User-Agent": _UA}, timeout=TIMEOUT, follow_redirects=True)
        if resp.status_code == 200:
            return resp.text
    except Exception as e:
        logger.warning(f"crawler.fetch_fail url={url} error={e}")
    return ""


async def _parse_sitemap(base_url: str, client: httpx.AsyncClient) -> dict[str, list[str]]:
    """Try to extract category + product URLs from sitemap.xml."""
    results: dict[str, list[str]] = {"products": [], "categories": []}
    sitemap_url = urljoin(base_url, "/sitemap.xml")
    xml_text = await _fetch(sitemap_url, client)
    if not xml_text:
        return results
    try:
        root = ET.fromstring(xml_text)
        ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
        # Handle sitemap index
        for loc in root.findall(".//sm:loc", ns):
            url = loc.text or ""
            path = urlparse(url).path.lower()
            if _is_junk(path):
                continue
            if _is_product_url(path):
                if len(results["products"]) < MAX_TOTAL_PRODUCTS:
                    results["products"].append(url)
            elif _is_category_url(path):
                if len(results["categories"]) < MAX_CATEGORIES:
                    results["categories"].append(url)
    except Exception as e:
        logger.warning(f"crawler.sitemap_parse_fail error={e}")
    return results


async def _bfs_crawl(homepage_url: str, client: httpx.AsyncClient) -> dict[str, list[str]]:
    """BFS from homepage to find category + product URLs."""
    results: dict[str, list[str]] = {"products": [], "categories": []}
    visited: set[str] = set()
    queue = [homepage_url]
    depth = 0
    max_depth = 2

    while queue and depth <= max_depth:
        next_queue = []
        for url in queue[:20]:  # limit per level
            if url in visited:
                continue
            visited.add(url)
            html = await _fetch(url, client)
            if not html:
                continue
            soup = BeautifulSoup(html, "html.parser")
            for a in soup.find_all("a", href=True):
                href = a["href"].strip()
                if not href or href.startswith("#") or href.startswith("javascript"):
                    continue
                abs_url = urljoin(url, href)
                path = urlparse(abs_url).path.lower()
                if not _same_domain(homepage_url, abs_url) or _is_junk(path):
                    continue
                abs_clean = f"{urlparse(abs_url).scheme}://{urlparse(abs_url).netloc}{urlparse(abs_url).path}".rstrip("/")
                if abs_clean in visited:
                    continue
                if _is_product_url(path) and len(results["products"]) < MAX_TOTAL_PRODUCTS:
                    results["products"].append(abs_clean)
                    visited.add(abs_clean)
                elif _is_category_url(path) and len(results["categories"]) < MAX_CATEGORIES:
                    results["categories"].append(abs_clean)
                    next_queue.append(abs_clean)
        queue = next_queue
        depth += 1

    return results


async def _get_products_from_category(cat_url: str, client: httpx.AsyncClient) -> list[str]:
    """Extract product URLs from a category page."""
    html = await _fetch(cat_url, client)
    if not html:
        return []
    soup = BeautifulSoup(html, "html.parser")
    products = []
    seen = set()
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        abs_url = urljoin(cat_url, href)
        path = urlparse(abs_url).path.lower()
        clean = f"{urlparse(abs_url).scheme}://{urlparse(abs_url).netloc}{path}".rstrip("/")
        if clean in seen or _is_junk(path):
            continue
        if _is_product_url(path):
            seen.add(clean)
            products.append(clean)
            if len(products) >= MAX_PRODUCTS_PER_CAT:
                break
    return products


def _extract_category_name(url: str) -> str:
    """Extract a human-readable category name from URL."""
    path = urlparse(url).path
    parts = [p for p in path.strip("/").split("/") if p]
    if parts:
        name = parts[-1].replace("-", " ").replace("_", " ").title()
        return name
    return "Category"


async def crawl_site(homepage_url: str) -> dict[str, Any]:
    """
    Crawl an e-commerce site and return structured category + product data.
    Returns:
        {
            "homepage_url": str,
            "domain": str,
            "categories": [
                {"name": str, "url": str, "products": [str], "product_count": int}
            ],
            "total_products": int,
            "crawl_method": str
        }
    """
    domain = urlparse(homepage_url).hostname or homepage_url

    async with httpx.AsyncClient(timeout=TIMEOUT, follow_redirects=True) as client:
        # Try sitemap first
        sitemap_data = await _parse_sitemap(homepage_url, client)

        if sitemap_data["categories"]:
            # Build categories from sitemap
            categories = []
            for cat_url in sitemap_data["categories"][:MAX_CATEGORIES]:
                name = _extract_category_name(cat_url)
                if name.lower() in ["all", "all products", "products", "collection", "collections"]:
                    continue
                prods = [p for p in sitemap_data["products"] if cat_url.split("/")[-1] in p]
                if not prods:
                    prods = await _get_products_from_category(cat_url, client)
                categories.append({
                    "name": _extract_category_name(cat_url),
                    "url": cat_url,
                    "products": prods[:MAX_PRODUCTS_PER_CAT],
                    "product_count": len(prods[:MAX_PRODUCTS_PER_CAT]),
                })
            total = sum(c["product_count"] for c in categories)
            return {
                "homepage_url": homepage_url,
                "domain": domain,
                "categories": categories,
                "total_products": total,
                "crawl_method": "sitemap",
            }

        # Fallback: BFS crawl
        bfs_data = await _bfs_crawl(homepage_url, client)
        categories: list[dict] = []

        if bfs_data["categories"]:
            for cat_url in bfs_data["categories"][:MAX_CATEGORIES]:
                name = _extract_category_name(cat_url)
                if name.lower() in ["all", "all products", "products", "collection", "collections"]:
                    continue
                prods = await _get_products_from_category(cat_url, client)
                categories.append({
                    "name": name,
                    "url": cat_url,
                    "products": prods[:MAX_PRODUCTS_PER_CAT],
                    "product_count": len(prods[:MAX_PRODUCTS_PER_CAT]),
                })
        elif bfs_data["products"]:
            # No categories found, group all products under "All Products"
            prods = bfs_data["products"][:MAX_PRODUCTS_PER_CAT]
            categories = [{
                "name": "All Products",
                "url": homepage_url,
                "products": prods,
                "product_count": len(prods),
            }]

        total = sum(c["product_count"] for c in categories)
        return {
            "homepage_url": homepage_url,
            "domain": domain,
            "categories": categories,
            "total_products": total,
            "crawl_method": "bfs",
        }
