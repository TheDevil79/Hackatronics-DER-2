function TopNav({ activePage, setActivePage }) {
  const pages = [
    "Dashboard",
    "Map",
    "Simulation",
    "Domino Risk",
    "Reports",
    "Help",
  ];

  return (
    <header className="top-nav">
      <div className="brand">
        <div className="brand-icon">🔥</div>

        <div>
          <h1>SafeZone AI</h1>
          <span>Industrial Hazard Simulator</span>
        </div>
      </div>

      <nav className="nav-links">
        {pages.map((page) => (
          <button
            key={page}
            className={activePage === page ? "nav-link active" : "nav-link"}
            onClick={() => setActivePage(page)}
          >
            {page}
          </button>
        ))}
      </nav>

      <div className="wind-status">
        <span>〰</span>
        <div>
          <small>Wind</small>
          <strong>25 km/h</strong>
          <small>ESE (112°)</small>
        </div>
      </div>

      <div className="profile">◯</div>
    </header>
  );
}

export default TopNav;