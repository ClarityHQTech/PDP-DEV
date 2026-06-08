const { useState, useEffect, useRef, useCallback } = React;

/* ═══════════════════════════════════════════════════════
   CONSTANTS & HELPERS
═══════════════════════════════════════════════════════ */
const DEV_BYPASS = '{{DEV_BYPASS}}' === 'true' || true;

function clx(...args) { return args.filter(Boolean).join(' '); }
function num(v, def=0) { return typeof v === 'number' && !isNaN(v) ? v : def; }
function arr(v) { return Array.isArray(v) ? v : []; }

function scoreColor(s) {
  if (s >= 80) return '#5A8A5A';
  if (s >= 60) return '#C08020';
  if (s >= 40) return '#B86030';
  return '#C05050';
}
window.scaleScore = function scaleScore(v) {
  if (typeof v !== 'number' || isNaN(v)) return 0;
  return (v > 0 && v <= 1.0) ? v * 100 : (v > 1.0 && v <= 10 ? v * 10 : v);
}
window.scoreGrade = function scoreGrade(s) {
  const v = window.scaleScore(s);
  if (v >= 85) return 'A';
  if (v >= 70) return 'B';
  if (v >= 55) return 'C';
  if (v >= 40) return 'D';
  return 'F';
}
window.gradeBadgeClass = function gradeBadgeClass(g) {
  if (!g) return 'badge-steel';
  if (g === 'A') return 'badge-green';
  if (g === 'B') return 'badge-green';
  if (g === 'C') return 'badge-amber';
  if (g === 'D') return 'badge-amber';
  return 'badge-red';
}
function statusIcon(s) {
  if (s === 'good') return <i className="ph ph-check-circle" style={{color:'var(--green)'}}></i>;
  if (s === 'warning') return <i className="ph ph-warning" style={{color:'var(--amber)'}}></i>;
  if (s === 'missing') return <i className="ph ph-x-circle" style={{color:'var(--red)'}}></i>;
  return null;
}
function boolIcon(v, size='16px') {
  if (v === true)  return <i className="ph ph-check-circle" style={{color:'var(--green)',fontSize:size}}></i>;
  if (v === false) return <i className="ph ph-x-circle"    style={{color:'var(--red)',  fontSize:size}}></i>;
  return <i className="ph ph-minus-circle" style={{color:'var(--muted)',fontSize:size}}></i>;
}
function likelihoodBadge(v) {
  if (v === 'high')   return <span className="badge badge-green">High</span>;
  if (v === 'medium') return <span className="badge badge-amber">Medium</span>;
  if (v === 'low')    return <span className="badge badge-red">Low</span>;
  return <span className="badge badge-steel">?</span>;
}
function impactBadge(v) {
  if (v === 'high')   return <span className="badge badge-red">High Impact</span>;
  if (v === 'medium') return <span className="badge badge-amber">Medium</span>;
  return <span className="badge badge-steel">Low</span>;
}

/* ── Info Tooltip ───────────────────────────────────── */
window.InfoTooltip = function InfoTooltip({ text }) {
  return (
    <span className="tip" style={{marginLeft: 6, display: 'inline-flex', alignItems: 'center', cursor: 'help', verticalAlign: 'middle'}}>
      <i className="ph ph-info" style={{color: 'var(--muted, #8E8A86)', fontSize: 15}}></i>
      <span className="tip-box" style={{fontWeight: 400}}>{text}</span>
    </span>
  );
}

/* ── Score Ring ─────────────────────────────────────── */
window.ScoreRing = function ScoreRing({ score=0, size=90, label='', sub='' }) {
  const s = num(score);
  const r = (size/2) - 8;
  const circ = 2 * Math.PI * r;
  const offset = circ - (s/100) * circ;
  const col = scoreColor(s);
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
      <svg width={size} height={size} style={{transform:'rotate(-90deg)'}}>
        <circle className="ring-track" cx={size/2} cy={size/2} r={r}/>
        <circle className="ring-fill" cx={size/2} cy={size/2} r={r}
          stroke={col}
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <div style={{marginTop:-size*0.6-8,textAlign:'center',lineHeight:1}}>
        <div style={{fontSize:size*0.24,fontWeight:700,color:col}}>{Math.round(s)}</div>
        <div style={{fontSize:size*0.12,color:'var(--muted)',marginTop:2}}>/100</div>
      </div>
      {label && <div style={{fontSize:12,fontWeight:600,color:'var(--stone)',marginTop:size*0.5+4}}>{label}</div>}
      {sub   && <div style={{fontSize:11,color:'var(--muted)'}}>{sub}</div>}
    </div>
  );
}

/* ── Mini Score Bar ─────────────────────────────────── */
window.ScoreBar = function ScoreBar({ score=0, label='', showNum=true }) {
  const s = num(score);
  const col = scoreColor(s);
  return (
    <div style={{display:'flex',alignItems:'center',gap:8}}>
      {label && <span style={{fontSize:12,color:'var(--stone)',width:90,flexShrink:0}}>{label}</span>}
      <div className="prog-bar" style={{flex:1}}>
        <div className="prog-fill" style={{width:`${s}%`,background:col}}></div>
      </div>
      {showNum && <span style={{fontSize:12,fontWeight:600,color:col,width:30,textAlign:'right'}}>{Math.round(s)}</span>}
    </div>
  );
}

/* ── Expand Card ────────────────────────────────────── */
window.ExpandCard = function ExpandCard({ title, icon, score, status, children, defaultOpen=false, max10=false }) {
  const [open, setOpen] = useState(defaultOpen);
  const sc = typeof score === 'number' ? score : null;
  const col = sc !== null ? scoreColor(sc*10) : 'var(--muted)';
  return (
    <div style={{border:'1px solid var(--border-lt)',borderRadius:10,overflow:'hidden',marginBottom:6}}>
      <div className="section-hdr" onClick={()=>setOpen(o=>!o)}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          {icon && <i className={`ph ${icon}`} style={{fontSize:16,color:'var(--terra)'}}></i>}
          <span style={{fontWeight:600,fontSize:13}}>{title}</span>
          {status && statusIcon(status)}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          {sc !== null && (
            <span style={{fontSize:12,fontWeight:700,color:col}}>
              {max10 ? Number(sc).toFixed(1) : Math.round(sc)}
              <span style={{fontSize:10,color:'var(--muted)'}}>{max10 ? '/10' : '/100'}</span>
            </span>
          )}
          <i className={`ph ph-caret-${open?'up':'down'}`} style={{fontSize:14,color:'var(--muted)'}}></i>
        </div>
      </div>
      {open && <div style={{padding:'0 18px 16px',borderTop:'1px solid var(--border-lt)'}}>{children}</div>}
    </div>
  );
}

/* ── Signal Item ────────────────────────────────────── */
window.Sig = function Sig({ ok, label }) {
  const cls = ok === true ? 'sig-ok' : ok === false ? 'sig-bad' : 'sig-na';
  const icon = ok === true ? 'ph-check' : ok === false ? 'ph-x' : 'ph-minus';
  return (
    <div className={`sig-item ${cls}`}>
      <i className={`ph ${icon}`} style={{fontSize:13}}></i>
      <span>{label}</span>
    </div>
  );
}

/* ── Issue List ─────────────────────────────────────── */
window.IssueList = function IssueList({ issues=[], type='issue' }) {
  if (!arr(issues).length) return null;
  const icon = type === 'win' ? 'ph-lightning' : 'ph-warning-diamond';
  const color = type === 'win' ? 'var(--green)' : 'var(--amber)';
  return (
    <div style={{marginTop:10}}>
      {arr(issues).map((iss,i) => (
        <div key={i} style={{display:'flex',gap:8,fontSize:12,color:'var(--stone)',marginBottom:4}}>
          <i className={`ph ${icon}`} style={{color,fontSize:13,marginTop:1,flexShrink:0}}></i>
          <span>{iss}</span>
        </div>
      ))}
    </div>
  );
}

/* ── SERP Preview ───────────────────────────────────── */
window.SerpPreview = function SerpPreview({ url='', title='', description='' }) {
  const domain = (() => { try { return new URL(url).hostname; } catch(e) { return url; } })();
  return (
    <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,padding:14,marginTop:10}}>
      <div style={{fontSize:11,color:'var(--muted)',marginBottom:4}}>Google SERP Preview</div>
      <div className="serp-url">{domain}</div>
      <div className="serp-title">{title || 'No title tag found'}</div>
      <div className="serp-desc">{description || 'No meta description. Google will auto-generate one — usually lower quality.'}</div>
    </div>
  );
}

/* ── Recommendation Row ─────────────────────────────── */
window.RecoRow = function RecoRow({ issue, impact='medium', fix, category }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="expand-row" style={{borderRadius:8,padding:'10px 12px'}} onClick={()=>setOpen(o=>!o)}>
      <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
        <i className="ph ph-arrow-circle-right" style={{color:'var(--terra)',marginTop:2,fontSize:14,flexShrink:0}}></i>
        <div style={{flex:1}}>
          <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
            <span style={{fontWeight:600,fontSize:13}}>{issue}</span>
            {impactBadge(impact)}
            {category && <span className="badge badge-steel">{category}</span>}
          </div>
          {open && fix && (
            <div style={{marginTop:8,fontSize:12,color:'var(--stone)',lineHeight:1.6,background:'rgba(184,166,138,.08)',padding:'8px 12px',borderRadius:8}}>
              <strong style={{color:'var(--dark)'}}>Fix: </strong>{fix}
            </div>
          )}
        </div>
        <i className={`ph ph-caret-${open?'up':'down'}`} style={{fontSize:13,color:'var(--muted)',marginTop:2}}></i>
      </div>
    </div>
  );
}

/* ── API helpers ─────────────────────────────────────── */
async function apiPost(path, body) {
  const token = sessionStorage.getItem('auth_token');
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function streamSSE(path, body, onEvent, signal) {
  const token = sessionStorage.getItem('auth_token');
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const parts = buf.split('\n\n');
    buf = parts.pop();
    for (const part of parts) {
      const lines = part.split('\n');
      let event = 'message', data = '';
      for (const line of lines) {
        if (line.startsWith('event: ')) event = line.slice(7).trim();
        if (line.startsWith('data: ')) data = line.slice(6).trim();
      }
      if (data) {
        try { onEvent(event, JSON.parse(data)); }
        catch(e) { onEvent(event, { raw: data }); }
      }
    }
  }
}

/* ══════════════════════════════════════════════════════
   VIEW: ANALYZING — Live Progress
══════════════════════════════════════════════════════ */
window.AnalyzingView = function AnalyzingView({ steps=[], currentStep='', pct=0, mode='B', url='' }) {
  const stepDefs = mode === 'B'
    ? [
        { key:'fetching',     label:'Fetching page content', icon:'ph-globe' },
        { key:'classifying',  label:'Detecting product category', icon:'ph-tag' },
        { key:'seo',          label:'Running category-specific SEO analysis', icon:'ph-magnifying-glass' },
        { key:'aeo',          label:'Analyzing AI visibility (AEO)', icon:'ph-robot' },
        { key:'done',         label:'Generating recommendations', icon:'ph-lightning' },
      ]
    : [
        { key:'crawling',  label:'Discovering site structure', icon:'ph-tree-structure' },
        { key:'site_overview', label:'Mapping categories', icon:'ph-folders' },
        { key:'analyzing', label:'Analyzing products', icon:'ph-magnifying-glass' },
        { key:'done',      label:'Aggregating results', icon:'ph-chart-bar' },
      ];

  const currentIdx = stepDefs.findIndex(s => s.key === currentStep);

  return (
    <div style={{minHeight:'100vh',background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div className="fade-in" style={{maxWidth:460,width:'100%',padding:24,textAlign:'center'}}>
        <div style={{width:72,height:72,borderRadius:'50%',background:'var(--terra-lt)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px'}}>
          <i className="ph ph-magnifying-glass spin" style={{fontSize:32,color:'var(--terra)'}}></i>
        </div>
        <h2 className="serif" style={{fontSize:24,fontWeight:700,marginBottom:6}}>
          {mode === 'A' ? 'Auditing Site…' : 'Analyzing PDP…'}
        </h2>
        <p style={{fontSize:13,color:'var(--muted)',marginBottom:4}}>
          {mode === 'A' ? 'Crawling categories & products' : 'Running SEO + AEO analysis'}
        </p>
        {url && <p style={{fontSize:11,color:'var(--steel)',wordBreak:'break-all',marginBottom:24}}>{url}</p>}

        {/* Progress bar */}
        <div style={{width:'100%', height:6, background:'var(--border)', borderRadius:3, marginBottom:28, overflow:'hidden'}}>
          <div style={{height:'100%', width:`${pct || 0}%`, background:'var(--terra)', borderRadius:3, transition:'width 0.3s ease'}}></div>
        </div>

        {/* Steps */}
        <div style={{textAlign:'left'}}>
          {stepDefs.map((s, i) => {
            const done = i < currentIdx || currentStep === 'done';
            const active = s.key === currentStep && currentStep !== 'done';
            return (
              <div key={s.key} style={{display:'flex',alignItems:'center',gap:12,padding:'8px 0',borderBottom:'1px solid var(--border-lt)'}}>
                <div style={{width:28,height:28,borderRadius:'50%',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',
                  background: done ? 'var(--green-lt)' : active ? 'var(--terra-lt)' : 'var(--border-lt)'}}>
                  {done
                    ? <i className="ph ph-check" style={{fontSize:13,color:'var(--green)'}}></i>
                    : active
                    ? <i className={`ph ${s.icon} spin`} style={{fontSize:13,color:'var(--terra)'}}></i>
                    : <i className={`ph ${s.icon}`} style={{fontSize:13,color:'var(--muted)'}}></i>
                  }
                </div>
                <span style={{fontSize:13,color: done ? 'var(--green)' : active ? 'var(--dark)' : 'var(--muted)', fontWeight: active ? 600 : 400}}>
                  {s.label}
                </span>
                {active && <span className="pulse-dot" style={{width:6,height:6,borderRadius:'50%',background:'var(--terra)',marginLeft:'auto'}}></span>}
                {done  && <i className="ph ph-check-circle" style={{color:'var(--green)',marginLeft:'auto',fontSize:14}}></i>}
              </div>
            );
          })}
        </div>

        {steps.length > 0 && (
          <div style={{marginTop:16,fontSize:11,color:'var(--muted)',textAlign:'left'}}>
            {steps.slice(-2).map((s,i) => <div key={i}>{s}</div>)}
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   SEO TAB — Full breakdown
══════════════════════════════════════════════════════ */
window.BrandTab = function BrandTab({ seo={} }) {
  const brand = seo.brand_compliance || {};
  const issues = brand.issues || [];
  const personas = brand.persona_alignment || [];

  if (!brand.score && issues.length === 0 && personas.length === 0) {
    return (
      <div className="card" style={{padding:40,textAlign:'center'}}>
        <div style={{width:64,height:64,borderRadius:'50%',background:'rgba(0,0,0,0.05)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}>
          <i className="ph ph-shield-warning" style={{fontSize:32,color:'var(--muted)'}}></i>
        </div>
        <h3 style={{fontSize:18,fontWeight:600,color:'var(--ink)',marginBottom:8}}>No Brand Guidelines Found</h3>
        <p style={{color:'var(--muted)',maxWidth:400,margin:'0 auto'}}>We could not find an exact match for this domain's Brand Configuration Profile (BCP) or Ideal Customer Profile (ICP).</p>
      </div>
    );
  }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:24}}>
      {/* Overview section */}
      <div className="card" style={{display:'flex',gap:24}}>
        <div style={{flex:1}}>
          <h3 style={{fontSize:16,fontWeight:600,color:'var(--ink)',marginBottom:16}}>Persona Alignment</h3>
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            {personas.map((p, i) => (
              <div key={i}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                  <span style={{fontSize:14,fontWeight:500,color:'var(--ink)'}}>{p.persona}</span>
                  <span style={{fontSize:14,color:'var(--muted)'}}>{p.match_percentage}% Match</span>
                </div>
                <div style={{height:8,background:'rgba(0,0,0,0.06)',borderRadius:4,overflow:'hidden'}}>
                  <div style={{height:'100%',background:'var(--sage-dk)',width:`${p.match_percentage}%`,borderRadius:4}}></div>
                </div>
                <p style={{fontSize:12,color:'var(--muted)',marginTop:6}}><i className="ph ph-info"></i> {p.reason}</p>
              </div>
            ))}
            {personas.length === 0 && <p style={{fontSize:13,color:'var(--muted)'}}>No specific persona alignments found.</p>}
          </div>
        </div>
      </div>

      <h3 style={{fontSize:18,fontWeight:700,color:'var(--ink)',marginTop:12}}>Audit Trail</h3>
      {issues.length === 0 && <p style={{fontSize:14,color:'var(--muted)'}}>No brand compliance issues detected! Great job.</p>}
      
      {issues.map((iss, idx) => {
        const isRed = iss.status === 'violation';
        const isYellow = iss.status === 'warning';
        const isGreen = iss.status === 'compliant';
        
        const icon = isRed ? 'ph-x-circle' : isYellow ? 'ph-warning' : 'ph-check-circle';
        const color = isRed ? 'var(--terra)' : isYellow ? '#eab308' : 'var(--sage-dk)';
        const bg = isRed ? 'rgba(196,131,110,0.1)' : isYellow ? 'rgba(234,179,8,0.1)' : 'rgba(110,135,116,0.1)';

        return (
          <div key={idx} className="card" style={{borderLeft:`4px solid ${color}`,padding:20}}>
            <div style={{display:'flex',alignItems:'flex-start',gap:16}}>
              <div style={{width:40,height:40,borderRadius:8,background:bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <i className={`ph ${icon}`} style={{fontSize:22,color}}></i>
              </div>
              <div style={{flex:1}}>
                <h4 style={{fontSize:15,fontWeight:600,color:'var(--ink)',marginBottom:6}}>{iss.element}</h4>
                <p style={{fontSize:14,color:'var(--ink)',marginBottom:8}}><strong>Issue:</strong> {iss.issue}</p>
                {iss.fix && <p style={{fontSize:14,color:'var(--muted)',marginBottom:12}}><strong>Fix:</strong> {iss.fix}</p>}
                
                {iss.reference && (
                  <div style={{display:'inline-flex',alignItems:'center',gap:6,background:'rgba(0,0,0,0.04)',padding:'4px 10px',borderRadius:6,fontSize:12,color:'var(--muted)',fontWeight:500}}>
                    <i className="ph ph-book-open"></i> Reference: {iss.reference}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

window.SEOTab = function SEOTab({ seo={}, url='' }) {
  if (!seo || Object.keys(seo).length === 0)
    return <div style={{padding:32,textAlign:'center',color:'var(--muted)'}}>SEO data unavailable</div>;

  const t  = seo.title_tag        || {};
  const md = seo.meta_description || {};
  const h1 = seo.h1               || {};
  const hh = seo.heading_hierarchy|| {};
  const kw = seo.keyword_analysis || {};
  const cq = seo.content_quality  || {};
  const im = seo.image_seo        || {};
  const sd = seo.structured_data  || {};
  const tc = seo.technical_seo    || {};
  const lk = seo.links            || {};
  const us = seo.url_structure    || {};
  const bd = seo.score_breakdown  || {};

  return (
    <div className="fade-in">
      {/* Score summary */}
      <div style={{display:'grid',gridTemplateColumns:'auto 1fr',gap:24,alignItems:'center',marginBottom:24}}>
        <div style={{position: 'relative'}}>
          <ScoreRing score={window.scaleScore(seo.overall_seo_score)} size={100} label="SEO Score" />
          <div style={{position: 'absolute', top: 0, right: 0}}>
            <InfoTooltip text="Calculated based on: Content Quality (15%), Title (10%), Meta (10%), H1 (10%), Headings (10%), Keywords (10%), Images (10%), Schema (10%), Tech (10%), Links (5%)" />
          </div>
        </div>
        <div>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
            <span className={`badge ${gradeBadgeClass(seo.grade||scoreGrade(seo.overall_seo_score))}`} style={{fontSize:14,padding:'4px 12px',display:'inline-flex',alignItems:'center'}}>
              Grade {seo.grade||scoreGrade(seo.overall_seo_score)}
              <InfoTooltip text="Grade A: 85-100 (Excellent), Grade B: 70-84 (Good), Grade C: 55-69 (Average), Grade D: 40-54 (Poor), Grade F: <40 (Failing)" />
            </span>
            <span style={{fontSize:12,color:'var(--muted)'}}>Primary keyword: <strong style={{color:'var(--dark)'}}>{seo.primary_keyword||'—'}</strong></span>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:5}}>
            <ScoreBar score={window.scaleScore(bd.on_page_pct)} label="On-Page"/>
            <ScoreBar score={window.scaleScore(bd.technical_pct)} label="Technical"/>
            <ScoreBar score={window.scaleScore(bd.content_pct)} label="Content"/>
            <ScoreBar score={window.scaleScore(bd.structured_data_pct)} label="Schema"/>
          </div>
        </div>
      </div>

      {/* Critical issues strip */}
      {arr(seo.critical_issues).length > 0 && (
        <div style={{background:'var(--red-lt)',border:'1px solid rgba(192,80,80,.2)',borderRadius:10,padding:'12px 16px',marginBottom:16}}>
          <div style={{fontSize:12,fontWeight:700,color:'var(--red)',marginBottom:6}}>
            <i className="ph ph-warning-diamond" style={{marginRight:6}}></i>Critical Issues ({seo.critical_issues.length})
          </div>
          {arr(seo.critical_issues).map((iss,i) => (
            <div key={i} style={{fontSize:12,color:'#8B2E2E',marginBottom:3}}><span style={{marginRight:6}}>•</span>{iss}</div>
          ))}
        </div>
      )}

      {/* SERP Preview */}
      <SerpPreview url={url} title={t.value} description={md.value}/>

      <div style={{marginTop:20}}>

        {/* ── On-Page SEO ─────────────── */}
        <div style={{fontSize:11,fontWeight:700,color:'var(--muted)',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:8,marginTop:16}}>On-Page SEO</div>

        {/* Title Tag */}
        <ExpandCard title="Title Tag" icon="ph-text-aa" score={t.score} status={t.status} defaultOpen={true} max10={true}>
          <div style={{marginTop:12}}>
            <div style={{background:'rgba(0,0,0,.03)',borderRadius:8,padding:'10px 14px',fontSize:13,color:'var(--dark)',fontFamily:'monospace',marginBottom:10,wordBreak:'break-all'}}>
              {t.value || <span style={{color:'var(--red)'}}>⚠ No title tag found</span>}
            </div>
            <div className="sig-grid" style={{marginBottom:10}}>
              <Sig ok={num(t.char_count)>=50&&num(t.char_count)<=60} label={`${t.char_count||0} chars (50-60 ideal)`}/>
              <Sig ok={t.keyword_present} label="Keyword present"/>
              <Sig ok={t.brand_present} label="Brand present"/>
              <Sig ok={!t.truncation_risk} label="No truncation risk"/>
              <Sig ok={t.has_cta_modifier} label="Has action modifier"/>
            </div>
            <IssueList issues={t.issues}/>
            {t.recommendation && (
              <div style={{marginTop:10,fontSize:12,color:'var(--stone)',background:'rgba(168,181,160,.1)',padding:'8px 12px',borderRadius:8,borderLeft:'3px solid var(--sage)'}}>
                <strong>💡 Recommendation: </strong>{t.recommendation}
              </div>
            )}
          </div>
        </ExpandCard>

        {/* Meta Description */}
        <ExpandCard title="Meta Description" icon="ph-text-align-left" score={md.score} status={md.status} max10={true}>
          <div style={{marginTop:12}}>
            <div style={{background:'rgba(0,0,0,.03)',borderRadius:8,padding:'10px 14px',fontSize:13,color:'var(--dark)',fontFamily:'monospace',marginBottom:10}}>
              {md.value || <span style={{color:'var(--red)'}}>⚠ No meta description found — Google will auto-generate</span>}
            </div>
            <div className="sig-grid" style={{marginBottom:10}}>
              <Sig ok={num(md.char_count)>=140&&num(md.char_count)<=160} label={`${md.char_count||0} chars (140-160 ideal)`}/>
              <Sig ok={md.keyword_present} label="Keyword present"/>
              <Sig ok={md.has_cta} label="Has call-to-action"/>
              <Sig ok={md.is_unique} label="Unique (not boilerplate)"/>
            </div>
            <IssueList issues={md.issues}/>
            {md.recommendation && (
              <div style={{marginTop:10,fontSize:12,color:'var(--stone)',background:'rgba(168,181,160,.1)',padding:'8px 12px',borderRadius:8,borderLeft:'3px solid var(--sage)'}}>
                <strong>💡 </strong>{md.recommendation}
              </div>
            )}
          </div>
        </ExpandCard>

        {/* H1 */}
        <ExpandCard title="H1 Tag" icon="ph-text-h" score={h1.score} status={h1.status} max10={true}>
          <div style={{marginTop:12}}>
            <div style={{background:'rgba(0,0,0,.03)',borderRadius:8,padding:'10px 14px',fontSize:13,fontWeight:600,marginBottom:10}}>
              {h1.value || <span style={{color:'var(--red)'}}>⚠ No H1 found</span>}
            </div>
            <div className="sig-grid">
              <Sig ok={num(h1.count)===1} label={`${h1.count||0} H1 (exactly 1 ideal)`}/>
              <Sig ok={h1.keyword_present} label="Keyword in H1"/>
              <Sig ok={h1.matches_title !== false} label="Aligns with title"/>
            </div>
            <IssueList issues={h1.issues}/>
          </div>
        </ExpandCard>

        {/* Heading Hierarchy */}
        <ExpandCard title="Heading Structure" icon="ph-list-numbers" score={hh.score} max10={true}>
          <div style={{marginTop:12}}>
            <div className="sig-grid" style={{marginBottom:10}}>
              <Sig ok={(hh.h2_count||0)>0} label={`H2: ${hh.h2_count||0} tags`}/>
              <Sig ok={(hh.h3_count||0)>0} label={`H3: ${hh.h3_count||0} tags`}/>
              <Sig ok={hh.has_logical_flow} label="Logical H1→H2→H3 flow"/>
              <Sig ok={hh.keyword_in_subheadings} label="Keyword in subheadings"/>
              <Sig ok={hh.question_based_headings} label="Question-based headings"/>
            </div>
            {arr(hh.h2_examples).length > 0 && (
              <div style={{marginTop:8}}>
                <div style={{fontSize:11,fontWeight:600,color:'var(--muted)',marginBottom:6}}>H2 Examples:</div>
                {hh.h2_examples.slice(0,3).map((ex,i)=>(
                  <div key={i} style={{fontSize:12,color:'var(--stone)',padding:'4px 10px',background:'rgba(0,0,0,.03)',borderRadius:6,marginBottom:4}}>{ex}</div>
                ))}
              </div>
            )}
            <IssueList issues={hh.issues}/>
          </div>
        </ExpandCard>

        {/* Keyword Analysis */}
        <ExpandCard title="Keyword Analysis" icon="ph-key" score={kw.score} max10={true}>
          <div style={{marginTop:12}}>
            <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:10}}>
              <div style={{padding:'6px 12px',background:'var(--terra-lt)',borderRadius:8,fontSize:12,fontWeight:600,color:'var(--terra-dk)'}}>
                Primary: {kw.primary_keyword||'—'}
              </div>
              {arr(kw.secondary_keywords).slice(0,4).map((kw2,i)=>(
                <div key={i} style={{padding:'6px 12px',background:'rgba(0,0,0,.05)',borderRadius:8,fontSize:11,color:'var(--stone)'}}>{kw2}</div>
              ))}
            </div>
            <div className="sig-grid" style={{marginBottom:8}}>
              <Sig ok={num(kw.density_pct)>=0.5&&num(kw.density_pct)<=2.5} label={`Density: ${kw.density_pct||0}% (0.5-2.5% ideal)`}/>
              <Sig ok={(kw.placement && kw.placement.in_title)} label="In title"/>
              <Sig ok={(kw.placement && kw.placement.in_h1)} label="In H1"/>
              <Sig ok={(kw.placement && kw.placement.in_meta_description)} label="In meta desc"/>
              <Sig ok={(kw.placement && kw.placement.in_first_100_words)} label="In first 100 words"/>
              <Sig ok={(kw.placement && kw.placement.in_url)} label="In URL"/>
              <Sig ok={!kw.keyword_stuffing_risk} label="No stuffing risk"/>
              <Sig ok={kw.lsi_terms_present} label={<>LSI/related terms<InfoTooltip text="Latent Semantic Indexing: terms conceptually related to your primary keyword that help search engines understand context."/></>}/>
            </div>
            <IssueList issues={kw.issues}/>
          </div>
        </ExpandCard>

        {/* Content Quality */}
        <ExpandCard title="Content Quality" icon="ph-article" score={cq.score} max10={true}>
          <div style={{marginTop:12}}>
            <div className="sig-grid" style={{marginBottom:10}}>
              <Sig ok={num(cq.word_count)>=300} label={`${cq.word_count||0} words (300+ ideal)`}/>
              <Sig ok={cq.readability==='good'||cq.readability==='excellent'} label={`Readability: ${cq.readability||'?'}`}/>
              <Sig ok={!cq.is_thin_content} label="Not thin content"/>
              <Sig ok={!cq.generic_manufacturer_copy} label="Original (not manufacturer copy)"/>
              <Sig ok={cq.has_product_benefits} label="Benefits described"/>
              <Sig ok={cq.has_specs_table} label="Specs/features table"/>
              <Sig ok={cq.has_use_cases} label="Use cases present"/>
            </div>
            <div style={{fontSize:12,color:'var(--stone)'}}>Content depth: <strong style={{color:'var(--dark)'}}>{cq.content_depth||'—'}</strong></div>
            <IssueList issues={cq.issues}/>
          </div>
        </ExpandCard>

        {/* ── Image SEO ─────────────── */}
        <div style={{fontSize:11,fontWeight:700,color:'var(--muted)',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:8,marginTop:20}}>Image SEO</div>

        <ExpandCard title="Images" icon="ph-image" score={im.score} max10={true}>
          <div style={{marginTop:12}}>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:12}}>
              {[
                {label:'Total Images', val:im.total_images||0},
                {label:'Missing ALT', val:im.images_missing_alt||0, warn:num(im.images_missing_alt)>0},
                {label:'Descriptive ALT', val:im.images_with_descriptive_alt||0},
              ].map((s,i)=>(
                <div key={i} style={{background:'rgba(0,0,0,.04)',borderRadius:8,padding:'10px 14px',textAlign:'center'}}>
                  <div style={{fontSize:20,fontWeight:700,color:s.warn?'var(--red)':'var(--dark)'}}>{s.val}</div>
                  <div style={{fontSize:11,color:'var(--muted)'}}>{s.label}</div>
                </div>
              ))}
            </div>
            <div className="sig-grid">
              <Sig ok={im.uses_modern_format} label="WebP/AVIF format"/>
              <Sig ok={im.lazy_loading_detected} label="Lazy loading"/>
              <Sig ok={!im.large_image_risk} label="No large image risk"/>
            </div>
            <IssueList issues={im.issues}/>
          </div>
        </ExpandCard>

        {/* ── Structured Data ─────────── */}
        <div style={{fontSize:11,fontWeight:700,color:'var(--muted)',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:8,marginTop:20}}>
          Structured Data (Schema.org)
          <InfoTooltip text="Hidden code that helps search engines and AI understand your product details like price, reviews, and stock status."/>
        </div>

        <ExpandCard title="Schema Markup" icon="ph-code-block" score={sd.score} defaultOpen={true} max10={true}>
          <div style={{marginTop:12}}>
            {/* Product Schema detail */}
            <div style={{marginBottom:14}}>
              <div style={{fontSize:12,fontWeight:700,color:'var(--stone)',marginBottom:8}}>Product Schema
                {(sd.product_schema && sd.product_schema.present)
                  ? <span className="badge badge-green" style={{marginLeft:8}}>Present</span>
                  : <span className="badge badge-red" style={{marginLeft:8}}>Missing — Critical</span>}
              </div>
              {sd.product_schema && (
                <div className="sig-grid">
                  <Sig ok={sd.product_schema.has_name} label="name"/>
                  <Sig ok={sd.product_schema.has_price} label="price"/>
                  <Sig ok={sd.product_schema.has_availability} label="availability"/>
                  <Sig ok={sd.product_schema.has_sku} label="sku"/>
                  <Sig ok={sd.product_schema.has_brand} label="brand"/>
                  <Sig ok={sd.product_schema.has_description} label="description"/>
                  <Sig ok={sd.product_schema.has_image} label="image"/>
                  <Sig ok={sd.product_schema.has_gtin} label="gtin/barcode"/>
                </div>
              )}
            </div>
            <div className="sig-grid">
              <Sig ok={(sd.review_schema && sd.review_schema.present)} label="Review/Rating schema"/>
              <Sig ok={(sd.review_schema && sd.review_schema.has_aggregate_rating)} label="AggregateRating"/>
              <Sig ok={sd.breadcrumb_schema} label="BreadcrumbList schema"/>
              <Sig ok={sd.faq_schema} label="FAQPage schema"/>
              <Sig ok={sd.organization_schema} label="Organization schema"/>
            </div>
            {arr(sd.missing_schemas).length > 0 && (
              <div style={{marginTop:10,fontSize:12,color:'var(--red)'}}>
                Missing: {sd.missing_schemas.join(', ')}
              </div>
            )}
            <IssueList issues={sd.issues}/>
          </div>
        </ExpandCard>

        {/* ── Technical SEO ─────────── */}
        <div style={{fontSize:11,fontWeight:700,color:'var(--muted)',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:8,marginTop:20}}>Technical SEO</div>

        <ExpandCard title="Technical Signals" icon="ph-wrench" score={tc.score} max10={true}>
          <div style={{marginTop:12}}>
            <div className="sig-grid" style={{marginBottom:12}}>
              <Sig ok={(tc.canonical && tc.canonical.present)} label={<>Canonical URL<InfoTooltip text="Tells search engines which URL is the 'master' version of a page to prevent duplicate content issues."/></>}/>
              <Sig ok={(tc.canonical && tc.canonical.is_self_referencing)} label="Self-referencing canonical"/>
              <Sig ok={(tc.open_graph && tc.open_graph.has_og_title)} label="og:title"/>
              <Sig ok={(tc.open_graph && tc.open_graph.has_og_description)} label="og:description"/>
              <Sig ok={(tc.open_graph && tc.open_graph.has_og_image)} label="og:image"/>
              <Sig ok={(tc.twitter_card && tc.twitter_card.present)} label="Twitter Card"/>
              <Sig ok={tc.ssl_https} label="HTTPS/SSL"/>
              <Sig ok={tc.mobile_viewport} label="Mobile viewport"/>
              <Sig ok={tc.robots_indexable!==false} label="Robots indexable"/>
            </div>
            {/* Core Web Vitals */}
            <div style={{background:'rgba(0,0,0,.03)',borderRadius:8,padding:'10px 14px',marginBottom:8}}>
              <div style={{fontSize:12,fontWeight:700,marginBottom:8}}>
                Core Web Vitals Risk
                <InfoTooltip text="Google's speed metrics: LCP (Loading time), CLS (Visual stability/shifting), INP (Interactivity delay)."/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                {[
                  {label:'LCP', val: (tc.core_web_vitals && tc.core_web_vitals.lcp_risk)},
                  {label:'CLS', val: (tc.core_web_vitals && tc.core_web_vitals.cls_risk)},
                  {label:'INP', val: (tc.core_web_vitals && tc.core_web_vitals.inp_risk)},
                ].map((v,i) => (
                  <div key={i} style={{textAlign:'center',padding:'8px',borderRadius:8,background:v.val==='low'?'var(--green-lt)':v.val==='medium'?'var(--amber-lt)':'var(--red-lt)'}}>
                    <div style={{fontSize:11,color:'var(--muted)'}}>{v.label}</div>
                    <div style={{fontSize:13,fontWeight:700,color:v.val==='low'?'var(--green)':v.val==='medium'?'var(--amber)':'var(--red)', textTransform:'capitalize'}}>{v.val||'?'}</div>
                  </div>
                ))}
              </div>
            </div>
            <IssueList issues={tc.issues}/>
          </div>
        </ExpandCard>

        {/* ── Links ─────────────────── */}
        <div style={{fontSize:11,fontWeight:700,color:'var(--muted)',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:8,marginTop:20}}>Links & Navigation</div>

        <ExpandCard title="Links" icon="ph-link" score={lk.score} max10={true}>
          <div style={{marginTop:12}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:10}}>
              <div style={{background:'rgba(0,0,0,.04)',borderRadius:8,padding:'10px',textAlign:'center'}}>
                <div style={{fontSize:22,fontWeight:700}}>{lk.internal_count||0}</div>
                <div style={{fontSize:11,color:'var(--muted)'}}>Internal Links</div>
              </div>
              <div style={{background:'rgba(0,0,0,.04)',borderRadius:8,padding:'10px',textAlign:'center'}}>
                <div style={{fontSize:22,fontWeight:700}}>{lk.external_count||0}</div>
                <div style={{fontSize:11,color:'var(--muted)'}}>External Links</div>
              </div>
              <div style={{background:lk.has_breadcrumb_nav?'var(--green-lt)':'var(--amber-lt)',borderRadius:8,padding:'10px',textAlign:'center'}}>
                <div style={{fontSize:13,fontWeight:700,color:lk.has_breadcrumb_nav?'var(--green)':'var(--amber)'}}>
                  {lk.has_breadcrumb_nav?'✓':'✗'}
                </div>
                <div style={{fontSize:11,color:'var(--muted)'}}>Breadcrumbs</div>
              </div>
            </div>
            <Sig ok={lk.has_related_products_section} label="Related products section"/>
          </div>
        </ExpandCard>
      </div>

      {/* Quick Wins */}
      {arr(seo.quick_wins).length > 0 && (
        <div style={{marginTop:20,background:'var(--green-lt)',border:'1px solid rgba(90,138,90,.2)',borderRadius:10,padding:'12px 16px'}}>
          <div style={{fontSize:12,fontWeight:700,color:'var(--green)',marginBottom:8}}>
            <i className="ph ph-lightning" style={{marginRight:6}}></i>Quick Wins
          </div>
          {arr(seo.quick_wins).map((w,i) => (
            <div key={i} style={{fontSize:12,color:' #2E5A2E',marginBottom:4}}><span style={{marginRight:6}}>→</span>{w}</div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   AEO TAB
══════════════════════════════════════════════════════ */
window.AEOTab = function AEOTab({ aeo={} }) {
  if (!aeo || Object.keys(aeo).length === 0)
    return <div style={{padding:32,textAlign:'center',color:'var(--muted)'}}>AEO data unavailable</div>;

  const eeat = aeo.eeat || {};
  const rag  = aeo.rag_readiness || {};
  const faq  = aeo.faq_quality   || {};
  const conv = aeo.conversational_readiness || {};
  const sc   = aeo.schema_for_ai || {};
  const bc   = aeo.brand_clarity || {};
  const eng  = aeo.engine_likelihood || {};

  const eeatComponents = [
    { key:'experience',     label:'Experience',      icon:'ph-user-check',  data: eeat.experience },
    { key:'expertise',      label:'Expertise',       icon:'ph-graduation-cap', data: eeat.expertise },
    { key:'authoritativeness',label:'Authority',     icon:'ph-medal',       data: eeat.authoritativeness },
    { key:'trustworthiness',label:'Trustworthiness', icon:'ph-shield-check',data: eeat.trustworthiness },
  ];

  return (
    <div className="fade-in">
      {/* AI Score + Engine Grid */}
      <div style={{display:'grid',gridTemplateColumns:'auto 1fr',gap:24,alignItems:'center',marginBottom:24}}>
        <div style={{position: 'relative'}}>
          <ScoreRing score={window.scaleScore(aeo.ai_visibility_score)} size={100} label="AI Score" />
          <div style={{position: 'absolute', top: 0, right: -10}}>
            <InfoTooltip text="Calculated based on: E-E-A-T (25%), Content Citability (20%), FAQ Quality (20%), Conversational Readiness (15%), AI Schema (10%), Brand Clarity (10%)" />
          </div>
        </div>
        <div>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
            <span className={`badge ${gradeBadgeClass(aeo.ai_visibility_grade||scoreGrade(aeo.ai_visibility_score))}`} style={{fontSize:14,padding:'4px 12px',display:'inline-flex',alignItems:'center'}}>
              Grade {aeo.ai_visibility_grade||scoreGrade(aeo.ai_visibility_score)}
              <InfoTooltip text="Grade A: 8.5-10, Grade B: 7.0-8.4, Grade C: 5.5-6.9, Grade D: 4.0-5.4, Grade F: <4.0" />
            </span>
          </div>
          <div style={{fontSize:12,color:'var(--muted)',marginBottom:10}}>
            AI Engine Likelihood
            <InfoTooltip text="Probability that your product will be cited by these AI search engines based on current content." />
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
            {[
              {label:'Google AI Overview', val:eng.google_ai_overview},
              {label:'ChatGPT',            val:eng.chatgpt},
              {label:'Perplexity',         val:eng.perplexity},
              {label:'Gemini',             val:eng.gemini},
            ].map((e,i) => (
              <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',fontSize:12,padding:'5px 10px',background:'rgba(0,0,0,.03)',borderRadius:8}}>
                <span style={{color:'var(--stone)'}}>{e.label}</span>
                {likelihoodBadge(e.val)}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Engine reasons */}
      {(eng.google_ai_overview_reason||eng.chatgpt_reason||eng.perplexity_reason) && (
        <div style={{background:'rgba(0,0,0,.03)',borderRadius:10,padding:'12px 16px',marginBottom:20,fontSize:12,color:'var(--stone)'}}>
          {eng.google_ai_overview_reason && <div style={{marginBottom:4}}><strong>Google AI Overview:</strong> {eng.google_ai_overview_reason}</div>}
          {eng.chatgpt_reason && <div><strong>ChatGPT/Perplexity:</strong> {eng.chatgpt_reason}</div>}
        </div>
      )}

      {/* ── E-E-A-T ─────────────────── */}
      <div style={{fontSize:11,fontWeight:700,color:'var(--muted)',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:10}}>
        E-E-A-T Assessment
        <InfoTooltip text="Experience, Expertise, Authoritativeness, and Trustworthiness. A Google framework used by AI to evaluate your brand's credibility." />
      </div>

      {/* EEAT overview bars */}
      <div className="card-sm" style={{marginBottom:16}}>
        <div style={{fontSize:12,fontWeight:700,marginBottom:12}}>Overall E-E-A-T Score: <span style={{color:scoreColor(num(eeat.overall_score)*10)}}>{eeat.overall_score||0}/10</span></div>
        {eeatComponents.map(c => (
          <div key={c.key} style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
            <i className={`ph ${c.icon}`} style={{fontSize:14,color:'var(--terra)',width:18}}></i>
            <span style={{fontSize:12,color:'var(--stone)',width:90,flexShrink:0}}>{c.label}</span>
            <div className="eeat-bar-track">
              <div className="eeat-bar-fill" style={{width:`${num((c.data && c.data.score)||0)*10}%`,background:scoreColor(num((c.data && c.data.score)||0)*10)}}></div>
            </div>
            <span style={{fontSize:12,fontWeight:700,color:scoreColor(num((c.data && c.data.score)||0)*10),width:28,textAlign:'right'}}>{(c.data && c.data.score)||0}</span>
          </div>
        ))}
      </div>

      {/* EEAT detail cards */}
      {eeatComponents.map(c => c.data && (
        <ExpandCard key={c.key} title={c.label} icon={c.icon} score={c.data.score} max10={true}>
          <div style={{marginTop:12}}>
            {c.data.explanation && <div style={{fontSize:12,color:'var(--stone)',marginBottom:10,lineHeight:1.6}}>{c.data.explanation}</div>}
            {arr(c.data.signals_found).length>0 && (
              <div style={{marginBottom:8}}>
                <div style={{fontSize:11,fontWeight:600,color:'var(--green)',marginBottom:5}}>✓ Found</div>
                {c.data.signals_found.map((s,i)=>(
                  <div key={i} style={{fontSize:12,color:'var(--stone)',marginBottom:3,paddingLeft:12}}>• {s}</div>
                ))}
              </div>
            )}
            {arr(c.data.signals_missing).length>0 && (
              <div>
                <div style={{fontSize:11,fontWeight:600,color:'var(--red)',marginBottom:5}}>✗ Missing</div>
                {c.data.signals_missing.map((s,i)=>(
                  <div key={i} style={{fontSize:12,color:'var(--stone)',marginBottom:3,paddingLeft:12}}>• {s}</div>
                ))}
              </div>
            )}
          </div>
        </ExpandCard>
      ))}

      {/* ── RAG Readiness ─────────── */}
      <div style={{fontSize:11,fontWeight:700,color:'var(--muted)',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:10,marginTop:20}}>
        RAG Readiness (Can LLMs cite this page?)
        <InfoTooltip text="Retrieval-Augmented Generation. Measures how easily AI models can read, chunk, and extract precise information from your page." />
      </div>

      <ExpandCard title="Content Citability" icon="ph-database" score={rag.score} defaultOpen={true} max10={true}>
        <div style={{marginTop:12}}>
          <div className="sig-grid" style={{marginBottom:10}}>
            <Sig ok={rag.is_citable} label="Page is citable"/>
            <Sig ok={rag.has_unique_content} label="Unique content"/>
            <Sig ok={!rag.is_generic_manufacturer_copy} label="Not generic copy"/>
            <Sig ok={rag.has_unique_value_prop} label="Clear value proposition"/>
            <Sig ok={num(rag.factual_claims_count)>3} label={`${rag.factual_claims_count||0} factual claims`}/>
            <Sig ok={rag.content_chunking_quality==='good'} label={`Chunking: ${rag.content_chunking_quality||'?'}`}/>
          </div>
          <IssueList issues={rag.issues}/>
        </div>
      </ExpandCard>

      {/* ── FAQ Quality ─────────────── */}
      <div style={{fontSize:11,fontWeight:700,color:'var(--muted)',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:10,marginTop:20}}>FAQ & Q&A Quality</div>

      <ExpandCard title="FAQ Section" icon="ph-question" score={faq.score} defaultOpen={!faq.faq_section_present} max10={true}>
        <div style={{marginTop:12}}>
          <div className="sig-grid" style={{marginBottom:10}}>
            <Sig ok={faq.faq_section_present} label="FAQ section exists"/>
            <Sig ok={num(faq.faq_count)>0} label={`${faq.faq_count||0} Q&As`}/>
            <Sig ok={faq.is_conversational} label="Conversational language"/>
            <Sig ok={faq.faq_schema_present} label="FAQPage schema"/>
            <Sig ok={faq.answers_are_direct} label="Direct answers"/>
            <Sig ok={faq.covers_buying_intent} label="Covers buying intent"/>
          </div>
          {!faq.faq_section_present && (
            <div style={{background:'var(--red-lt)',borderRadius:8,padding:'10px 14px',fontSize:12,color:'#8B2E2E',marginBottom:10}}>
              ⚠ No FAQ section found. ChatGPT and Perplexity <strong>cannot cite this page</strong> for question-based queries.
            </div>
          )}
          {arr(faq.suggested_faqs).length>0 && (
            <div style={{marginTop:10}}>
              <div style={{fontSize:12,fontWeight:600,color:'var(--terra)',marginBottom:6}}>Suggested FAQs to add:</div>
              {faq.suggested_faqs.map((q,i)=>(
                <div key={i} style={{fontSize:12,color:'var(--stone)',padding:'6px 10px',background:'rgba(168,181,160,.1)',borderRadius:6,marginBottom:4}}>
                  <i className="ph ph-question" style={{marginRight:6,color:'var(--sage-dk)'}}></i>{q}
                </div>
              ))}
            </div>
          )}
          <IssueList issues={faq.issues}/>
        </div>
      </ExpandCard>

      {/* ── Conversational ────────── */}
      <div style={{fontSize:11,fontWeight:700,color:'var(--muted)',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:10,marginTop:20}}>Conversational Readiness</div>

      <ExpandCard title="Answer Engine Formatting" icon="ph-chat-circle-text" score={conv.score} max10={true}>
        <div style={{marginTop:12}}>
          <div className="sig-grid">
            <Sig ok={conv.has_question_based_headings} label="Question-based headings"/>
            <Sig ok={conv.uses_answer_first_structure} label="Answer-first structure"/>
            <Sig ok={conv.direct_answer_format} label="Direct answer format"/>
            <Sig ok={conv.speakable_schema_present} label="Speakable schema"/>
            <Sig ok={conv.semantic_richness==='high'} label={`Semantic richness: ${conv.semantic_richness||'?'}`}/>
            <Sig ok={conv.natural_language_quality==='good'||conv.natural_language_quality==='excellent'} label={`NL quality: ${conv.natural_language_quality||'?'}`}/>
          </div>
          <IssueList issues={conv.issues}/>
        </div>
      </ExpandCard>

      {/* ── Top AI Queries Missed ── */}
      {arr(aeo.top_ai_queries_missed).length>0 && (
        <React.Fragment>
          <div style={{fontSize:11,fontWeight:700,color:'var(--muted)',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:10,marginTop:20}}>Top AI Queries This Page Misses</div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {aeo.top_ai_queries_missed.map((q,i)=>(
              <div key={i} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,padding:'12px 16px'}}>
                <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
                  <span style={{fontSize:13,fontWeight:700,color:'var(--muted)',width:20,flexShrink:0}}>{i+1}</span>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:'var(--dark)',marginBottom:4}}>"{q.query}"</div>
                    <div style={{fontSize:12,color:'var(--stone)',marginBottom:4}}>{q.reason}</div>
                    {q.fix && <div style={{fontSize:12,color:'var(--terra-dk)',background:'var(--terra-lt)',padding:'4px 10px',borderRadius:6,marginTop:4}}>
                      <i className="ph ph-lightning" style={{marginRight:5}}></i>{q.fix}
                    </div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </React.Fragment>
      )}

      {/* Quick Wins */}
      {arr(aeo.quick_wins).length>0 && (
        <div style={{marginTop:20,background:'var(--green-lt)',border:'1px solid rgba(90,138,90,.2)',borderRadius:10,padding:'12px 16px'}}>
          <div style={{fontSize:12,fontWeight:700,color:'var(--green)',marginBottom:8}}>
            <i className="ph ph-lightning" style={{marginRight:6}}></i>Quick Wins for AI Visibility
          </div>
          {arr(aeo.quick_wins).map((w,i) => (
            <div key={i} style={{fontSize:12,color:'#2E5A2E',marginBottom:4}}><span style={{marginRight:6}}>→</span>{w}</div>
          ))}
        </div>
      )}

      {arr(aeo.category_specific_gaps).length>0 && (
        <div style={{marginTop:16,background:'var(--amber-lt)',border:'1px solid rgba(192,128,32,.2)',borderRadius:10,padding:'12px 16px'}}>
          <div style={{fontSize:12,fontWeight:700,color:'var(--amber)',marginBottom:8}}>
            <i className="ph ph-tag" style={{marginRight:6}}></i>{aeo.category||'Category'}-Specific Gaps
          </div>
          {arr(aeo.category_specific_gaps).map((g,i)=>(
            <div key={i} style={{fontSize:12,color:'var(--stone)',marginBottom:4}}><span style={{marginRight:6}}>•</span>{g}</div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   FIXES TAB
══════════════════════════════════════════════════════ */
window.FixesTab = function FixesTab({ seo={}, aeo={} }) {
  const seoRecs = arr(seo.recommendations||[]);
  const aeoRecs = arr(aeo.recommendations||[]);
  const all = [
    ...seoRecs.map(r=>({...r,source:'SEO'})),
    ...aeoRecs.map(r=>({...r,source:'AEO'})),
  ].sort((a,b) => {
    const order = {high:0,medium:1,low:2};
    return (order[a.impact]||1) - (order[b.impact]||1);
  });

  const high   = all.filter(r=>r.impact==='high');
  const medium = all.filter(r=>r.impact==='medium');
  const low    = all.filter(r=>r.impact==='low');

  return (
    <div className="fade-in">
      <div style={{fontSize:13,color:'var(--stone)',marginBottom:20,lineHeight:1.6}}>
        All recommendations sorted by impact. Click any row to see the exact fix.
      </div>
      {high.length>0 && (
        <React.Fragment>
          <div style={{fontSize:11,fontWeight:700,color:'var(--red)',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:10}}>🔴 High Impact ({high.length})</div>
          <div style={{marginBottom:16}}>
            {high.map((r,i) => <RecoRow key={i} {...r}/>)}
          </div>
        </React.Fragment>
      )}
      {medium.length>0 && (
        <React.Fragment>
          <div style={{fontSize:11,fontWeight:700,color:'var(--amber)',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:10}}>🟡 Medium Impact ({medium.length})</div>
          <div style={{marginBottom:16}}>
            {medium.map((r,i) => <RecoRow key={i} {...r}/>)}
          </div>
        </React.Fragment>
      )}
      {low.length>0 && (
        <React.Fragment>
          <div style={{fontSize:11,fontWeight:700,color:'var(--muted)',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:10}}>🟢 Low Impact ({low.length})</div>
          <div>
            {low.map((r,i) => <RecoRow key={i} {...r}/>)}
          </div>
        </React.Fragment>
      )}
      {all.length===0 && (
        <div style={{textAlign:'center',padding:40,color:'var(--muted)'}}>
          <i className="ph ph-check-circle" style={{fontSize:36,color:'var(--green)',display:'block',marginBottom:10}}></i>
          No recommendations generated yet. Run an analysis first.
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   VIEW: MODE B REPORT — Single PDP
══════════════════════════════════════════════════════ */
window.ModeBReport = function ModeBReport({ result={}, url='', onBack, onPrev, onNext }) {
  const [tab, setTab] = useState('seo');
  const seo = result.seo_report || {};
  const aeo = result.aeo_report || {};
  const pageTitle = result.page_title || seo.page_title || 'Product Page';
  const domain = (() => { try { return new URL(url).hostname; } catch(e) { return url; } })();

  const tabs = [
    { id:'seo',   label:'SEO Analysis',   icon:'ph-magnifying-glass' },
    { id:'aeo',   label:'AEO / AI Visibility', icon:'ph-robot' },
    { id:'brand', label:'Brand Compliance', icon:'ph-shield-check' },
    { id:'fixes', label:'Fixes & Recommendations', icon:'ph-lightning' },
  ];

  return (
    <div style={{minHeight:'100vh',background:'var(--bg)'}}>
      {/* Header */}
      <div style={{background:'var(--surface)',borderBottom:'1px solid var(--border)',padding:'14px 24px'}}>
        <div style={{maxWidth:900,margin:'0 auto'}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
            <button className="btn btn-ghost" style={{padding:'6px 10px'}} onClick={onBack}>
              <i className="ph ph-arrow-left"></i> Back
            </button>
            <i className="ph ph-caret-right" style={{color:'var(--muted)'}}></i>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:700,fontSize:15,color:'var(--ink)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{pageTitle}</div>
              <div style={{fontSize:11,color:'var(--muted)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{url}</div>
            </div>
            {(onPrev !== undefined || onNext !== undefined) && (
              <div style={{display:'flex',alignItems:'center',gap:4, marginLeft: 'auto'}}>
                <button className="btn btn-ghost" style={{padding:'6px 10px'}} onClick={onPrev} disabled={!onPrev}>
                  <i className="ph ph-caret-left"></i> Prev Product
                </button>
                <button className="btn btn-ghost" style={{padding:'6px 10px'}} onClick={onNext} disabled={!onNext}>
                  Next Product <i className="ph ph-caret-right"></i>
                </button>
              </div>
            )}
          </div>
          {/* Score chips */}
          <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
            <div style={{display:'flex',alignItems:'center',gap:6,padding:'6px 14px',background:'rgba(0,0,0,.04)',borderRadius:20}}>
              <i className="ph ph-magnifying-glass" style={{fontSize:14,color:'var(--terra)'}}></i>
              <span style={{fontSize:12,color:'var(--muted)'}}>SEO</span>
              <span style={{fontSize:14,fontWeight:700,color:scoreColor(window.scaleScore(seo.overall_seo_score))}}>{Math.round(window.scaleScore(seo.overall_seo_score))}</span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:6,padding:'6px 14px',background:'rgba(0,0,0,.04)',borderRadius:20}}>
              <i className="ph ph-robot" style={{fontSize:14,color:'var(--sage-dk)'}}></i>
              <span style={{fontSize:12,color:'var(--muted)'}}>AEO</span>
              <span style={{fontSize:14,fontWeight:700,color:scoreColor(window.scaleScore(aeo.ai_visibility_score))}}>{Math.round(window.scaleScore(aeo.ai_visibility_score))}</span>
            </div>
            {seo.brand_compliance && seo.brand_compliance.score && (
              <div style={{display:'flex',alignItems:'center',gap:6,padding:'6px 14px',background:'rgba(0,0,0,.04)',borderRadius:20}}>
                <i className="ph ph-shield-check" style={{fontSize:14,color:'#eab308'}}></i>
                <span style={{fontSize:12,color:'var(--muted)'}}>Brand</span>
                <span style={{fontSize:14,fontWeight:700,color:scoreColor(window.scaleScore(seo.brand_compliance.score))}}>{Math.round(window.scaleScore(seo.brand_compliance.score))}</span>
              </div>
            )}
            <span className="badge badge-steel"><i className="ph ph-globe"></i> {domain}</span>
            {seo.detected_platform && <span className="badge badge-steel">{seo.detected_platform}</span>}
            {(result.category_label || result.category) && (
              <span className="badge" style={{background:'rgba(196,131,110,.15)',color:'var(--terra-dk)',fontSize:12}}>
                {result.category_label || result.category}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{background:'var(--surface)',borderBottom:'1px solid var(--border)',padding:'0 24px'}}>
        <div style={{maxWidth:900,margin:'0 auto',display:'flex',gap:4}}>
          {tabs.map(t => (
            <button key={t.id} className={`tab-pill ${tab===t.id?'active':''}`}
              style={{padding:'12px 16px',borderRadius:0,borderBottom:tab===t.id?'2px solid var(--terra)':'2px solid transparent'}}
              onClick={()=>setTab(t.id)}>
              <i className={`ph ${t.icon}`} style={{marginRight:6}}></i>{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{maxWidth:900,margin:'0 auto',padding:'24px 24px 60px'}}>
        {tab==='seo'   && <SEOTab   seo={seo} url={url}/>}
        {tab==='aeo'   && <AEOTab   aeo={aeo}/>}
        {tab==='brand' && <BrandTab seo={seo}/>}
        {tab==='fixes' && <FixesTab seo={seo} aeo={aeo}/>}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   VIEW: MODE A — SITE OVERVIEW
══════════════════════════════════════════════════════ */
window.SiteOverviewView = function SiteOverviewView({ siteData={}, products=[], onCategoryClick, onBack }) {
  const categories = siteData.categories || [];
  
  const analyzedCount = products.length || siteData.products_analyzed || 0;
  
  let avgSeoRaw = siteData.avg_seo_score || 0;
  let avgAeoRaw = siteData.avg_aeo_score || 0;
  
  if (products.length > 0) {
    avgSeoRaw = products.reduce((acc, p) => acc + (p.seo_score || 0), 0) / products.length;
    avgAeoRaw = products.reduce((acc, p) => acc + (p.aeo_score || 0), 0) / products.length;
  }
  
  const avgSeo = avgSeoRaw <= 10 && avgSeoRaw > 0 ? avgSeoRaw * 10 : avgSeoRaw;
  const avgAeo = avgAeoRaw <= 10 && avgAeoRaw > 0 ? avgAeoRaw * 10 : avgAeoRaw;

  return (
    <div style={{minHeight:'100vh',background:'var(--bg)'}}>
      {/* Header */}
      <div style={{background:'var(--surface)',borderBottom:'1px solid var(--border)',padding:'14px 24px'}}>
        <div style={{maxWidth:900,margin:'0 auto',display:'flex',alignItems:'center',gap:8}}>
          <button className="btn btn-ghost" style={{padding:'6px 10px'}} onClick={onBack}>
            <i className="ph ph-house"></i> Home
          </button>
          <i className="ph ph-caret-right" style={{color:'var(--muted)'}}></i>
          <div style={{fontWeight:600, fontSize:15}}>{siteData.domain}</div>
          <div style={{marginLeft:'auto', fontSize:11,color:'var(--muted)'}}>Site Audit · Mode A</div>
        </div>
      </div>

      <div style={{maxWidth:900,margin:'0 auto',padding:'24px'}}>
        {/* Site summary cards */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:24}}>
          {[
            {label:'Categories', val:categories.length, icon:'ph-folders', color:'var(--terra)'},
            {label:'Products Analyzed', val:analyzedCount, icon:'ph-tag', color:'var(--sage-dk)'},
            {label:'Avg SEO Score', val:Math.round(avgSeo), icon:'ph-magnifying-glass', color:scoreColor(avgSeo)},
            {label:'Avg AEO Score', val:Math.round(avgAeo), icon:'ph-robot', color:scoreColor(avgAeo)},
          ].map((s,i)=>(
            <div key={i} className="card" style={{textAlign:'center'}}>
              <i className={`ph ${s.icon}`} style={{fontSize:22,color:s.color,marginBottom:6,display:'block'}}></i>
              <div style={{fontSize:26,fontWeight:700,color:'var(--dark)'}}>{s.val}</div>
              <div style={{fontSize:11,color:'var(--muted)'}}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Top Issues */}
        {arr(siteData.top_issues).length>0 && (
          <div style={{background:'var(--amber-lt)',border:'1px solid rgba(192,128,32,.2)',borderRadius:10,padding:'14px 18px',marginBottom:24}}>
            <div style={{fontSize:12,fontWeight:700,color:'var(--amber)',marginBottom:8}}>
              <i className="ph ph-warning" style={{marginRight:6}}></i>Top Issues Across Your Catalog
            </div>
            {siteData.top_issues.map((iss,i) => (
              <div key={i} style={{fontSize:12,color:'var(--stone)',marginBottom:4}}><span style={{marginRight:6}}>•</span>{iss}</div>
            ))}
          </div>
        )}

        {/* Category Grid */}
        <div style={{marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:700,color:'var(--muted)',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:4}}>
            Categories ({categories.length})
          </div>
          {siteData.categories_found > 10 && (
            <div style={{fontSize:12,color:'var(--stone)'}}>
              We have found {siteData.categories_found} categories but we have analyzed only 10 due to limit.
            </div>
          )}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:14}}>
          {categories.map((cat, i) => {
            const isAllProducts = cat.name.toLowerCase().includes('all products');
            const catProds = isAllProducts ? products : products.filter(p => 
              p.category_names?.includes(cat.name) || 
              p.category === cat.name || 
              p.category_name === cat.name
            );
            const validProds = catProds.filter(p => p.seo_score > 0);
            
            const summedTotal = categories
              .filter(c => !c.name.toLowerCase().includes('all products'))
              .reduce((acc, c) => acc + (c.product_count || 0), 0);
            
            let avgS = null;
            let avgA = null;
            if (validProds.length > 0) {
              const scale = v => (v > 0 && v <= 1.0) ? v * 100 : (v > 1.0 && v <= 10 ? v * 10 : v);
              const sScores = validProds.map(p => scale(p.seo_score || 0));
              const aScores = validProds.map(p => scale(p.aeo_score || 0));
              avgS = sScores.reduce((a, b) => a + b, 0) / sScores.length;
              avgA = aScores.reduce((a, b) => a + b, 0) / aScores.length;
            }

            return (
              <div key={i} className="card fade-up" style={{cursor:'pointer',animationDelay:`${i*0.05}s`,transition:'box-shadow .15s,transform .15s'}}
                onClick={()=>onCategoryClick(cat)}
                onMouseEnter={e=>{e.currentTarget.style.boxShadow='0 4px 20px rgba(0,0,0,.08)';e.currentTarget.style.transform='translateY(-2px)'}}
                onMouseLeave={e=>{e.currentTarget.style.boxShadow='';e.currentTarget.style.transform=''}}>
                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:12}}>
                  <div style={{width:36,height:36,borderRadius:9,background:'var(--terra-lt)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <i className="ph ph-folder" style={{fontSize:18,color:'var(--terra)'}}></i>
                  </div>
                  <i className="ph ph-arrow-right" style={{fontSize:16,color:'var(--muted)'}}></i>
                </div>
                <div style={{fontWeight:700,fontSize:14,marginBottom:4}}>{cat.name}</div>
                <div style={{fontSize:12,color:'var(--muted)',marginBottom:12}}>
                  {isAllProducts ? summedTotal : cat.product_count} products
                  {validProds.length > 0 && <span style={{marginLeft: 4, color:'var(--sage-dk)', fontWeight:600}}>({validProds.length} analyzed)</span>}
                  {(cat.product_count > 5) && (
                     <div style={{marginTop: 4, fontSize: 11, color: 'var(--stone)', lineHeight: 1.4}}>
                       In this category {cat.product_count} products are there but right now we have analyzed only {validProds.length || 0} due to limit.
                     </div>
                  )}
                </div>
                <div style={{display:'flex',gap:10}}>
                  {avgS!==null && (
                    <div style={{fontSize:11,fontWeight:600,color:scoreColor(avgS)}}>
                      SEO {Math.round(avgS)}
                    </div>
                  )}
                  {avgA!==null && (
                    <div style={{fontSize:11,fontWeight:600,color:scoreColor(avgA)}}>
                      AEO {Math.round(avgA)}
                    </div>
                  )}
                  {avgS===null && avgA===null && <div style={{fontSize:11,color:'var(--muted)'}}>Waiting for analysis...</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   VIEW: MODE A — PRODUCT LIST
══════════════════════════════════════════════════════ */
window.ProductListView = function ProductListView({ category={}, products=[], onProductClick, onBack }) {
  const isAllProducts = category.name && category.name.toLowerCase().includes('all products');
  const catProducts = isAllProducts ? products : products.filter(p => 
    p.category_names?.includes(category.name) || 
    p.category === category.name || 
    p.category_name === category.name
  );

  return (
    <div style={{minHeight:'100vh',background:'var(--bg)'}}>
      <div style={{background:'var(--surface)',borderBottom:'1px solid var(--border)',padding:'14px 24px'}}>
        <div style={{maxWidth:900,margin:'0 auto',display:'flex',alignItems:'center',gap:8}}>
          <button className="btn btn-ghost" style={{padding:'6px 10px'}} onClick={onBack}>
            <i className="ph ph-arrow-left"></i> Overview
          </button>
          <i className="ph ph-caret-right" style={{color:'var(--muted)'}}></i>
          <div style={{fontWeight:600, fontSize:15}}>{category.name}</div>
          <div style={{marginLeft: 'auto', fontSize:12,color:'var(--muted)'}}>{catProducts.length} products analyzed</div>
        </div>
      </div>

      <div style={{maxWidth:900,margin:'0 auto',padding:'24px'}}>
        {catProducts.length === 0 ? (
          <div style={{textAlign:'center',padding:48,color:'var(--muted)'}}>
            <i className="ph ph-hourglass" style={{fontSize:36,display:'block',marginBottom:10}}></i>
            Analyzing products… check back in a moment.
          </div>
        ) : (
          <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:14,overflow:'hidden'}}>
            {/* Table header */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 60px 60px 80px 80px 120px',gap:12,padding:'12px 18px',borderBottom:'1px solid var(--border)',fontSize:11,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.05em'}}>
              <div>Product</div>
              <div style={{textAlign:'center'}}>SEO</div>
              <div style={{textAlign:'center'}}>AEO</div>
              <div style={{textAlign:'center'}}>SEO Grade</div>
              <div style={{textAlign:'center'}}>AEO Grade</div>
              <div></div>
            </div>
            {catProducts.map((p,i) => {
              const scale = v => (v > 0 && v <= 1.0) ? v * 100 : (v > 1.0 && v <= 10 ? v * 10 : v);
              const sScore = scale(p.seo_score || 0);
              const aScore = scale(p.aeo_score || 0);
              
              return (
              <div key={i} style={{display:'grid',gridTemplateColumns:'1fr 60px 60px 80px 80px 120px',gap:12,padding:'14px 18px',borderBottom:'1px solid var(--border-lt)',alignItems:'center',cursor:'pointer',transition:'background .1s'}}
                onClick={()=>onProductClick(p)}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(184,166,138,.05)'}
                onMouseLeave={e=>e.currentTarget.style.background=''}>
                <div style={{minWidth: 0}}>
                  <div style={{fontWeight:600,fontSize:13,marginBottom:3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name||'Product'}</div>
                  <div style={{fontSize:11,color:'var(--muted)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.url}</div>
                  {arr(p.critical_issues).slice(0,1).map((iss,j)=>(
                    <div key={j} style={{fontSize:10,color:'var(--amber)',marginTop:3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>⚠ {iss}</div>
                  ))}
                </div>
                <div style={{textAlign:'center',fontWeight:700,fontSize:14,color:scoreColor(sScore)}}>{Math.round(sScore)}</div>
                <div style={{textAlign:'center',fontWeight:700,fontSize:14,color:scoreColor(aScore)}}>{Math.round(aScore)}</div>
                <div style={{textAlign:'center'}}>
                  <span className={`badge ${gradeBadgeClass(p.seo_grade)}`}>{p.seo_grade||'?'}</span>
                </div>
                <div style={{textAlign:'center'}}>
                  <span className={`badge ${gradeBadgeClass(p.aeo_grade)}`}>{p.aeo_grade||'?'}</span>
                </div>
                <button className="btn btn-outline" style={{padding:'6px 12px',fontSize:12, justifySelf:'end'}}>
                  View Report <i className="ph ph-arrow-right"></i>
                </button>
              </div>
            )})}
          </div>
        )}
      </div>
    </div>
  );
}
