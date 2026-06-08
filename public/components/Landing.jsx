const { useState } = React;

window.LandingView = function LandingView({ onAnalyze }) {
  const [url, setUrl] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (url.trim()) {
      onAnalyze(url.trim());
    }
  };

  return (
    <div style={{height:'100%', display:'flex', alignItems:'center'}}>
      <div className="card" style={{width:'100%', maxWidth:800, margin:'0 auto', padding:60}}>
        <div style={{display:'flex', alignItems:'center', gap:8, color:'var(--accent)', fontSize:12, fontWeight:600, letterSpacing:1, textTransform:'uppercase', marginBottom:24}}>
          <i className="ph ph-shopping-bag"></i>
          Organic360 by Clarity HQ
        </div>
        
        <h1 style={{fontFamily:'Playfair Display, serif', fontSize:48, lineHeight:1.1, letterSpacing:'-1px', marginBottom:16}}>
          Turn Any Product Page Into<br/>Actionable Growth Insights
        </h1>
        <p style={{fontSize:18, color:'var(--text-muted)', marginBottom:40, maxWidth:600}}>
          Analyze SEO, AI visibility, UX, conversion psychology and competitors in minutes — with fixes ready to ship.
        </p>

        <form onSubmit={submit} className="analyze-bar">
          <i className="ph ph-globe" style={{color:'var(--accent)', marginLeft:8}}></i>
          <input 
            type="text" 
            placeholder="Paste your product page URL..." 
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" style={{padding:'14px 24px'}}>
            <i className="ph ph-lightning"></i>
            Run Analysis
          </button>
        </form>
        <div style={{fontSize:12, color:'var(--text-muted)', marginTop:16, textAlign:'center'}}>
          Paste a <strong>homepage URL</strong> for full site audit · <strong>category URL</strong> for category audit · <strong>product URL</strong> for single page audit — auto-detected.
        </div>
      </div>
    </div>
  );
};
