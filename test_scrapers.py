import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.agents.scraper_agent import scrape_page

URLS_TO_TEST = [
    # 1. Normal Site
    "https://mamaearth.in/product/vitamin-c-daily-glow-sunscreen-with-vitamin-c-turmeric-for-sun-protection-glow-50-g",
    # 2. Normal Site
    "https://ceremonykitchen.com/",
    # 3. Known for Cloudflare / Anti-bot
    "https://www.nike.com/in/t/air-force-1-07-shoes-GjGXSP/CW2288-111",
    # 4. Known for Datadome / Strict Anti-bot
    "https://www.zara.com/in/en/man-new-in-l711.html",
    # 5. Often geo-blocked or heavily protected
    "https://www.bestbuy.com/",
    # 6. Retailer with bot protection
    "https://www.walmart.com/ip/Apple-AirPods-with-Charging-Case-2nd-Generation/604342441"
]

async def run_tests():
    print("Starting Scraper Tests (No AI, Cost: $0)...\n")
    for i, url in enumerate(URLS_TO_TEST):
        print(f"[{i+1}/{len(URLS_TO_TEST)}] Testing: {url}")
        try:
            result = await scrape_page(url)
            ok = result.get("scrape_ok", False)
            method = result.get("method", "none")
            markdown = result.get("markdown", "")
            chars = len(markdown)
            print(f"   => Success: {ok}")
            print(f"   => Layer Used: {method.upper()}")
            print(f"   => Content Extracted: {chars} characters")
            if ok and chars > 0:
                print(f"   => Preview: {markdown[:100].replace(chr(10), ' ')}...")
            else:
                print("   => Preview: NONE")
        except Exception as e:
            print(f"   => Exception: {e}")
        print("-" * 50)

if __name__ == "__main__":
    asyncio.run(run_tests())
