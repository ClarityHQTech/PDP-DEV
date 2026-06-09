import json
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

def build_pdf(json_path, out_path):
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    try:
        # The file starts with {"data": [{"id"...
        if "data" in data and isinstance(data["data"], list) and len(data["data"]) > 0:
            result_data = data["data"][0].get("result_data", {})
            all_products = result_data.get("products", [])
            site_score = result_data.get("site_score", 0)
        else:
            all_products = []
            site_score = 0
    except Exception as e:
        all_products = []
        site_score = 0

    doc = SimpleDocTemplate(out_path, pagesize=A4, rightMargin=30, leftMargin=30, topMargin=40, bottomMargin=40)
    styles = getSampleStyleSheet()
    title_style = styles['Heading1']
    h2_style = styles['Heading2']
    h3_style = styles['Heading3']
    normal_style = styles['Normal']
    
    story = []
    
    # Title
    story.append(Paragraph("Ceremony Kitchen - Deep Site Audit Report", title_style))
    story.append(Spacer(1, 12))
    
    # Summary
    story.append(Paragraph(f"<b>Overall Site Score:</b> {round(site_score, 1)} / 100", normal_style))
    story.append(Paragraph(f"<b>Total Products Analyzed:</b> {len(all_products)}", normal_style))
    story.append(Spacer(1, 20))
    
    # Top Sitewide Issues
    story.append(Paragraph("Top Critical Sitewide Issues", h2_style))
    issue_counts = {}
    for p in all_products:
        recs = p.get('seo_report', {}).get('recommendations', []) + p.get('aeo_report', {}).get('recommendations', [])
        seen = set()
        for r in recs:
            if r.get('impact', r.get('priority', '')).upper() == 'HIGH':
                title = r.get('issue', r.get('title', ''))
                if title not in seen:
                    seen.add(title)
                    if title not in issue_counts:
                        issue_counts[title] = {'count': 0, 'fix': r.get('fix', r.get('action', ''))}
                    issue_counts[title]['count'] += 1

    top_issues = sorted(issue_counts.items(), key=lambda x: x[1]['count'], reverse=True)[:5]
    for i, (title, info) in enumerate(top_issues):
        story.append(Paragraph(f"<b>{i+1}. {title}</b> (Found on {info['count']} products)", normal_style))
        story.append(Paragraph(f"<font color='green'>Fix:</font> {info['fix']}", normal_style))
        story.append(Spacer(1, 8))
    
    story.append(Spacer(1, 20))
    
    # Per Product Detail
    story.append(Paragraph("Product Detail Analysis", h2_style))
    
    for idx, p in enumerate(all_products):
        name = p.get('product_title', p.get('name', p.get('title', 'Product')))
        url = p.get('url', '')
        seo_score = p.get('seo_score', p.get('seo_report', {}).get('overall_seo_score', '?'))
        aeo_score = p.get('aeo_score', p.get('aeo_report', {}).get('ai_visibility_score', '?'))
        
        story.append(Paragraph(f"<b>{idx+1}. {name}</b>", h3_style))
        story.append(Paragraph(f"<font color='blue'>{url}</font>", normal_style))
        story.append(Paragraph(f"<b>SEO:</b> {seo_score} | <b>AEO:</b> {aeo_score}", normal_style))
        
        # High impact issues
        recs = p.get('seo_report', {}).get('recommendations', [])
        high_recs = [r for r in recs if r.get('impact', r.get('priority', '')).upper() == 'HIGH']
        if high_recs:
            story.append(Paragraph("Critical Issues:", normal_style))
            for r in high_recs[:3]:
                story.append(Paragraph(f"- <font color='red'>{r.get('issue', r.get('title', ''))}</font>", normal_style))
        
        story.append(Spacer(1, 12))

    doc.build(story)

if __name__ == "__main__":
    try:
        build_pdf('report.json', 'ceremonykitchen_auidt_report.pdf')
        print("Successfully generated ceremonykitchen_auidt_report.pdf")
    except Exception as e:
        print("Error building PDF:", e)
