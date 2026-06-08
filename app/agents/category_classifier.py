"""
Category Classifier — detects product category from page content.
Maps to: fashion, electronics, beauty, furniture, supplements, food, sports, jewellery, pets, generic
"""
from __future__ import annotations
from app.agents.gemini_client import llm_call
from app.agents.json_utils import safe_json_parse
from app.core.logging import get_logger

logger = get_logger(__name__)

CATEGORIES = ["fashion", "electronics", "beauty", "furniture", "supplements", "food", "sports", "jewellery", "pets", "generic"]

# Keyword-based fast classification (no LLM needed for obvious cases)
_KEYWORD_MAP = {
    "fashion":     ["size guide","fabric","material","fit","clothing","apparel","dress","shirt","jeans","kurta","saree","ethnic","lehenga","blazer","tshirt","t-shirt","shoes","footwear","sneakers","boots","sandals"],
    "electronics": ["processor","battery","ram","storage","display","camera","connectivity","bluetooth","wifi","usb","hdmi","watt","voltage","earphones","headphones","speaker","laptop","smartphone","tablet","tv","refrigerator","washing machine"],
    "beauty":      ["ingredients","skin type","spf","serum","moisturizer","cleanser","toner","shampoo","conditioner","lipstick","foundation","skincare","haircare","cruelty free","non-comedogenic","paraben","dermatologist","inci"],
    "furniture":   ["dimensions","assembly","weight capacity","room","sofa","chair","table","bed","wardrobe","cabinet","shelf","cm x","inches","kg capacity","delivery","install"],
    "supplements": ["supplement facts","serving size","capsule","gummy","powder","mg per","vitamin","protein","collagen","omega","probiotic","fda","gmp","nsf","usda organic","third-party tested"],
    "food":        ["calories","nutrition","ingredients","allergen","gluten","vegan","organic","recipe","flavour","flavor","net weight","g per serving","per 100g","best before","shelf life","sugar","sodium"],
    "sports":      ["weight","resistance","reps","cardio","running","cycling","yoga","gym","workout","performance","waterproof","breathable","grip","traction","cleats","racket","bat","ball"],
    "jewellery":   ["carat","karat","gold","silver","diamond","gemstone","ring size","chain length","925","18k","14k","hallmark","certified","lab-grown","conflict-free"],
    "pets":        ["breed","puppy","kitten","adult dog","adult cat","senior","aafco","kcal","crude protein","crude fat","crude fiber","vet","veterinary","pet food","treats","collar","leash"],
}

def _fast_classify(text: str) -> str | None:
    """Return category if keyword hits are decisive, else None."""
    tl = text.lower()
    scores = {cat: sum(1 for kw in kws if kw in tl) for cat, kws in _KEYWORD_MAP.items()}
    best = max(scores, key=scores.get)
    second = sorted(scores.values(), reverse=True)[1]
    if scores[best] >= 3 and scores[best] > second * 1.5:
        return best
    return None

_SYS = """Classify the ecommerce product page into ONE category. Return ONLY valid JSON, no prose.
Categories: fashion, electronics, beauty, furniture, supplements, food, sports, jewellery, pets, generic
JSON: {"category": string, "sub_category": string, "confidence": float, "signals": [string]}"""

async def classify_category(dom: dict, markdown: str) -> dict:
    """Returns {category, sub_category, confidence, signals}"""
    # Fast path
    text = markdown[:3000] + " " + str(dom.get("title_tag","")) + " " + " ".join(dom.get("h1_values",[]))
    fast = _fast_classify(text)
    if fast:
        logger.info(f"classifier.fast category={fast}")
        return {"category": fast, "sub_category": "", "confidence": 0.85, "signals": [], "method": "keyword"}

    # LLM path
    user = f"URL: {dom.get('url','')}\nTitle: {dom.get('title_tag','')}\nH1: {dom.get('h1_values',[''])[0]}\nContent:\n{markdown[:2000]}"
    try:
        raw = await llm_call(_SYS, user, max_tokens=200)
        result, err = safe_json_parse(raw, "classifier")
        if not err and result.get("category") in CATEGORIES:
            logger.info(f"classifier.llm category={result['category']}")
            return {**result, "method": "llm"}
    except Exception as e:
        logger.warning(f"classifier.error error={e}")

    return {"category": "generic", "sub_category": "", "confidence": 0.5, "signals": [], "method": "fallback"}
