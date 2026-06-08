import json
import re

file_path = r'C:\Users\hp\.gemini\antigravity-ide\brain\df353591-cff5-45a9-8948-04a3a9376388\.system_generated\steps\913\content.md'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

def search_text(query):
    matches = re.finditer(query, content, re.IGNORECASE)
    results = [m.group(0) for m in matches]
    print(f"Search '{query}': {len(results)} matches")
    if results:
        print(f"  First match: {results[0]}")

search_text('CART')
search_text('ELEVATE')
search_text("MEN'S FASHION")
search_text('sold out')
search_text('unavailable')
search_text('soft, breathable fabric')
search_text('cotton')
search_text('schema.org')
search_text('application/ld\\+json')
