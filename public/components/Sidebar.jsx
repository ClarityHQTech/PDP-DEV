window.Sidebar = function Sidebar({ activeTab, onTabChange, user }) {
  const onSignOut = () => {
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_user');
    window.location.href = '/';
  };

  return (
    <div className="sidebar">
      {/* Brand */}
      <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:40}}>
        <div style={{background:'var(--accent)', color:'white', width:32, height:32, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center'}}>
          <i className="ph ph-shopping-bag" style={{fontSize:16}}></i>
        </div>
        <h2 style={{fontSize:18, margin:0}}>Organic360<br/><span style={{fontWeight:400, fontSize:14}}>by Clarity HQ</span></h2>
      </div>

      {/* Navigation */}
      <div style={{flex:1}}>
        <div 
          className={`nav-item ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => onTabChange('audit')}
        >
          <i className="ph ph-storefront"></i>
          Product Audit
        </div>
        <div 
          className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => onTabChange('history')}
        >
          <i className="ph ph-clock-counter-clockwise"></i>
          History
        </div>
      </div>

      {/* Footer Profile */}
      <div style={{marginTop:'auto'}}>
        <div 
          style={{fontSize:13, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:6, cursor:'pointer', marginBottom:16}}
          onClick={onSignOut}
        >
          <i className="ph ph-sign-out"></i> Sign out
        </div>
        <div style={{display:'flex', alignItems:'center', gap:12, background:'white', padding:12, borderRadius:12, boxShadow:'var(--shadow)'}}>
          {user?.picture ? (
            <img src={user.picture} style={{width:36, height:36, borderRadius:'50%'}} />
          ) : (
            <div style={{width:36, height:36, borderRadius:'50%', background:'var(--accent)', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold'}}>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
          )}
          <div style={{overflow:'hidden'}}>
            <div style={{fontWeight:600, fontSize:14, whiteSpace:'nowrap', textOverflow:'ellipsis', overflow:'hidden'}}>{user?.name || 'User'}</div>
            <div style={{fontSize:12, color:'var(--text-muted)', whiteSpace:'nowrap', textOverflow:'ellipsis', overflow:'hidden'}}>{user?.email || ''}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
