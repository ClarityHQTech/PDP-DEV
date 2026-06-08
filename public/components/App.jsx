const { useState, useEffect, useRef } = React;

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() { 
    if (this.state.hasError) return <div style={{padding: 40, color: 'red', background: '#fff', height: '100vh'}}><h1>React Crashed</h1><pre>{this.state.error.stack}</pre></div>; 
    return this.props.children; 
  }
}

window.App = () => (
  <ErrorBoundary>
    <AppContent />
  </ErrorBoundary>
);

const AppContent = () => {
  const [user,             setUser]             = useState(null);
  const [token,            setToken]            = useState(null);
  const [authError,        setAuthError]        = useState('');
  const [activeTab,        setActiveTab]        = useState('audit');
  const [isInitializing,   setIsInitializing]   = useState(true);
  const [publicReportData, setPublicReportData] = useState(null);
  const [publicAuditData,  setPublicAuditData]  = useState(null);

  const VIEWS = {
    LOGIN:                'LOGIN',
    LANDING:              'LANDING',
    HISTORY:              'HISTORY',
    ANALYZING:            'ANALYZING',
    MODE_B_REPORT:        'MODE_B_REPORT',
    MODE_A_CRAWLING:      'MODE_A_CRAWLING',
    MODE_A_OVERVIEW:      'MODE_A_OVERVIEW',
    MODE_A_PRODUCTS:      'MODE_A_PRODUCTS',
    MODE_A_PRODUCT_REPORT:'MODE_A_PRODUCT_REPORT',
  };

  const [view,             setView]             = useState(VIEWS.LANDING);
  const [currentUrl,       setCurrentUrl]       = useState('');
  const [analyzeSteps,     setAnalyzeSteps]     = useState([]);
  const [analyzePct,       setAnalyzePct]       = useState(0);
  const [analyzeStep,      setAnalyzeStep]      = useState('');
  const [modeBResult,      setModeBResult]      = useState(null);
  const [siteData,         setSiteData]         = useState(null);
  const [allProducts,      setAllProducts]      = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [sidebarWidth,     setSidebarWidth]     = useState(260);

  const abortRef = useRef(null);

  // ── BROWSER HISTORY: push state snapshot ──────────────────────────────────
  // Call this instead of setView() for every "real" page navigation.
  // Transient views (ANALYZING, MODE_A_CRAWLING) skip pushState so the user
  // can't "back" into a loading spinner.
  const TRANSIENT_VIEWS = new Set([VIEWS.ANALYZING, VIEWS.MODE_A_CRAWLING]);

  const navigateTo = (newView, extras = {}) => {
    const nextCurrentUrl = 'currentUrl' in extras ? extras.currentUrl : currentUrl;
    const nextModeBResult = 'modeBResult' in extras ? extras.modeBResult : modeBResult;
    const nextSiteData = 'siteData' in extras ? extras.siteData : siteData;
    const nextAllProducts = 'allProducts' in extras ? extras.allProducts : allProducts;
    const nextSelectedCategory = 'selectedCategory' in extras ? extras.selectedCategory : selectedCategory;
    const nextActiveTab = 'activeTab' in extras ? extras.activeTab : activeTab;

    let nextUrlString = window.location.pathname.replace(/\/index\.html$/, '/');
    if (newView === VIEWS.LANDING || newView === VIEWS.HISTORY || newView === VIEWS.LOGIN) {
      // keep clean path
    } else if (newView === VIEWS.MODE_B_REPORT && nextModeBResult && nextModeBResult.report_id) {
      nextUrlString += '?report_id=' + encodeURIComponent(nextModeBResult.report_id);
    } else if ((newView === VIEWS.MODE_A_OVERVIEW || newView === VIEWS.MODE_A_PRODUCTS || newView === VIEWS.MODE_A_PRODUCT_REPORT) && nextSiteData && nextSiteData.audit_id) {
      nextUrlString += '?audit_id=' + encodeURIComponent(nextSiteData.audit_id);
    } else if (nextCurrentUrl) {
      nextUrlString += '?url=' + encodeURIComponent(nextCurrentUrl);
    }

    if (!TRANSIENT_VIEWS.has(newView)) {
      const snapshot = {
        view:             newView,
        currentUrl:       nextCurrentUrl,
        modeBResult:      nextModeBResult,
        siteData:         nextSiteData,
        allProducts:      nextAllProducts,
        selectedCategory: nextSelectedCategory,
        activeTab:        nextActiveTab,
      };
      try {
        window.history.pushState(snapshot, '', nextUrlString);
      } catch (e) {
        // State too large (unlikely) — fall back silently
        window.history.pushState({ view: newView }, '', nextUrlString);
      }
    }

    if ('currentUrl'       in extras) setCurrentUrl(extras.currentUrl);
    if ('modeBResult'      in extras) setModeBResult(extras.modeBResult);
    if ('siteData'         in extras) setSiteData(extras.siteData);
    if ('allProducts'      in extras) setAllProducts(extras.allProducts);
    if ('selectedCategory' in extras) setSelectedCategory(extras.selectedCategory);
    if ('activeTab'        in extras) setActiveTab(extras.activeTab);
    setView(newView);
  };

  // ── BROWSER HISTORY: listen for back / forward ────────────────────────────
  useEffect(() => {
    const onPop = (e) => {
      const s = e.state;
      if (!s || !s.view) {
        setView(VIEWS.LANDING);
        setActiveTab('audit');
        return;
      }
      // Restore all state from snapshot
      setCurrentUrl(       s.currentUrl       ?? '');
      setModeBResult(      s.modeBResult       ?? null);
      setSiteData(         s.siteData          ?? null);
      setAllProducts(      s.allProducts       ?? []);
      setSelectedCategory( s.selectedCategory  ?? null);
      setActiveTab(        s.activeTab         ?? 'audit');
      setView(s.view);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // ── Set initial history entry so back-button works from first view ─────────
  useEffect(() => {
    window.history.replaceState(
      { view: VIEWS.LANDING, currentUrl: '', modeBResult: null,
        siteData: null, allProducts: [], selectedCategory: null, activeTab: 'audit' },
      ''
    );
  }, []);

  // ── Auth init ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const params    = new URLSearchParams(window.location.search);
    const success   = params.get('auth_success');
    const urlToken  = params.get('token');
    const errParam  = params.get('auth_error');
    const reportId  = params.get('report_id');
    const auditId   = params.get('audit_id');

    if (success || errParam) {
      const cleanPath = window.location.pathname.replace(/\/index\.html$/, '/');
      window.history.replaceState({}, document.title, cleanPath);
    }

    if (reportId) {
      fetch(`/api/v1/history/public-report/${reportId}`)
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(data => { 
          setPublicReportData(data); 
          setIsInitializing(false); 
          setView(VIEWS.MODE_B_REPORT);
        })
        .catch(() => doAuthInit(success, urlToken, errParam));
    } else if (auditId) {
      fetch(`/api/v1/history/public-audit/${auditId}`)
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(data => { 
          setPublicAuditData(data); 
          setIsInitializing(false);
          setView(VIEWS.MODE_A_OVERVIEW);
        })
        .catch(() => doAuthInit(success, urlToken, errParam));
    } else {
      doAuthInit(success, urlToken, errParam);
    }
  }, []);

  useEffect(() => {
    if (publicReportData && view === VIEWS.MODE_B_REPORT) {
      window.history.replaceState(
        { view: VIEWS.MODE_B_REPORT, currentUrl: '', modeBResult: null,
          siteData: null, allProducts: [], selectedCategory: null, activeTab: 'audit' },
        '', window.location.href
      );
    }
  }, [publicReportData, view]);

  useEffect(() => {
    if (publicAuditData && view === VIEWS.MODE_A_OVERVIEW) {
      window.history.replaceState(
        { view: VIEWS.MODE_A_OVERVIEW, currentUrl: '', modeBResult: null,
          siteData: null, allProducts: [], selectedCategory: null, activeTab: 'audit' },
        '', window.location.href
      );
    }
  }, [publicAuditData, view]);

  const doAuthInit = (success, urlToken, errParam) => {
    if (errParam) {
      const msgs = {
        missing_code:          'Google sign-in failed — no authorisation code received.',
        invalid_state:         'Security check failed. Please try signing in again.',
        token_exchange_failed: 'Google token exchange failed. Please try again.',
        no_access_token:       'Could not retrieve access token from Google.',
        userinfo_failed:       'Could not retrieve your profile from Google.',
        invalid_profile:       'Google returned an incomplete profile.',
      };
      setAuthError(msgs[errParam] || `Sign-in error: ${errParam}`);
      setIsInitializing(false);
      return;
    }
    if (success === '1' && urlToken) {
      sessionStorage.setItem('auth_token', urlToken);
      fetchUser(urlToken);
    } else {
      const stored = sessionStorage.getItem('auth_token');
      if (stored) fetchUser(stored); else setIsInitializing(false);
    }
  };

  const fetchUser = async (t) => {
    try {
      const res = await fetch('/api/v1/auth/me', { headers: { Authorization: `Bearer ${t}` } });
      if (res.ok) {
        const data = await res.json();
        setUser(data); setToken(t);
        sessionStorage.setItem('auth_user', JSON.stringify(data));
      } else {
        sessionStorage.removeItem('auth_token');
        setAuthError('Session expired. Please sign in again.');
      }
    } catch (e) {
      console.error('fetchUser', e);
    } finally {
      setIsInitializing(false);
    }
  };

  // ── Tab switch ────────────────────────────────────────────────────────────
  const handleTabChange = (tab) => {
    navigateTo(tab === 'history' ? VIEWS.HISTORY : VIEWS.LANDING, { activeTab: tab });
  };

  // ── Main analyse flow ─────────────────────────────────────────────────────
  const onAnalyze = async (url) => {
    setCurrentUrl(url);
    setAnalyzeSteps([]); setAnalyzePct(0); setAnalyzeStep('');

    const t = sessionStorage.getItem('auth_token');
    try {
      const dres = await fetch('/api/v1/detect-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ url }),
      });
      const { mode } = await dres.json();

      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      if (mode === 'B') {
        // Transient — no pushState
        setView(VIEWS.ANALYZING);
        let finalResult = null;

        await window.streamSSE('/api/v1/analyze/pdp/stream', { url }, t, (event, data) => {
          if (event === 'progress') {
            setAnalyzeStep(data.step || '');
            setAnalyzePct(data.pct  || 0);
            setAnalyzeSteps(s => [...s, data.message || ''].slice(-8));
          } else if (event === 'category_detected') {
            setAnalyzeSteps(s => [...s, `Category detected: ${data.label}`].slice(-8));
          } else if (event === 'complete') {
            finalResult = data;
          } else if (event === 'error') {
            setView(VIEWS.LANDING);
          }
        }, abortRef.current.signal);

        if (finalResult) {
          navigateTo(VIEWS.MODE_B_REPORT, { modeBResult: finalResult, currentUrl: url });
        }
      } else {
        // Mode A — transient crawl view
        setAllProducts([]); setSiteData(null);
        setView(VIEWS.MODE_A_CRAWLING);
        let currentSiteData = null;
        const collectedProducts = [];

        await window.streamSSE('/api/v1/site/audit/stream', { url }, t, (event, data) => {
          if (event === 'progress') {
            setAnalyzeStep(data.step || 'crawling');
            setAnalyzePct(data.pct  || 0);
            setAnalyzeSteps(s => [...s, data.message || ''].slice(-8));
          } else if (event === 'site_overview') {
            currentSiteData = data;
          } else if (event === 'product_done') {
            collectedProducts.push(data);
          } else if (event === 'complete') {
            const finalSite = { ...currentSiteData, ...data };
            navigateTo(VIEWS.MODE_A_OVERVIEW, { 
              siteData: finalSite, 
              allProducts: collectedProducts, 
              currentUrl: url 
            });
          } else if (event === 'error') {
            setView(VIEWS.LANDING);
          }
        }, abortRef.current.signal);
      }
    } catch (e) {
      if (e.name !== 'AbortError') { setView(VIEWS.LANDING); }
    }
  };

  // ── History view report ───────────────────────────────────────────────────
  const onViewReport = (item) => {
    const rd = item.result_data;
    if (item.mode.includes('Product')) {
      rd.report_id = item.id;
      navigateTo(VIEWS.MODE_B_REPORT, { modeBResult: rd, currentUrl: item.url });
    } else {
      const restoredSite = {
        audit_id:          item.id,
        domain:            rd.domain       || item.url,
        homepage_url:      rd.homepage_url || item.url,
        categories_found:  rd.categories_found  || 0,
        total_products:    rd.total_products     || 0,
        products_analyzed: rd.products_analyzed  || 0,
        avg_seo_score:     rd.avg_seo_score      || 0,
        avg_aeo_score:     rd.avg_aeo_score      || 0,
        top_issues:        rd.top_issues         || [],
        categories:        rd.categories         || [],
      };
      navigateTo(VIEWS.MODE_A_OVERVIEW, {
        siteData:    restoredSite,
        allProducts: rd.products || [],
        currentUrl:  item.url,
      });
    }
  };

  // ── Loading spinner ───────────────────────────────────────────────────────
  if (isInitializing) return (
    <div style={{height:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg-gradient)'}}>
      <div className="spinner" style={{width:40,height:40,border:'3px solid var(--border)',borderTopColor:'var(--accent)'}}></div>
    </div>
  );

  // ── Public report (shareable link) ────────────────────────────────────────
  if (publicReportData) return (
    <div className="app-layout" style={{background:'var(--bg-gradient)'}}>
      {isAuthenticated && (
        <window.Sidebar currentView={view} setView={navigateTo} onSignOut={handleSignOut} />
      )}
      <div className="main-content" style={{maxWidth:1200,margin:'0 auto',width:'100%',height:'100vh',overflowY:'auto'}}>
        {!isAuthenticated && (
          <div style={{marginBottom:20,marginTop:20,padding:'0 20px'}}>
            <button className="btn btn-outline" onClick={() => window.history.back()}>
              <i className="ph ph-arrow-left"></i> Back
            </button>
          </div>
        )}
        <window.ModeBReport result={publicReportData} />
      </div>
    </div>
  );

  // ── Public audit (shareable link) ─────────────────────────────────────────
  if (publicAuditData) return (
    <div className="app-layout" style={{background:'var(--bg-gradient)'}}>
      {isAuthenticated && (
        <window.Sidebar currentView={view} setView={navigateTo} onSignOut={handleSignOut} />
      )}
      <div className="main-content" style={{maxWidth:1200,margin:'0 auto',width:'100%',height:'100vh',overflowY:'auto'}}>
        {!isAuthenticated && (
          <div style={{marginBottom:20,marginTop:20,padding:'0 20px'}}>
            <button className="btn btn-outline" onClick={() => window.history.back()}>
              <i className="ph ph-arrow-left"></i> Back
            </button>
          </div>
        )}
        {view === VIEWS.MODE_A_OVERVIEW && (
          <window.SiteOverviewView
            siteData={publicAuditData}
            products={publicAuditData.products}
            onCategoryClick={(cat) => navigateTo(VIEWS.MODE_A_PRODUCTS, { selectedCategory: cat })}
          />
        )}
        {view === VIEWS.MODE_A_PRODUCTS && selectedCategory && (
          <window.ProductListView
            category={selectedCategory}
            products={publicAuditData.products}
            onProductClick={(p) => navigateTo(VIEWS.MODE_B_REPORT, {
              modeBResult: { page_title:p.name, seo_report:p.seo_report||{}, aeo_report:p.aeo_report||{}, category:p.category||'' },
              currentUrl: p.url,
            })}
            onBack={() => window.history.back()}
          />
        )}
        {view === VIEWS.MODE_B_REPORT && modeBResult && (
          <window.ModeBReport result={modeBResult} url={modeBResult.url} onBack={() => window.history.back()} />
        )}
      </div>
    </div>
  );

  if (!user || !token) return <window.LoginView authError={authError} />;

  // ── Main layout ───────────────────────────────────────────────────────────
  return (
    <div className="app-layout" style={{'--sidebar-w': `${sidebarWidth}px`}}>
      <window.Sidebar activeTab={activeTab} onTabChange={handleTabChange} user={user} />

      <div
        className="sidebar-resizer"
        onMouseDown={(e) => {
          e.preventDefault();
          const startX = e.clientX, startW = sidebarWidth;
          const onMove = (ev) => setSidebarWidth(Math.max(200, Math.min(600, startW + (ev.clientX - startX))));
          const onUp   = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); document.body.style.cursor='default'; };
          document.addEventListener('mousemove', onMove);
          document.addEventListener('mouseup', onUp);
          document.body.style.cursor = 'col-resize';
        }}
      />

      <div className="main-content">
        {view === VIEWS.LANDING  && <window.LandingView onAnalyze={onAnalyze} />}
        {view === VIEWS.HISTORY  && <window.HistoryView onViewReport={onViewReport} />}

        {view === VIEWS.ANALYZING && (
          <window.AnalyzingView steps={analyzeSteps} currentStep={analyzeStep} pct={analyzePct} url={currentUrl} mode="B" />
        )}

        {view === VIEWS.MODE_A_CRAWLING && (
          <window.AnalyzingView steps={analyzeSteps} currentStep={analyzeStep} pct={analyzePct} url={currentUrl} mode="A" />
        )}

        {view === VIEWS.MODE_B_REPORT && modeBResult && (
          <window.ModeBReport
            result={modeBResult}
            url={currentUrl}
            onBack={() => window.history.back()}
          />
        )}

        {view === VIEWS.MODE_A_OVERVIEW && siteData && (
          <window.SiteOverviewView
            siteData={siteData}
            products={allProducts}
            onCategoryClick={(cat) => navigateTo(VIEWS.MODE_A_PRODUCTS, { selectedCategory: cat })}
            onBack={() => window.history.back()}
          />
        )}

        {view === VIEWS.MODE_A_PRODUCTS && selectedCategory && (
          <window.ProductListView
            category={selectedCategory}
            products={allProducts}
            onProductClick={(p) => navigateTo(VIEWS.MODE_A_PRODUCT_REPORT, {
              modeBResult: { page_title:p.name, seo_report:p.seo_report||{}, aeo_report:p.aeo_report||{}, category:p.category||'', category_label:p.category_label||'' },
              currentUrl:  p.url,
            })}
            onBack={() => window.history.back()}
          />
        )}

        {view === VIEWS.MODE_A_PRODUCT_REPORT && modeBResult && (() => {
          const catProds = allProducts.filter(p =>
            p.category_names?.includes(selectedCategory?.name) ||
            p.category === selectedCategory?.name ||
            p.category_name === selectedCategory?.name
          );
          const idx     = catProds.findIndex(p => p.url === currentUrl);
          const prevProd = idx > 0 ? catProds[idx - 1] : null;
          const nextProd = idx >= 0 && idx < catProds.length - 1 ? catProds[idx + 1] : null;

          const goToProd = (p) => navigateTo(VIEWS.MODE_A_PRODUCT_REPORT, {
            modeBResult: { page_title:p.name, seo_report:p.seo_report||{}, aeo_report:p.aeo_report||{}, category:p.category||'' },
            currentUrl:  p.url,
          });

          return (
            <window.ModeBReport
              result={modeBResult}
              url={currentUrl}
              onBack={() => window.history.back()}
              onPrev={prevProd ? () => goToProd(prevProd) : undefined}
              onNext={nextProd ? () => goToProd(nextProd) : undefined}
            />
          );
        })()}
      </div>
    </div>
  );
};

// ── SSE helper ────────────────────────────────────────────────────────────────
window.streamSSE = async function streamSSE(path, body, token, onEvent, signal) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(path, { method:'POST', headers, body:JSON.stringify(body), signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const reader = res.body.getReader(), decoder = new TextDecoder();
  let buf = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const chunks = buf.split('\n\n');
    buf = chunks.pop();
    for (const chunk of chunks) {
      const em = chunk.match(/^event:\s*(.+)/m);
      const dm = chunk.match(/^data:\s*(.+)/m);
      if (em && dm) { try { onEvent(em[1].trim(), JSON.parse(dm[1].trim())); } catch {} }
    }
  }
};
