import asyncio
import json
import logging
from app.agents.site_graph import _analyze_product

logging.getLogger().setLevel(logging.ERROR)

async def main():
    try:
        res = await _analyze_product("https://ceremonykitchen.com/products/sourdough-crackers")
        with open("test_output_clean.json", "w", encoding="utf-8") as f:
            json.dump(res, f, indent=2)
        print("SUCCESS")
    except Exception as e:
        print(f"FAILED: {e}")

if __name__ == "__main__":
    asyncio.run(main())
