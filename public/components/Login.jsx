window.LoginView = function LoginView({ authError }) {
  const loginWithGoogle = () => {
    window.location.href = '/api/v1/auth/google/login';
  };

  return (
    <div className="app-layout" style={{alignItems:'center', justifyContent:'center'}}>
      <div style={{display:'flex', width:'100%', maxWidth:1100, gap:80, alignItems:'center', padding:40}}>
        
        {/* Left Side: Marketing / Branding */}
        <div style={{flex:1}}>
          <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:40}}>
            <div style={{background:'var(--accent)', color:'white', width:40, height:40, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center'}}>
              <i className="ph ph-shopping-bag" style={{fontSize:20}}></i>
            </div>
            <h2 style={{fontSize:24, margin:0}}>Organic360 <span style={{fontWeight:400, fontSize:22}}>by Clarity HQ</span></h2>
          </div>

          <h1 className="title-hero">
            Turn Any Product Page Into<br/>
            <span>Actionable Growth Insights</span>
          </h1>
          <p className="subtitle-hero">
            Analyze SEO, AI visibility, UX, conversion psychology and competitors in minutes — with fixes ready to ship.
          </p>

          <div className="features-grid">
            <div className="feature-card">
              <i className="ph ph-magnifying-glass"></i>
              <h4>SEO Audit</h4>
              <p>Rankings & structure</p>
            </div>
            <div className="feature-card">
              <i className="ph ph-robot"></i>
              <h4>AI Visibility</h4>
              <p>LLM discoverability</p>
            </div>
            <div className="feature-card">
              <i className="ph ph-shopping-cart"></i>
              <h4>Conversion UX</h4>
              <p>PDP heuristics</p>
            </div>
            <div className="feature-card">
              <i className="ph ph-wrench"></i>
              <h4>AutoFix</h4>
              <p>Copy-paste fixes</p>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Box */}
        <div style={{width: 400}}>
          <div className="card" style={{padding:0, overflow:'hidden'}}>
            <div style={{display:'flex', borderBottom:'1px solid var(--border)'}}>
              <div style={{flex:1, textAlign:'center', padding:'16px', fontWeight:600, color:'var(--accent)', borderBottom:'2px solid var(--accent)'}}>
                Sign In
              </div>
              <div style={{flex:1, textAlign:'center', padding:'16px', fontWeight:500, color:'var(--text-muted)'}}>
                Sign Up
              </div>
            </div>
            <div style={{padding:40, textAlign:'center'}}>
              {authError && (
              <div style={{background:'#fde8e8',color:'#c0392b',padding:'10px 14px',borderRadius:8,fontSize:13,marginBottom:16,textAlign:'left'}}>
                <i className="ph ph-warning" style={{marginRight:6}}></i>{authError}
              </div>
            )}
              <button className="btn btn-google" onClick={loginWithGoogle}>
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" width="20" height="20" style={{marginRight:10}} />
                Continue with Google
              </button>
              <p style={{fontSize:12, color:'var(--text-muted)', marginTop:20}}>
                Google creates your account automatically on first sign-in.
              </p>
            </div>
          </div>
          <div style={{textAlign:'center', marginTop:24, fontSize:13, color:'var(--accent-light)'}}>
            Enterprise-grade AI commerce optimization
          </div>
        </div>
      </div>
    </div>
  );
};
