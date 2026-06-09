/**
 * ReportDownloader.js
 * Downloads a detailed PDF report for Mode B (product) or Mode A (site audit).
 * Uses jsPDF loaded via CDN in index.html.
 */

function sanitize(str) {
  if (str === null || str === undefined) return "";
  return String(str).replace(/[^\x20-\x7E]/g, "?").trim();
}

function addHeader(doc, title, subtitle, y) {
  doc.setFillColor(30, 30, 30);
  doc.rect(0, 0, 210, 20, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Organic360 by Clarity HQ", 14, 13);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(new Date().toDateString(), 170, 13);

  doc.setTextColor(30, 30, 30);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(sanitize(title), 14, y + 10);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(sanitize(subtitle), 14, y + 18);
  return y + 28;
}

function addSection(doc, label, y, pageH) {
  if (y > pageH - 30) { doc.addPage(); y = 25; }
  doc.setFillColor(245, 240, 235);
  doc.rect(14, y, 182, 8, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text(sanitize(label), 17, y + 5.5);
  return y + 12;
}

function addText(doc, text, y, pageH, indent = 14, fontSize = 9, color = [50, 50, 50]) {
  if (y > pageH - 15) { doc.addPage(); y = 25; }
  doc.setFontSize(fontSize);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...color);
  const lines = doc.splitTextToSize(sanitize(text), 182 - (indent - 14));
  lines.forEach(line => {
    if (y > pageH - 10) { doc.addPage(); y = 25; }
    doc.text(line, indent, y);
    y += 5;
  });
  return y + 2;
}

function addScoreBadge(doc, label, score, x, y) {
  const color = score >= 70 ? [34, 139, 34] : score >= 40 ? [255, 140, 0] : [200, 30, 30];
  doc.setFillColor(...color);
  doc.roundedRect(x, y, 38, 14, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`${label}: ${score ?? "?"}`, x + 4, y + 9);
}

function addCheckItem(doc, status, text, y, pageH, indent = 17) {
  if (y > pageH - 10) { doc.addPage(); y = 25; }
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  if (status === 'pass' || status === true || status === '✓') {
    doc.setTextColor(34, 139, 34);
    doc.text("Y", indent, y); 
  } else {
    doc.setTextColor(200, 30, 30);
    doc.text("X", indent, y);
  }
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50, 50, 50);
  
  const cleanText = sanitize(text).replace(/^[✓✗\s]+/, ''); // remove any emojis passed from AI
  const lines = doc.splitTextToSize(cleanText, 182 - (indent + 4));
  lines.forEach(line => {
    if (y > pageH - 10) { doc.addPage(); y = 25; }
    doc.text(line, indent + 4, y);
    y += 5;
  });
  return y;
}

function addRecommendations(doc, recs, y, pageH) {
  if (!recs?.length) return y;
  y = addSection(doc, "[Fixes & Recommendations]", y, pageH);
  y = addText(doc, "The following issues are actively harming your product's ability to rank and drive sales.", y, pageH, 17, 9, [100, 50, 50]);
  y += 4;
  
  const grouped = { HIGH: [], MEDIUM: [], LOW: [] };
  recs.forEach(r => { const g = (r.impact || r.priority || "low").toUpperCase(); (grouped[g] || grouped.LOW).push(r); });

  for (const [impact, items] of Object.entries(grouped)) {
    if (!items.length) continue;
    if (y > pageH - 20) { doc.addPage(); y = 25; }
    const col = impact === "HIGH" ? [180, 0, 0] : impact === "MEDIUM" ? [180, 100, 0] : [80, 120, 80];
    doc.setTextColor(...col);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`${impact} IMPACT (${items.length})`, 17, y);
    y += 6;
    items.forEach((r, i) => {
      if (y > pageH - 25) { doc.addPage(); y = 25; }
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      y = addText(doc, `${i+1}. ${r.issue || r.title}`, y, pageH, 18, 9, [30, 30, 30]);
      if (r.fix || r.action) y = addText(doc, `  Fix: ${r.fix || r.action}`, y, pageH, 20, 8, [80, 80, 80]);
      
      const businessImpact = {
        "GTIN": "Missing GTIN blocks Google Shopping eligibility — direct revenue impact.",
        "ALT": "Missing ALT text reduces image search traffic by ~8-15%.",
        "H1": "Duplicate H1 confuses crawlers — can reduce ranking authority by 5-10%.",
        "FAQ": "No FAQ = zero AI engine citation opportunity on question queries.",
        "schema": "Missing Product schema blocks rich results — avg 20-30% lower CTR.",
      };
      
      if (impact === "HIGH") {
        const impactKey = Object.keys(businessImpact).find(k => 
          (r.issue || r.title || "").toLowerCase().includes(k.toLowerCase())
        );
        if (impactKey) {
          y = addText(doc, `  💼 ${businessImpact[impactKey]}`, y, pageH, 20, 7, [100,50,150]);
        }
      }

      if (r.example) y = addText(doc, `  Example: ${r.example}`, y, pageH, 20, 8, [40, 100, 60]);
      y += 2;
    });
  }
  return y;
}

function addPriorityMatrix(doc, recs, y, pageH) {
  y = addSection(doc, "⚡ Priority Matrix — Fix These First", y, pageH);

  // Table header
  const cols = [17, 90, 130, 158, 178]; // x positions
  doc.setFillColor(30, 30, 30);
  doc.rect(14, y, 182, 8, "F");
  doc.setTextColor(255,255,255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  ["Issue", "Impact", "Category", "Effort"].forEach((h, i) => doc.text(h, cols[i], y+5.5));
  y += 10;

  const sorted = [...(recs||[])].sort((a,b) => {
    const order = {HIGH:0, MEDIUM:1, LOW:2};
    return (order[(a.impact||a.priority||"LOW").toUpperCase()]||2) -
           (order[(b.impact||b.priority||"LOW").toUpperCase()]||2);
  });

  sorted.slice(0, 8).forEach((r, i) => {
    if (y > pageH - 12) { doc.addPage(); y = 25; }
    const bg = i % 2 === 0 ? [252,249,245] : [255,255,255];
    doc.setFillColor(...bg);
    doc.rect(14, y-2, 182, 8, "F");

    const impact = (r.impact||r.priority||"low").toUpperCase();
    const impactColor = impact==="HIGH" ? [180,0,0] : impact==="MEDIUM" ? [180,100,0] : [60,120,60];

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30,30,30);
    const issueLines = doc.splitTextToSize(sanitize(r.issue||r.title||""), 70);
    doc.text(issueLines[0], cols[0], y+3);

    doc.setTextColor(...impactColor);
    doc.setFont("helvetica", "bold");
    doc.text(impact, cols[1], y+3);

    doc.setTextColor(80,80,80);
    doc.setFont("helvetica", "normal");
    doc.text(sanitize(r.category||r.type||"-"), cols[2], y+3);
    doc.text(impact==="HIGH" ? "Quick" : "Planned", cols[3], y+3);
    y += 8;
  });
  return y + 4;
}

// ─── MODE B: Single Product Report ───────────────────────────────────────────
window.downloadProductReport = function(result, filename = "product-audit.pdf") {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageH = 297;
  let y = 25;

  const seo = result.seo_report || result.seo || {};
  const aeo = result.aeo_report || {};
  const brand = result.brand_report || {};
  const recs = result.recommendations || seo.recommendations || [];

  // PAGE 1: Cover
  y = addHeader(doc, 
    sanitize(result.product_title || result.title || "Product Audit"), 
    sanitize(result.url || ""), 
    y
  );
  y = addText(doc, 
    `Platform: ${result.platform || result.seo_report?.platform || "Unknown"}  |  Category: ${result.category || result.seo_report?.category || result.aeo_report?.category || "Unknown"}`, 
    y, pageH, 14, 9, [100,100,100]
  );
  y += 4;

  const seoScore = result.seo_score ?? seo.overall_seo_score ?? seo.score;
  const aeoScore = result.aeo_score ?? aeo.ai_visibility_score ?? aeo.score;
  const brandScore = result.brand_score ?? brand.score;

  addScoreBadge(doc, "SEO", seoScore, 14, y);
  addScoreBadge(doc, "AEO", aeoScore, 58, y);
  if (brandScore !== undefined) {
    addScoreBadge(doc, "Brand", brandScore, 102, y);
  }
  y += 22;

  if (seo.sub_scores) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30,30,30);
    doc.text("Sub-scores:", 14, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.text(`On-Page: ${seo.sub_scores.on_page||0} | Technical: ${seo.sub_scores.technical||0} | Content: ${seo.sub_scores.content||0} | Schema: ${seo.sub_scores.schema||0}`, 14, y);
    y += 10;
  }

  // Priority Matrix
  y += 4;
  y = addPriorityMatrix(doc, recs, y, pageH);

  // PAGE 2: SEO Analysis
  doc.addPage(); y = 25;
  y = addSection(doc, "SEO Analysis", y, pageH);

  // SERP Preview
  const serp = seo.serp_preview || {};
  if (serp.title) {
    y = addText(doc, "GOOGLE SERP PREVIEW", y, pageH, 14, 8, [120,120,120]);
    y = addText(doc, serp.title, y, pageH, 17, 10, [30,30,180]);
    y = addText(doc, serp.url || result.url, y, pageH, 17, 8, [0,100,0]);
    if (serp.description) y = addText(doc, serp.description, y, pageH, 17, 8);
    y += 4;
  }

  // Sub-scores
  const sub = seo.sub_scores || {};
  if (Object.keys(sub).length) {
    const subItems = [["On-Page", sub.on_page], ["Technical", sub.technical],
                      ["Content", sub.content], ["Schema", sub.schema]];
    subItems.forEach(([k,v]) => { if(v) y = addText(doc, `${k}: ${v}/100`, y, pageH, 17, 9); });
    y += 4;
  }

  // On-page cards
  const onPage = seo.on_page || seo.on_page_seo || seo.onpage || {};
  const titleTag = onPage.title_tag || onPage.titleTag || seo.title_tag || {};
  const metaDesc = onPage.meta_description || onPage.meta_desc || seo.meta_description || {};
  const h1 = onPage.h1 || onPage.h1_tag || seo.h1 || {};

  if (!titleTag.value && !seo.title && Object.keys(onPage).length === 0) {
    y = addText(doc, "SEO data not available for this product.", y, pageH, 14, 9, [150,150,150]);
  } else {
    const cards = [
      ["Title Tag", titleTag],
      ["Meta Description", metaDesc],
      ["H1 Tag", h1],
      ["Heading Structure", onPage.headings || onPage.heading_structure],
    ];
    cards.forEach(([label, card]) => {
      if (!card) return;
      if (y > pageH-30) { doc.addPage(); y=25; }
      y = addText(doc, `${label}: ${card.score||card.value||"?"}/10`, y, pageH, 14, 9, [30,30,30]);
      if (card.value) y = addText(doc, `  "${sanitize(card.value)}"`, y, pageH, 17, 8, [80,80,80]);
      const checks = card.checks || card.signals || [];
      checks.forEach(c => {
        const ok = c.pass || c.status==="pass";
        y = addText(doc, `  ${ok?"✓":"✗"} ${c.label||c.name||c}`, y, pageH, 18, 7, ok?[34,139,34]:[180,30,30]);
      });
      if (card.recommendation || card.issue)
        y = addText(doc, `  → ${card.recommendation||card.issue}`, y, pageH, 18, 7, [120,80,0]);
      y += 3;
    });
  }

  // Images
  const imgs = seo.images || seo.image_seo || seo.image || {};
  if (imgs.total !== undefined) {
    y = addSection(doc, "🖼 Image SEO", y, pageH);
    y = addText(doc, `Total: ${imgs.total} | Missing ALT: ${imgs.missing_alt||imgs.missing} | Descriptive: ${imgs.descriptive_alt||imgs.descriptive}`, y, pageH, 17);
    (imgs.checks||[]).forEach(c => {
      y = addText(doc, `  ${c.pass?"✓":"✗"} ${c.label||c}`, y, pageH, 18, 7, c.pass?[34,139,34]:[180,30,30]);
    });
    y += 3;
  }

  // Schema
  const schema = seo.schema || seo.schema_markup || seo.structured_data || {};
  if (schema.fields_present || schema.checks || schema.status) {
    y = addSection(doc, "🔗 Schema Markup", y, pageH);
    if (schema.score) y = addText(doc, `Score: ${schema.score}/10`, y, pageH, 17);
    if (schema.status) y = addText(doc, `Product Schema: ${schema.status}`, y, pageH, 17, 9, [180,30,30]);
    (schema.fields_present||[]).forEach(f => y = addText(doc, `  ✓ ${f}`, y, pageH, 18, 7, [34,139,34]));
    (schema.fields_missing||[]).forEach(f => y = addText(doc, `  ✗ ${f}`, y, pageH, 18, 7, [180,30,30]));
    y += 3;
  }

  // Technical
  const tech = seo.technical || seo.technical_seo || {};
  if (tech.checks || tech.core_web_vitals) {
    y = addSection(doc, "⚙ Technical SEO", y, pageH);
    const cwv = tech.core_web_vitals || {};
    if (cwv.lcp) y = addText(doc, `Core Web Vitals — LCP: ${cwv.lcp} | CLS: ${cwv.cls} | INP: ${cwv.inp}`, y, pageH, 17);
    const links = tech.links || seo.links || {};
    if (links.internal) y = addText(doc, `Links — Internal: ${links.internal} | External: ${links.external}`, y, pageH, 17);
    (tech.checks||[]).forEach(c => {
      y = addText(doc, `  ${c.pass?"✓":"✗"} ${c.label||c}`, y, pageH, 18, 7, c.pass?[34,139,34]:[180,30,30]);
    });
    if (tech.quick_wins?.length) {
      y = addText(doc, "Quick Wins:", y, pageH, 14, 9, [0,100,50]);
      tech.quick_wins.forEach(w => y = addText(doc, `  → ${w}`, y, pageH, 17, 8, [0,100,50]));
    }
    y += 3;
  }

  // PAGE 3: AEO / AI Visibility
  doc.addPage(); y = 25;
  y = addSection(doc, "AEO / AI Visibility", y, pageH);
  y = addText(doc, `GRADE: ${aeo.grade || aeo.ai_visibility_grade || "?"}    AI Score: ${aeo.score || aeo.ai_visibility_score || "?"}/100`, y, pageH, 14, 11, [30,30,30]);
  y += 4;

  if (aeo.engine_likelihood) {
    y = addText(doc, "AI ENGINE LIKELIHOOD", y, pageH, 14, 10, [100,100,100]);
    const eng = aeo.engine_likelihood;
    y = addText(doc, `Google AI Overview: ${eng.google_ai_overview || "?"}`, y, pageH, 17, 9, [50,50,50]);
    y = addText(doc, `ChatGPT: ${eng.chatgpt || "?"}`, y, pageH, 17, 9, [50,50,50]);
    y = addText(doc, `Perplexity: ${eng.perplexity || "?"}`, y, pageH, 17, 9, [50,50,50]);
    y = addText(doc, `Gemini: ${eng.gemini || "?"}`, y, pageH, 17, 9, [50,50,50]);
    y += 4;
    if (aeo.engine_reasons) {
      Object.entries(aeo.engine_reasons).forEach(([k, v]) => {
        y = addText(doc, `${k}: ${v}`, y, pageH, 17, 8, [80,80,80]);
      });
      y += 4;
    }
  }

  // E-E-A-T detail
  const eeat = aeo.eeat || aeo.eeat_assessment || {};
  if (eeat.experience || eeat.expertise) {
    y = addSection(doc, "E-E-A-T Detail", y, pageH);
    ['experience','expertise','authority','trustworthiness'].forEach(dim => {
      const d = eeat[dim];
      if (!d) return;
      y = addText(doc, `${dim.toUpperCase()}: ${d.score}/10`, y, pageH, 14, 9, [80,30,30]);
      (d.found||[]).forEach(f => y = addText(doc, `  ✓ ${f}`, y, pageH, 18, 7, [34,139,34]));
      (d.missing||[]).forEach(m => y = addText(doc, `  ✗ ${m}`, y, pageH, 18, 7, [180,30,30]));
      y += 2;
    });
  }

  // RAG Readiness
  const rag = aeo.rag_readiness || {};
  if (rag.citability || rag.faq) {
    y = addSection(doc, "RAG Readiness", y, pageH);
    const cit = rag.citability || {};
    if (cit.score !== undefined) y = addText(doc, `Content Citability: ${cit.score}/10`, y, pageH, 17);
    (cit.checks||[]).forEach(c => {
      y = addText(doc, `  ${c.pass?"✓":"✗"} ${c.label||c}`, y, pageH, 18, 7, c.pass?[34,139,34]:[180,30,30]);
    });
    const faq = rag.faq || rag.faq_section || {};
    if (faq.score !== undefined) y = addText(doc, `FAQ Section: ${faq.score}/10`, y, pageH, 17);
    if (faq.questions_found === 0 || faq.count === 0)
      y = addText(doc, "  ⚠ No FAQ section found", y, pageH, 18, 8, [180,30,30]);
    (faq.suggested_faqs||faq.suggestions||[]).slice(0,3).forEach(q =>
      y = addText(doc, `  → ${q}`, y, pageH, 18, 7, [0,100,80])
    );
  }

  // PAGE 4: Brand Compliance
  // Brand Compliance
  if (brand && (brand.persona_alignment || brand.audit_trail)) {
    y = addSection(doc, "🛡️ Brand Compliance", y, pageH);
    (brand.persona_alignment||[]).forEach(p => {
      const pct = p.match_pct || p.match_percent || p.score;
      y = addText(doc, `${p.name||p.persona}: ${pct}% Match`, y, pageH, 17, 9, [30,30,30]);
      if (p.reason) y = addText(doc, `  ${p.reason}`, y, pageH, 18, 7, [100,100,100]);
    });
    y += 4;
    (brand.audit_trail||[]).forEach(item => {
      if (y > pageH-30) { doc.addPage(); y=25; }
      y = addText(doc, `⚠ ${item.title||item.name}`, y, pageH, 14, 9, [140,100,0]);
      if (item.issue) y = addText(doc, `  Issue: ${item.issue}`, y, pageH, 17, 8);
      if (item.fix) y = addText(doc, `  Fix: ${item.fix}`, y, pageH, 17, 8, [80,80,80]);
      if (item.reference) y = addText(doc, `  Ref: ${item.reference}`, y, pageH, 17, 7, [120,120,120]);
      y += 3;
    });
  }

  // PAGE 5: Recommendations
  doc.addPage(); y = 25;
  y = addRecommendations(doc, recs, y, pageH);

  // Footer on each page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated by Organic360 | Page ${i} of ${totalPages}`, 14, 292);
  }

  doc.save(filename);
};

// ─── MODE A: Site Audit Report ────────────────────────────────────────────────
window.downloadSiteReport = function(siteData, allProducts = [], filename = "site-audit.pdf") {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageH = 297;
  let y = 25;

  const categories = siteData.categories || [];
  const totalProductsAnalyzed = allProducts.length;
  const categoriesFound = siteData.summary?.total_categories_found || siteData.meta?.total_categories || categories.length;
  const totalProductsFound = siteData.summary?.total_products_found || siteData.meta?.total_products || categories.reduce((s, c) => s + (c.product_count || c.products?.length || 0), 0);

  // FIX: Accurate Averaging Calculation
  let sumSeo = 0, sumAeo = 0;
  allProducts.forEach(p => {
    sumSeo += (p.seo_score ?? p.seo_report?.overall_seo_score ?? p.seo_report?.score ?? 0);
    sumAeo += (p.aeo_score ?? p.aeo_report?.ai_visibility_score ?? p.aeo_report?.score ?? 0);
  });
  const avgSeo = allProducts.length > 0 ? Math.round(sumSeo / allProducts.length) : 0;
  const avgAeo = allProducts.length > 0 ? Math.round(sumAeo / allProducts.length) : 0;

  // Header
  y = addHeader(doc, `Site Audit: ${siteData.domain}`, siteData.homepage_url || "", y);
  y += 4;

  // 1. Executive Summary
  y = addSection(doc, "1. Executive Summary", y, pageH);
  y = addText(doc, "This Site Audit analyzes your e-commerce health across SEO and AEO (AI Visibility). The goal is to identify blockers that prevent your products from ranking on Google and being recommended by AI engines like ChatGPT and Gemini.", y, pageH, 17, 10, [60, 60, 60]);
  y += 4;
  
  doc.setFillColor(240, 245, 250);
  doc.rect(17, y, 176, 26, "F");
  doc.setTextColor(30, 80, 150);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`Overall Site Health`, 22, y + 8);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`SEO Average: ${avgSeo}/100    |    AEO Average: ${avgAeo}/100`, 22, y + 14);
  doc.text(`Categories Found: ${categoriesFound} (Analyzed: ${categories.length})    |    Products Found: ${totalProductsFound} (Analyzed: ${totalProductsAnalyzed})`, 22, y + 20);
  y += 34;

  // Aggregate Issues
  const issueCounts = {};
  allProducts.forEach(p => {
    const recs = p.recommendations || p.seo_report?.recommendations || [];
    const seenIssuesForProd = new Set();
    recs.forEach(r => {
      if ((r.impact || r.priority || "").toUpperCase() === "HIGH") {
        const title = (r.issue || r.title || "").slice(0, 60);
        if (!seenIssuesForProd.has(title)) {
          seenIssuesForProd.add(title);
          if (!issueCounts[title]) issueCounts[title] = { count: 0, fix: r.fix || r.action, ex: r.example, fullTitle: r.issue || r.title };
          issueCounts[title].count++;
        }
      }
    });
  });
  
  const topIssues = Object.entries(issueCounts).sort((a,b) => b[1].count - a[1].count).slice(0, 3);
  
  if (topIssues.length > 0) {
    y = addSection(doc, "Top 3 Critical Sitewide Issues", y, pageH);
    y = addText(doc, "These are the most frequent high-impact errors preventing your products from performing well.", y, pageH, 17, 9, [100, 50, 50]);
    y += 4;
    topIssues.forEach((iss, i) => {
      if (y > pageH - 25) { doc.addPage(); y = 25; }
      doc.setTextColor(180, 0, 0);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      y = addText(doc, `${i+1}. ${iss[1].fullTitle} (Found on ${iss[1].count} products)`, y, pageH, 17, 10, [180, 0, 0]);
      if (iss[1].fix) y = addText(doc, `Fix: ${iss[1].fix}`, y, pageH, 20, 9, [30, 100, 30]);
      if (iss[1].ex) y = addText(doc, `Example: ${iss[1].ex}`, y, pageH, 20, 8, [80, 80, 80]);
      y += 4;
    });
  }

  // 2. Category Performance Overview
  if (y > pageH - 40) { doc.addPage(); y = 25; }
  y = addSection(doc, "2. Category Performance Overview", y, pageH);
  
  doc.setFillColor(230, 230, 230);
  doc.rect(17, y, 176, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(9);
  doc.text("Category Name", 20, y + 5.5);
  doc.text("Found", 100, y + 5.5);
  doc.text("Analyzed", 120, y + 5.5);
  doc.text("Avg SEO", 145, y + 5.5);
  doc.text("Avg AEO", 170, y + 5.5);
  y += 8;
  
  const assignedProductsOverview = new Set();
  categories.forEach((cat) => {
    const catProducts = allProducts.filter(p => {
      // deduplication removed as per user request
      const match = p.category_names?.includes(cat.name) || p.category === cat.name || p.category_name === cat.name || (cat.products && cat.products.includes(p.url));
      return match;
    });
    let cSeo = 0, cAeo = 0;
    catProducts.forEach(p => { cSeo += (p.seo_score ?? p.seo_report?.overall_seo_score ?? p.seo_report?.score ?? 0); cAeo += (p.aeo_score ?? p.aeo_report?.ai_visibility_score ?? p.aeo_report?.score ?? 0); });
    const avgCSeo = catProducts.length ? Math.round(cSeo / catProducts.length) : "-";
    const avgCAeo = catProducts.length ? Math.round(cAeo / catProducts.length) : "-";
    
    const catFound = cat.product_count || cat.products?.length || 0;
    const catAnalyzed = catProducts.length;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 30, 30);
    doc.setDrawColor(200, 200, 200);
    doc.rect(17, y, 176, 8, "S");
    const safeName = doc.splitTextToSize(sanitize(cat.name), 75)[0] || "Unknown";
    doc.text(safeName, 20, y + 5.5);
    doc.text(String(catFound), 100, y + 5.5);
    doc.text(String(catAnalyzed), 120, y + 5.5);
    doc.text(String(avgCSeo), 145, y + 5.5);
    doc.text(String(avgCAeo), 170, y + 5.5);
    y += 8;
    if (y > pageH - 20) { doc.addPage(); y = 25; }
  });
  y += 10;

  // 3. Detailed Product Appendix
  doc.addPage(); y = 25;
  y = addSection(doc, "3. Per Category Detail", y, pageH);

  const assignedProductsDetail = new Set();
  categories.forEach((cat, ci) => {
    if (y > pageH - 40) { doc.addPage(); y = 25; }
    doc.setFillColor(50, 50, 50);
    doc.rect(14, y, 182, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    
    const catProducts = allProducts.filter(p => {
      // deduplication removed as per user request
      const match = p.category_names?.includes(cat.name) || p.category === cat.name || p.category_name === cat.name || (cat.products && cat.products.includes(p.url));
      return match;
    });
    
    doc.text(`CATEGORY ${ci+1}: ${sanitize(cat.name)} (${catProducts.length} products analyzed)`, 17, y + 7);
    y += 15;

    catProducts.forEach((prod, pi) => {
      if (y > pageH - 60) { doc.addPage(); y = 25; }

      const seo = prod.seo_report || {};
      const aeo = prod.aeo_report || {};
      const recs = prod.recommendations || seo.recommendations || [];
      const prodName = sanitize(prod.product_title || prod.name || prod.title || "Product");

      doc.setTextColor(30, 30, 30);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      const lines = doc.splitTextToSize(`${pi + 1}. ${prodName}`, 176);
      lines.forEach(l => { 
        if (y > pageH - 15) { doc.addPage(); y = 25; }
        doc.text(l, 17, y); y += 5; 
      });
      
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 150, 200);
      doc.textWithLink(sanitize(prod.url || ""), 17, y, { url: prod.url });
      y += 6;

      // Inline Scores
      const pSeo = prod.seo_score ?? seo.overall_seo_score ?? seo.score ?? "?";
      const pAeo = prod.aeo_score ?? aeo.ai_visibility_score ?? aeo.score ?? "?";
      let inlineScores = `SEO: ${pSeo}   AEO: ${pAeo}`;
      const brandScore = prod.brand_score ?? prod.brand_report?.score;
      if (brandScore !== undefined) {
        inlineScores += `   Brand: ${brandScore}`;
      }
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(50, 120, 50);
      y = addText(doc, inlineScores, y, pageH, 17, 9, [50, 120, 50]);
      y += 2;

      // Top Critical Issues
      const highRecs = recs.filter(r => (r.impact || r.priority || "").toUpperCase() === "HIGH");
      if (highRecs.length) {
        y = addText(doc, "Critical Issues:", y, pageH, 17, 9, [180, 0, 0]);
        highRecs.forEach(r => {
          y = addCheckItem(doc, false, r.issue || r.title, y, pageH, 20);
          if (r.fix) y = addText(doc, `Fix: ${r.fix}`, y, pageH, 25, 8, [80, 80, 80]);
          if (r.example) y = addText(doc, `Example: ${r.example}`, y, pageH, 25, 8, [100, 100, 100]);
        });
      }
      y += 6;
      doc.setDrawColor(230, 230, 230);
      doc.line(17, y, 193, y);
      y += 6;
    });
    y += 4;
  });

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated by Organic360 | Page ${i} of ${totalPages}`, 14, 292);
  }

  doc.save(filename);
};
