import requests, json

print('Starting Mode A Test for ceremonykitchen.com...')
url = 'http://localhost:8000/api/v1/site/audit/stream'
headers = {'Content-Type': 'application/json'}
data = {'url': 'https://ceremonykitchen.com/'}

try:
    with requests.post(url, headers=headers, json=data, stream=True) as r:
        for line in r.iter_lines():
            if line:
                line_str = line.decode('utf-8')
                if line_str.startswith('data: ') and 'ping' not in line_str:
                    try:
                        jd = json.loads(line_str[6:])
                        if 'error' in jd:
                            print('ERROR:', jd['error'])
                        elif jd.get('seo_report', {}).get('error'):
                            print('SEO ERROR:', jd['seo_report']['error'])
                        elif jd.get('aeo_report', {}).get('error'):
                            print('AEO ERROR:', jd['aeo_report']['error'])
                        elif 'seo_score' in jd:
                            name = jd.get('name', '')
                            seo = jd.get('seo_score', '')
                            aeo = jd.get('aeo_score', '')
                            print(f'SUCCESS: {name} -> SEO: {seo} AEO: {aeo}')
                        else:
                            print(line_str[:200])
                    except Exception as parse_e:
                        print('PARSE ERR:', line_str[:200])
except Exception as e:
    print('Failed:', e)
