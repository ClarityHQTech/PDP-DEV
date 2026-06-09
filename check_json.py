import json
with open('report.json', 'r', encoding='utf-8') as f:
    d = json.load(f)['data'][0]['result_data']
print('Keys in result_data:', list(d.keys()))
if 'categories' in d:
    cats = d['categories']
    print('Num categories:', len(cats))
if 'products' in d:
    print('Num products in result_data.products:', len(d['products']))
elif 'allProducts' in d:
    print('Num products in result_data.allProducts:', len(d['allProducts']))
elif 'site_data' in d:
    print('Num products in site_data:', len(d['site_data']))
