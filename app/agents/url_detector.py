from __future__ import annotations
from urllib.parse import urlparse

_PLATFORM_PATTERNS: dict[str, dict[str, list[str]]] = {
    "shopify":     {"product": ["/products/"], "category": ["/collections/"]},
    "woocommerce": {"product": ["/product/"],  "category": ["/product-category/", "/shop/"]},
    "magento":     {"product": ["/catalog/product/"], "category": ["/catalog/category/"]},
    "bigcommerce": {"product": ["/products/"], "category": ["/categories/"]},
}

_HTML_SIGNALS: dict[str, list[str]] = {
    "product": [
        "add to cart", "add-to-cart", '"@type":"Product"', '"@type": "Product"',
        'itemtype="http://schema.org/Product"', "data-product-id",
    ],
    "category": [
        "product-grid", "product-list", "collection-list",
        '"@type":"CollectionPage"', "product-card",
    ],
}


def detect_url_type(url: str, html: str | None = None) -> dict[str, str]:
    path = urlparse(url).path.lower()
    host = urlparse(url).hostname or ""

    # Detect platform
    platform = "custom"
    for p, patterns in _PLATFORM_PATTERNS.items():
        for _, pl in patterns.items():
            if any(seg in path for seg in pl):
                platform = p
                break
    if "myshopify.com" in host:
        platform = "shopify"

    # Detect type from URL
    for p, patterns in _PLATFORM_PATTERNS.items():
        if any(seg in path for seg in patterns["product"]):
            return {"url_type": "product", "platform": platform}
        if any(seg in path for seg in patterns["category"]):
            return {"url_type": "category", "platform": platform}

    # Path depth heuristic
    parts = [p for p in path.strip("/").split("/") if p]
    if len(parts) == 0:
        return {"url_type": "homepage", "platform": platform}
    if len(parts) == 1 and parts[0] in ("shop", "store", "products", "collections"):
        return {"url_type": "category", "platform": platform}

    # HTML signals fallback
    if html:
        hl = html.lower()
        prod_hits = sum(1 for s in _HTML_SIGNALS["product"] if s.lower() in hl)
        cat_hits  = sum(1 for s in _HTML_SIGNALS["category"] if s.lower() in hl)
        if prod_hits >= 2 and prod_hits > cat_hits:
            return {"url_type": "product", "platform": platform}
        if cat_hits >= 2:
            return {"url_type": "category", "platform": platform}

    # Default: treat deep paths as product pages
    if len(parts) >= 2:
        return {"url_type": "product", "platform": platform}

    return {"url_type": "homepage", "platform": platform}
