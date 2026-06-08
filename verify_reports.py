import asyncio
import json
import requests
from bs4 import BeautifulSoup
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.agents.site_graph import _analyze_product

urls = [
    'https://mamaearth.in/product/vitamin-c-daily-glow-sunscreen-with-vitamin-c-turmeric-for-sun-protection-glow-50-g',
    'https://ceremonykitchen.com/products/keto-gf-chocolate-cotton-cake-with-coffee-cloud',
    'https://www.boat-lifestyle.com/products/boat-rockerz-412-wireless-headphones'
]

async def main():
    reports = {}
    for url in urls:
        print(f"Analyzing {url}...")
        try:
            report = await _analyze_product(url)
            reports[url] = report
            print(f"Done {url}")
        except Exception as e:
            print(f"Error on {url}: {e}")
            reports[url] = {"error": str(e)}
            
    with open('pdp_test_reports.json', 'w', encoding='utf-8') as f:
        json.dump(reports, f, indent=2)
        
    print("\n\n==== VERIFICATION AGAINST LIVE HTML ====\n")
    
    for url in urls:
        print(f"\n--- {url} ---")
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
            }
            r = requests.get(url, headers=headers, timeout=15)
            soup = BeautifulSoup(r.text, 'html.parser')
            
            title = soup.title.string.strip() if soup.title and soup.title.string else None
            
            meta_desc = None
            meta_tag = soup.find('meta', attrs={'name': 'description'})
            if meta_tag: 
                meta_desc = meta_tag.get('content')
            
            h1s = soup.find_all('h1')
            h1_texts = [h.text.strip() for h in h1s]
            
            schemas = soup.find_all('script', type='application/ld+json')
            
            rep = reports.get(url, {})
            seo_rep = rep.get('seo_report', {})
            
            ai_title = seo_rep.get('title_tag', {}).get('value')
            ai_meta = seo_rep.get('meta_description', {}).get('value')
            ai_h1 = seo_rep.get('h1', {}).get('value')
            
            print(f"Live Title: {title}")
            print(f"AI Title:   {ai_title}")
            print(f"Live Meta:  {meta_desc}")
            print(f"AI Meta:    {ai_meta}")
            print(f"Live H1(s): {h1_texts}")
            print(f"AI H1:      {ai_h1}")
            print(f"Live Schemas count: {len(schemas)}")
            print(f"Overall SEO Score: {rep.get('seo_score', 0)}")
            print(f"Overall AEO Score: {rep.get('aeo_score', 0)}")
        except Exception as e:
            print(f"Verification fetch failed for {url}: {e}")

if __name__ == '__main__':
    asyncio.run(main())
