import './App.css'

const stats = [
  { label: 'Active deliveries', value: '0', note: 'Live bookings', tone: 'green' },
  { label: 'Drivers online', value: '0', note: 'Ready to accept jobs', tone: 'blue' },
  { label: 'Customers', value: '0', note: 'Registered accounts', tone: 'sand' },
  { label: 'Today’s revenue', value: '₹0', note: 'Across completed trips', tone: 'lavender' },
]

function App() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">a</span><span>atarashi<span className="brand-light"> / ops</span></span></div>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          <a className="nav-item selected" href="#overview"><span>◫</span> Overview</a>
          <a className="nav-item" href="#bookings"><span>↗</span> Bookings</a>
          <a className="nav-item" href="#drivers"><span>⌖</span> Drivers</a>
          <a className="nav-item" href="#customers"><span>♧</span> Customers</a>
          <a className="nav-item" href="#pricing"><span>₹</span> Pricing & promos</a>
          <a className="nav-item" href="#support"><span>☏</span> Support</a>
        </nav>
        <div className="sidebar-bottom"><div className="help-card"><span className="help-mark">✳</span><strong>Need a hand?</strong><p>Visit the operations guide</p><a href="#guide">Open guide <span>↗</span></a></div><div className="user-chip"><div className="user-avatar">A</div><div><strong>Atarashi Admin</strong><small>Administrator</small></div><span className="more">···</span></div></div>
      </aside>
      <main className="main-content">
        <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> <strong>Overview</strong></div><div className="top-actions"><span className="live-indicator"><i /> All systems operational</span><button className="icon-button" aria-label="Notifications">♧</button></div></header>
        <div className="page-content">
          <section className="welcome-row"><div><div className="date-line">MONDAY, 2 NOVEMBER 2026</div><h1>Good morning, team <span>✳</span></h1><p>Here’s what’s happening across your delivery network today.</p></div><button className="primary-button">＋ <span>New announcement</span></button></section>
          <section className="stat-grid">{stats.map((stat) => <article className="stat-card" key={stat.label}><div className="stat-top"><span>{stat.label}</span><span className={`stat-icon ${stat.tone}`}>◌</span></div><strong>{stat.value}</strong><small>{stat.note}</small><div className="stat-foot"><span className="flat-trend">—</span> Starting fresh today</div></article>)}</section>
          <section className="content-grid"><article className="panel activity-panel"><div className="panel-heading"><div><h2>Delivery activity</h2><p>Live view of today’s bookings</p></div><button className="select-button">Today <span>⌄</span></button></div><div className="empty-chart"><div className="chart-orbit orbit-one"/><div className="chart-orbit orbit-two"/><div className="chart-center"><span>↗</span></div><strong>It’s a calm start</strong><p>New delivery activity will appear here as bookings come in.</p></div><div className="chart-legend"><span><i className="legend-dot active-dot"/>Active <b>0</b></span><span><i className="legend-dot done-dot"/>Completed <b>0</b></span><span><i className="legend-dot cancelled-dot"/>Cancelled <b>0</b></span></div></article><article className="panel dispatch-panel"><div className="panel-heading"><div><h2>Dispatch pulse</h2><p>Driver availability right now</p></div><span className="pulse-badge"><i/> Live</span></div><div className="pulse-empty"><div className="pulse-illustration"><span className="pulse-ring ring-a"/><span className="pulse-ring ring-b"/><span className="pulse-pin">⌖</span></div><strong>Waiting for drivers</strong><p>When drivers come online, their availability will show here.</p></div><button className="outline-button">View driver directory <span>→</span></button></article></section>
          <section className="panel bookings-panel"><div className="panel-heading"><div><h2>Recent bookings</h2><p>Your latest delivery requests</p></div><a className="text-link" href="#bookings">View all <span>→</span></a></div><div className="table-head"><span>BOOKING</span><span>ROUTE</span><span>VEHICLE</span><span>STATUS</span><span>FARE</span></div><div className="empty-table"><span className="empty-icon">▤</span><strong>No bookings yet</strong><p>New delivery requests will appear in this list.</p></div></section>
          <footer>ATARASHI LOGISTICS <span>•</span> OPERATIONS CONSOLE <span className="footer-right">Built for better deliveries <b>✳</b></span></footer>
        </div>
      </main>
    </div>
  )
}

export default App
