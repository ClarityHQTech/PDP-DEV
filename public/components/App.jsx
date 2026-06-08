const { useState, useEffect, useRef } = React;

window.App = function App() {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(null);
  const [authError, setAuthError] = useState('');
  const [activeTab, setActiveTab] = useState('audit');
  const [isInitializing, setIsInitializing] = useState(true);
  const [publicReportData, setPublicReportData] = useState(null);
  const [publicAuditData, setPublicAuditData] = useState(null);

  // ── Auth: handle Google callback URL params ──────────────────────────────
  useEffect(() => {
    const params    = new URLSearchParams(window.location.search);
    const success   = params.get('auth_success');
    const urlToken  = params.get('token');
    const errParam  = params.get('auth_error');
    const reportId  = params.get('report_id');
    const auditId   = params.get('audit_id');

    // Clean auth URL params
    if (success || errParam) {
      const cleanPath = window.location.pathname.replace(/\/index\.html$/, '/');
      window.history.replaceState({}, document.title, cleanPath);
    }

    if (reportId) {
      // Fetch public report first, bypass auth if needed
      fetch(`/api/v1/history/public-report/${reportId}`)
        .then(res => {
          if (!res.ok) throw new Error("Public report fetch failed");
          return res.json();
        })
        .then(data => {
          setPublicReportData(data);
          setIsInitializing(false);
        })
        .catch(e => {
          console.error("Failed to load public report", e);
          doAuthInit(success, urlToken, errParam);
        });
    } else if (auditId) {
      // Fetch public audit
      fetch(`/api/v1/history/public-audit/${auditId}`)
        .then(res => {
          if (!res.ok) throw new Error("Public audit fetch failed");
          return res.json();
        })
        .then(data => {
          setPublicAuditData(data);
          setView(VIEWS.MODE_A_OVERVIEW);
          setIsInitializing(false);
        })
        .catch(e => {
          console.error("Failed to load public audit", e);
          doAuthInit(success, urlToken, errParam);
        });
    } else {
      doAuthInit(success, urlToken, errParam);
    }
  }, []);

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
      if (stored) {
        fetchUser(stored);
      } else {
        setIsInitializing(false);
      }
    }
  };

  const fetchUser = async (t) => {
    try {
      const res  = await fetch('/api/v1/auth/me', { headers: { Authorization: `Bearer ${t}` } });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        setToken(t);
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

  // ── Views ────────────────────────────────────────────────────────────────
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

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setView(tab === 'history' ? VIEWS.HISTORY : VIEWS.LANDING);
  };

  // Sync currentUrl to browser URL bar
  useEffect(() => {
    const cleanPath = window.location.pathname.replace(/\/index\.html$/, '/');
    if (view === VIEWS.LANDING || view === VIEWS.HISTORY) {
      window.history.replaceState(null, '', cleanPath);
    } else if (modeBResult && modeBResult.report_id) {
      window.history.replaceState(null, '', cleanPath + '?report_id=' + encodeURIComponent(modeBResult.report_id));
    } else if (siteData && siteData.audit_id) {
      window.history.replaceState(null, '', cleanPath + '?audit_id=' + encodeURIComponent(siteData.audit_id));
    } else if (currentUrl) {
      window.history.replaceState(null, '', cleanPath + '?url=' + encodeURIComponent(currentUrl));
    }
  }, [view, currentUrl, modeBResult, siteData]);

  // Check URL on load
  useEffect(() => {
    if (user && !isInitializing) {
      const params = new URLSearchParams(window.location.search);
      const urlParam = params.get('url');
      if (urlParam && view === VIEWS.LANDING) {
        onAnalyze(urlParam);
      }
    }
  }, [user, isInitializing]);

  // ── Main analyse flow ────────────────────────────────────────────────────
  const onAnalyze = async (url) => {
    setCurrentUrl(url);
    setAnalyzeSteps([]);
    setAnalyzePct(0);
    setAnalyzeStep('');

    const t = sessionStorage.getItem('auth_token');
    try {
      const dres  = await fetch('/api/v1/detect-url', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body:    JSON.stringify({ url }),
      });
      const { mode } = await dres.json();   // 'A' | 'B'

      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      if (mode === 'B') {
        setView(VIEWS.ANALYZING);
        let finalResult = null;

        await window.streamSSE('/api/v1/analyze/pdp/stream', { url }, t, (event, data) => {
          if (event === 'progress') {
            setAnalyzeStep(data.step || '');
            setAnalyzePct(data.pct  || 0);
            setAnalyzeSteps(s => [...s, data.message || ''].slice(-8));
          } else if (event === 'category_detected') {
            // FIX-5: show category label in progress steps
            setAnalyzeSteps(s => [...s, `Category detected: ${data.label}`].slice(-8));
          } else if (event === 'complete') {
            finalResult = data;
          } else if (event === 'error') {
            console.error('stream error', data);
            setView(VIEWS.LANDING);
          }
        }, abortRef.current.signal);

        if (finalResult) {
          setModeBResult(finalResult);
          setView(VIEWS.MODE_B_REPORT);
        }
      } else {
        // Mode A
        setAllProducts([]);
        setSiteData(null);
        setView(VIEWS.MODE_A_CRAWLING);
        let overviewSet = false;

        await window.streamSSE('/api/v1/site/audit/stream', { url }, t, (event, data) => {
          if (event === 'progress') {
            setAnalyzeStep(data.step || 'crawling');
            setAnalyzePct(data.pct  || 0);
            setAnalyzeSteps(s => [...s, data.message || ''].slice(-8));
          } else if (event === 'site_overview') {
            setSiteData(data);
          } else if (event === 'product_done') {
            setAllProducts(prev => [...prev, data]);
          } else if (event === 'complete') {
            setSiteData(prev => ({ ...prev, ...data }));
            setView(VIEWS.MODE_A_OVERVIEW);
          } else if (event === 'error') {
            console.error('stream error', data);
            setView(VIEWS.LANDING);
          }
        }, abortRef.current.signal);
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.error('onAnalyze error', e);
        setView(VIEWS.LANDING);
      }
    }
  };

  // ── History → restore report ─────────────────────────────────────────────
  const onViewReport = (item) => {
    const rd = item.result_data;

    if (item.mode.includes('Product')) {
      // FIX-2: history result_data already has seo_report/aeo_report keys (fixed in history.py)
      rd.report_id = item.id; // Inject report_id to make link shareable
      setModeBResult(rd);
      setCurrentUrl(item.url);
      setView(VIEWS.MODE_B_REPORT);
    } else {
      // Mode A restore — siteData shape must match what SiteOverviewView expects
      setSiteData({
        audit_id:          item.id, // Inject audit_id to make link shareable
        domain:            rd.domain       || item.url,
        homepage_url:      rd.homepage_url || item.url,
        categories_found:  rd.categories_found  || 0,
        total_products:    rd.total_products     || 0,
        products_analyzed: rd.products_analyzed  || 0,
        avg_seo_score:     rd.avg_seo_score      || 0,
        avg_aeo_score:     rd.avg_aeo_score      || 0,
        top_issues:        rd.top_issues         || [],
        categories:        rd.categories         || [],
      });
      // FIX-6: products are now properly fetched in history.py
      setAllProducts(rd.products || []);
      setCurrentUrl(item.url);
      setView(VIEWS.MODE_A_OVERVIEW);
    }
  };

  // ── Not logged in ────────────────────────────────────────────────────────
  if (isInitializing) {
    return (
      <div style={{height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-gradient)'}}>
        <div className="spinner" style={{width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--accent)'}}></div>
      </div>
    );
  }

  // If a public report was successfully loaded via ?report_id=...
  if (publicReportData) {
    return (
      <div className="app-layout" style={{ background: 'var(--bg-gradient)' }}>
        <div className="main-content" style={{ maxWidth: 1200, margin: '0 auto', width: '100%', height: '100vh', overflowY: 'auto' }}>
          <div style={{marginBottom: 20, marginTop: 20, padding: '0 20px'}}>
            <button className="btn btn-outline" onClick={() => window.location.href='/'}>
              <i className="ph ph-arrow-left"></i> Home
            </button>
          </div>
          <window.ModeBReport result={publicReportData} />
        </div>
      </div>
    );
  }

  // If a public audit was successfully loaded via ?audit_id=...
  if (publicAuditData) {
    return (
      <div className="app-layout" style={{ background: 'var(--bg-gradient)' }}>
        <div className="main-content" style={{ maxWidth: 1200, margin: '0 auto', width: '100%', height: '100vh', overflowY: 'auto' }}>
          <div style={{marginBottom: 20, marginTop: 20, padding: '0 20px'}}>
            <button className="btn btn-outline" onClick={() => {
              if (view === VIEWS.MODE_B_REPORT) setView(VIEWS.MODE_A_PRODUCTS);
              else if (view === VIEWS.MODE_A_PRODUCTS) setView(VIEWS.MODE_A_OVERVIEW);
              else window.location.href='/';
            }}>
              <i className="ph ph-arrow-left"></i> {view === VIEWS.MODE_A_OVERVIEW ? 'Home' : 'Back'}
            </button>
          </div>

          {view === VIEWS.MODE_A_OVERVIEW && (
            <window.SiteOverviewView 
              siteData={publicAuditData} 
              products={publicAuditData.products} 
              onCategoryClick={(cat) => { setSelectedCategory(cat); setView(VIEWS.MODE_A_PRODUCTS); }}
            />
          )}

          {view === VIEWS.MODE_A_PRODUCTS && selectedCategory && (
            <window.ProductListView
              category={selectedCategory}
              products={publicAuditData.products}
              onProductClick={(p) => {
                setModeBResult({
                  page_title: p.name,
                  seo_report: p.seo_report || {},
                  aeo_report: p.aeo_report || {},
                  category:       p.category || '',
                  category_label: p.category_label || '',
                });
                setView(VIEWS.MODE_B_REPORT);
              }}
              onBack={() => setView(VIEWS.MODE_A_OVERVIEW)}
            />
          )}

          {view === VIEWS.MODE_B_REPORT && modeBResult && (
             <window.ModeBReport result={modeBResult} url={modeBResult.url} onBack={() => setView(VIEWS.MODE_A_PRODUCTS)} />
          )}
        </div>
      </div>
    );
  }

  if (!user || !token) {
    return <window.LoginView authError={authError} />;
  }

  // ── Main layout ──────────────────────────────────────────────────────────
  return (
    <div className="app-layout" style={{ '--sidebar-w': `${sidebarWidth}px` }}>
      <window.Sidebar activeTab={activeTab} onTabChange={handleTabChange} user={user} />
      
      <div 
        className="sidebar-resizer"
        onMouseDown={(e) => {
          e.preventDefault();
          const startX = e.clientX;
          const startWidth = sidebarWidth;

          const onMouseMove = (moveEvent) => {
            const newWidth = Math.max(200, Math.min(600, startWidth + (moveEvent.clientX - startX)));
            setSidebarWidth(newWidth);
          };

          const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.body.style.cursor = 'default';
          };

          document.addEventListener('mousemove', onMouseMove);
          document.addEventListener('mouseup', onMouseUp);
          document.body.style.cursor = 'col-resize';
        }}
      />

      <div className="main-content">

        {view === VIEWS.LANDING  && <window.LandingView onAnalyze={onAnalyze} />}
        {view === VIEWS.HISTORY  && <window.HistoryView onViewReport={onViewReport} />}

        {view === VIEWS.ANALYZING && (
          <window.AnalyzingView
            steps={analyzeSteps} currentStep={analyzeStep}
            pct={analyzePct} url={currentUrl} mode="B"
          />
        )}

        {view === VIEWS.MODE_B_REPORT && modeBResult && (
          <window.ModeBReport result={modeBResult} url={currentUrl} onBack={() => setView(VIEWS.LANDING)} />
        )}

        {view === VIEWS.MODE_A_CRAWLING && (
          <window.AnalyzingView
            steps={analyzeSteps} currentStep={analyzeStep}
            pct={analyzePct} url={currentUrl} mode="A"
          />
        )}

        {view === VIEWS.MODE_A_OVERVIEW && siteData && (
          <window.SiteOverviewView
            siteData={siteData}
            products={allProducts}
            onCategoryClick={(cat) => { setSelectedCategory(cat); setView(VIEWS.MODE_A_PRODUCTS); }}
            onBack={() => setView(VIEWS.LANDING)}
          />
        )}

        {view === VIEWS.MODE_A_PRODUCTS && selectedCategory && (
          <window.ProductListView
            category={selectedCategory}
            products={allProducts}
            onProductClick={(p) => {
              setModeBResult({
                page_title: p.name,
                seo_report: p.seo_report || {},
                aeo_report: p.aeo_report || {},
                category:       p.category || '',
                category_label: p.category_label || '',
              });
              setCurrentUrl(p.url);
              setView(VIEWS.MODE_A_PRODUCT_REPORT);
            }}
            onBack={() => setView(VIEWS.MODE_A_OVERVIEW)}
          />
        )}

        {view === VIEWS.MODE_A_PRODUCT_REPORT && modeBResult && (() => {
          const catProducts = (selectedCategory && selectedCategory.name.toLowerCase().includes('all products'))
            ? allProducts
            : allProducts.filter(p => p.category_names?.includes(selectedCategory.name) || p.category === selectedCategory.name || p.category_name === selectedCategory.name);
          
          const currentIndex = catProducts.findIndex(p => p.url === currentUrl);
          const prevProd = currentIndex > 0 ? catProducts[currentIndex - 1] : null;
          const nextProd = currentIndex >= 0 && currentIndex < catProducts.length - 1 ? catProducts[currentIndex + 1] : null;

          const goToProd = (p) => {
            setModeBResult({
              page_title: p.name,
              seo_report: p.seo_report || {},
              aeo_report: p.aeo_report || {},
              category:       p.category || '',
              category_label: p.category_label || '',
            });
            setCurrentUrl(p.url);
          };

          return (
            <window.ModeBReport
              result={modeBResult}
              url={currentUrl}
              onBack={() => setView(VIEWS.MODE_A_PRODUCTS)}
              onPrev={prevProd ? () => goToProd(prevProd) : undefined}
              onNext={nextProd ? () => goToProd(nextProd) : undefined}
            />
          );
        })()}
      </div>
    </div>
  );
};

// ── SSE streaming helper ───────────────────────────────────────────────────
window.streamSSE = async function streamSSE(path, body, token, onEvent, signal) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(path, { method: 'POST', headers, body: JSON.stringify(body), signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);

  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split('\n\n');
    buffer = chunks.pop();
    for (const chunk of chunks) {
      const eMatch = chunk.match(/^event:\s*(.+)/m);
      const dMatch = chunk.match(/^data:\s*(.+)/m);
      if (eMatch && dMatch) {
        try { onEvent(eMatch[1].trim(), JSON.parse(dMatch[1].trim())); }
        catch { /* malformed JSON — skip */ }
      }
    }
  }
};
