const { useState, useEffect } = React;

window.HistoryView = function HistoryView({ onViewReport }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchHistory(page);
  }, [page]);

  const fetchHistory = async (p) => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('auth_token');
      const res = await fetch(`/api/v1/history?page=${p}&limit=10`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setHistory(data.data || []);
      setTotalPages(data.pages || 1);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{height:'100%', display:'flex', flexDirection:'column'}}>
      <div style={{marginBottom:24}}>
        <h2 style={{fontFamily:'Playfair Display, serif', fontSize:32}}>Analysis History</h2>
        <p style={{color:'var(--text-muted)'}}>Review your past product and site audits.</p>
      </div>

      <div className="card" style={{flex:1, display:'flex', flexDirection:'column'}}>
        {loading ? (
          <div style={{display:'flex',flex:1,alignItems:'center',justifyContent:'center'}}>
            <div className="spinner" style={{width:30,height:30,border:'3px solid var(--border)',borderTopColor:'var(--accent)'}}></div>
          </div>
        ) : history.length === 0 ? (
          <div style={{display:'flex',flex:1,alignItems:'center',justifyContent:'center',flexDirection:'column',color:'var(--text-muted)'}}>
            <i className="ph ph-empty" style={{fontSize:48,marginBottom:16}}></i>
            <p>No history found for your organization yet.</p>
          </div>
        ) : (
          <React.Fragment>
            <table style={{width:'100%', borderCollapse:'collapse', textAlign:'left'}}>
              <thead>
                <tr style={{borderBottom:'2px solid var(--border)', color:'var(--text-muted)', fontSize:12, textTransform:'uppercase'}}>
                  <th style={{padding:'12px 16px'}}>Date</th>
                  <th style={{padding:'12px 16px'}}>URL</th>
                  <th style={{padding:'12px 16px'}}>Type</th>
                  <th style={{padding:'12px 16px'}}>Score</th>
                  <th style={{padding:'12px 16px', textAlign:'right'}}>Action</th>
                </tr>
              </thead>
              <tbody>
                {history.map(item => {
                  const d = new Date(item.created_at);
                  const isModeB = item.mode.includes('Product');
                  
                  // Fix score parsing (handle out of 1.0, 10, or 100)
                  const scoreRaw = isModeB ? item.result_data?.seo_report?.overall_seo_score : item.result_data?.site_score;
                  const scale = v => (v > 0 && v <= 1.0) ? v * 100 : (v > 1.0 && v <= 10 ? v * 10 : v);
                  const score = typeof scoreRaw === 'number' ? scale(scoreRaw) : null;
                  
                  // Parse URL nicely
                  let domain = item.url;
                  let path = '';
                  try {
                    const u = new URL(item.url);
                    domain = u.hostname.replace('www.', '');
                    path = u.pathname;
                  } catch(e) {}

                  return (
                    <tr key={item.id} className="expand-row" style={{borderBottom:'1px solid var(--border)'}}>
                      <td style={{padding:'16px', fontSize:14}}>
                        <div style={{fontWeight:500, color:'var(--dark)'}}>
                          {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <div style={{fontSize:12, color:'var(--text-muted)', marginTop:2}}>
                          {d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </div>
                      </td>
                      <td style={{padding:'16px', fontSize:14, maxWidth:300}}>
                        <a href={item.url} target="_blank" style={{textDecoration:'none', display:'block'}}>
                          <div style={{fontWeight:600, color:'var(--dark)'}}>{domain}</div>
                          <div style={{fontSize:12, color:'var(--text-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{path}</div>
                        </a>
                      </td>
                      <td style={{padding:'16px'}}>
                        {isModeB ? (
                           <span className="badge" style={{background:'rgba(142, 92, 163, 0.1)', color:'#8e5ca3'}}>
                             <i className="ph ph-file-text" style={{marginRight:4, fontSize:14}}></i>Product Page
                           </span>
                        ) : (
                           <span className="badge" style={{background:'rgba(65, 126, 194, 0.1)', color:'#417ec2'}}>
                             <i className="ph ph-globe" style={{marginRight:4, fontSize:14}}></i>Site Audit
                           </span>
                        )}
                      </td>
                      <td style={{padding:'16px', fontWeight:600}}>
                        {score !== null ? (
                          <div style={{display:'flex', alignItems:'center', gap:10}}>
                            <span className={`badge ${window.gradeBadgeClass(window.scoreGrade(score/10))}`} style={{width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, borderRadius: '50%', fontSize: 13}}>
                              {window.scoreGrade(score/10)}
                            </span>
                            <span style={{color:'var(--dark)'}}>{Math.round(score)}<span style={{fontSize:11, color:'var(--text-muted)', marginLeft: 2}}>/ 100</span></span>
                          </div>
                        ) : (
                          <span style={{color:'var(--text-muted)'}}>N/A</span>
                        )}
                      </td>
                      <td style={{padding:'16px', textAlign:'right'}}>
                        <button style={{background:'transparent', border:'none', color:'var(--accent)', fontWeight:600, fontSize:13, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:4, transition: 'all 0.2s'}} onClick={() => onViewReport(item)}>
                          View Report <i className="ph ph-arrow-right"></i>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            
            {/* Pagination */}
            <div style={{marginTop:'auto', paddingTop:24, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <span style={{fontSize:13, color:'var(--text-muted)'}}>Page {page} of {totalPages}</span>
              <div style={{display:'flex', gap:8}}>
                <button className="btn btn-outline" disabled={page === 1} onClick={() => setPage(p=>p-1)}>
                  <i className="ph ph-caret-left"></i> Prev
                </button>
                <button className="btn btn-outline" disabled={page === totalPages} onClick={() => setPage(p=>p+1)}>
                  Next <i className="ph ph-caret-right"></i>
                </button>
              </div>
            </div>
          </React.Fragment>
        )}
      </div>
    </div>
  );
};
