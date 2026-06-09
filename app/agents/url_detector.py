from __future__ import annotations
from urllib.parse import urlparse

_PLATFORM_PATTERNS: dict[str, dict[str, list[str]]] = {
    "shopify":     {"product": ["/products/"], "category": ["/collections/"]},
    "woocommerce": {"product": ["/product/"],  "category": ["/product-category/", "/shop/"]},
    "magento":     {"product": ["/catalog/product/"], "category": ["/catalog/category/"]},
    "bigcommerce": {"product": ["/products/"], "category": ["/categories/"]},
}

# Vertical-specific PDP patterns
_VERTICAL_PATTERNS: dict[str, dict[str, list[str]]] = {
    "edtech": {
        "product": ["/course", "/program", "/diploma", "/certificate",
                    "/class", "/batch", "/module", "/learn"],
        "category": ["/explore", "/subjects", "/stream", "/department",
                     "/courses", "/programs"],
    },
    "saas": {
        "product": ["/pricing", "/plans", "/plan", "/features"],
        "category": ["/solutions", "/use-cases"],
    },
    "services": {
        "product": ["/services", "/service", "/listing", "/doctors", "/professionals"],
        "category": ["/categories", "/explore", "/browse"],
    },
    "realestate": {
        "product": ["/property", "/listing", "/project", "/flat", "/apartment"],
        "category": ["/properties", "/projects", "/locality"],
    },
    "ecommerce": {
        "product": ["/products", "/product", "/p", "/item", "/pd", "/catalog/product",
                    "/buy", "/shop/product"],
        "category": ["/collections", "/category", "/categories", "/c", "/shop",
                     "/catalog/category", "/product-category"],
    },
    "jobs": {
        "product": ["/job", "/careers", "/vacancy", "/role", "/opening"],
        "category": ["/jobs", "/openings", "/roles", "/departments"],
    },
    "travel": {
        "product": ["/hotel", "/package", "/tour", "/room", "/stay"],
        "category": ["/destinations", "/hotels", "/tours", "/packages"],
    },
    "healthcare": {
        "product": ["/doctor", "/treatment", "/specialist", "/clinic", "/procedure"],
        "category": ["/specialties", "/treatments", "/doctors", "/services"],
    },
    "gaming": {
        "product": ["/game", "/play", "/title", "/app"],
        "category": ["/games", "/genres", "/store", "/browse"],
    },
    "media": {
        "product": ["/article", "/news", "/post", "/story", "/episode", "/video"],
        "category": ["/topics", "/category", "/shows", "/podcasts"],
    },
}

# Homepage HTML signals to detect site vertical
_VERTICAL_HTML_SIGNALS: dict[str, list[str]] = {
    "edtech":     ["enroll", "course", "diploma", "certificate", "learn online", "curriculum",
                   "syllabus", "batch", "lecture", "instructor", "module", "lesson"],
    "saas":       ["free trial", "pricing", "per month", "subscription", "monthly plan",
                   "upgrade", "dashboard", "api", "integration", "workflow"],
    "services":   ["book now", "get quote", "hire", "appointment", "consultation",
                   "service provider", "professional", "expert"],
    "realestate": ["sqft", "bhk", "bedroom", "property", "possession", "rera",
                   "builder", "flat", "rent", "buy flat"],
    "ecommerce":  ["add to cart", "buy now", "₹", "checkout", "shop", "free shipping",
                   "cod", "cash on delivery", "return policy", "pincode"],
    "jobs":       ["apply now", "job opening", "vacancy", "hiring", "full-time", "part-time",
                   "salary", "ctc", "lpa", "recruiter", "fresher"],
    "travel":     ["check availability", "book now", "per night", "check-in", "check-out",
                   "nights", "itinerary", "package", "resort", "hotel"],
    "healthcare": ["book appointment", "consult doctor", "specialist", "clinic", "hospital",
                   "symptoms", "diagnosis", "treatment", "mbbs", "md"],
    "gaming":     ["play now", "download game", "multiplayer", "single player", "fps", "rpg",
                   "dlc", "patch", "early access", "system requirements"],
    "media":      ["read more", "published", "author", "byline", "breaking news", "subscribe",
                   "newsletter", "podcast", "episode", "streaming"],
}

_HTML_SIGNALS: dict[str, list[str]] = {
    "product": [
        "add to cart", "add-to-cart", '\"@type\":\"Product\"', '\"@type\": \"Product\"',
        'itemtype=\"http://schema.org/Product\"', "data-product-id",
        '\"@type\":\"Course\"', "enroll now", "buy this course",
    ],
    "category": [
        "product-grid", "product-list", "collection-list",
        '\"@type\":\"CollectionPage\"', "product-card", "course-list", "course-grid",
    ],
}


def detect_site_vertical(html: str) -> str:
    """Detect site vertical from homepage HTML. Returns one of: ecommerce, edtech, saas, services, realestate, unknown"""
    text = html.lower()
    scores = {v: sum(1 for s in signals if s in text)
              for v, signals in _VERTICAL_HTML_SIGNALS.items()}
    best = max(scores, key=scores.get)
    if scores[best] >= 2:
        return best
    return "unknown"


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

    # Homepage check
    parts = [p for p in path.strip("/").split("/") if p]
    if len(parts) == 0:
        return {"url_type": "homepage", "platform": platform, "vertical": "unknown"}

    # Check ALL verticals for product/category match
    path_parts = path.strip("/").split("/")
    for vertical, patterns in _VERTICAL_PATTERNS.items():
        if any(
            any(part == seg.strip("/") or part.startswith(seg.strip("/") + "-")
                for part in path_parts)
            for seg in patterns["product"]
        ):
            return {"url_type": "product", "platform": platform, "vertical": vertical}
        if any(
            any(part == seg.strip("/") or part.startswith(seg.strip("/") + "-")
                for part in path_parts)
            for seg in patterns["category"]
        ):
            return {"url_type": "category", "platform": platform, "vertical": vertical}

    # HTML signals fallback
    if html:
        hl = html.lower()
        prod_hits = sum(1 for s in _HTML_SIGNALS["product"] if s.lower() in hl)
        cat_hits  = sum(1 for s in _HTML_SIGNALS["category"] if s.lower() in hl)
        
        # Also detect vertical from page HTML
        vertical = detect_site_vertical(html)
        
        if prod_hits >= 2 and prod_hits > cat_hits:
            return {"url_type": "product", "platform": platform, "vertical": vertical}
        if cat_hits >= 2:
            return {"url_type": "category", "platform": platform, "vertical": vertical}

    if len(parts) >= 2:
        return {"url_type": "product", "platform": platform, "vertical": "unknown"}

    return {"url_type": "homepage", "platform": platform, "vertical": "unknown"}
