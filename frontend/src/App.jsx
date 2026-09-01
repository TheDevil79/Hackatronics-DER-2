import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

import GeoMap from "./components/GeoMap";
import FacilityMap from "./components/FacilityMap";
const INITIAL_ASSETS = [
  {
    id: "T-101",
    type: "tank",
    name: "T-101",
    x: 22,
    y: 28,
    capacity: 500,
    fuel: "LPG",
    pressure: 17,
    temperature: 30,
    status: "Normal",
  },
  {
    id: "T-102",
    type: "tank",
    name: "T-102",
    x: 35,
    y: 29,
    capacity: 750,
    fuel: "Diesel",
    pressure: 8,
    temperature: 27,
    status: "Normal",
  },
  {
    id: "BLDG-01",
    type: "building",
    name: "Control Room",
    x: 62,
    y: 22,
    status: "Normal",
  },
  {
    id: "ST-01",
    type: "storage",
    name: "Chemical Storage",
    x: 68,
    y: 55,
    capacity: 250,
    material: "Chemical",
    status: "Normal",
  },
  {
    id: "M-01",
    type: "machine",
    name: "Process Unit",
    x: 42,
    y: 61,
    status: "Normal",
  },
  {
    id: "PIPE-01",
    type: "pipeline",
    name: "Main Pipeline",
    x: 27,
    y: 78,
    status: "Normal",
  },
  {
    id: "SAFE-01",
    type: "shelter",
    name: "Emergency Shelter",
    x: 76,
    y: 28,
    status: "Safe",
  },
];

const ASSET_TYPES = [
  // STORAGE / PROCESS
  { type: "tank", label: "Storage Tank", icon: "◎", color: "red" },
  { type: "pressure-vessel", label: "Pressure Vessel", icon: "◎", color: "red" },
  { type: "reactor", label: "Reactor", icon: "◉", color: "red" },
  { type: "boiler", label: "Boiler", icon: "▣", color: "red" },
  { type: "furnace", label: "Furnace", icon: "◇", color: "red" },
  { type: "heat-exchanger", label: "Heat Exchanger", icon: "▤", color: "red" },

  // MACHINERY
  { type: "machine", label: "Machinery", icon: "⚙", color: "orange" },
  { type: "pump", label: "Pump", icon: "◉", color: "orange" },
  { type: "compressor", label: "Compressor", icon: "◌", color: "orange" },
  { type: "cooling-tower", label: "Cooling Tower", icon: "△", color: "orange" },
  { type: "flare-stack", label: "Flare Stack", icon: "♢", color: "red" },

  // STORAGE
  { type: "storage", label: "Storage Area", icon: "▤", color: "green" },
  { type: "chemical-storage", label: "Chemical Storage", icon: "◇", color: "green" },
  { type: "fuel-storage", label: "Fuel Storage", icon: "◎", color: "red" },
  { type: "gas-storage", label: "Gas Cylinder Storage", icon: "○", color: "yellow" },
  { type: "fire-water-tank", label: "Fire Water Tank", icon: "◍", color: "cyan" },

  // INFRASTRUCTURE
  { type: "building", label: "Building", icon: "▣", color: "blue" },
  { type: "control-room", label: "Control Room", icon: "□", color: "blue" },
  { type: "warehouse", label: "Warehouse", icon: "▥", color: "blue" },
  { type: "laboratory", label: "Laboratory", icon: "⚗", color: "blue" },
  { type: "maintenance", label: "Maintenance Building", icon: "⚒", color: "blue" },
  { type: "admin", label: "Admin / Office", icon: "▧", color: "blue" },

  // PIPELINES
  { type: "pipeline", label: "Pipeline", icon: "━", color: "purple" },
  { type: "pipe-rack", label: "Pipe Rack", icon: "╫", color: "purple" },

  // LOGISTICS
  { type: "loading-bay", label: "Loading / Unloading Bay", icon: "▱", color: "orange" },
  { type: "truck-loading", label: "Truck Loading Area", icon: "▰", color: "orange" },
  { type: "rail-loading", label: "Rail Loading Area", icon: "═", color: "orange" },
  { type: "road", label: "Road", icon: "═", color: "purple" },

  // ELECTRICAL
  { type: "substation", label: "Electrical Substation", icon: "⚡", color: "yellow" },

  // EMERGENCY / SAFETY
  { type: "shelter", label: "Emergency Shelter", icon: "⌂", color: "green" },
  { type: "exit", label: "Emergency Exit", icon: "↗", color: "green" },
  { type: "access", label: "Emergency Access", icon: "✚", color: "green" },
  { type: "hydrant", label: "Fire Hydrant", icon: "✦", color: "cyan" },
  { type: "detector", label: "Gas Detector", icon: "◇", color: "yellow" },
  { type: "assembly-point", label: "Assembly Point", icon: "●", color: "green" },

  // SECURITY
  { type: "main-gate", label: "Main Gate", icon: "▯", color: "red" },
  { type: "security", label: "Security Building", icon: "▣", color: "blue" },
];

const PAGE_DATA = {
  dashboard: {
    title: "Operational Overview",
    subtitle: "Facility safety intelligence and system status.",
  },
  geoMap: {
  title: "Geographic Map",
  subtitle: "Select an industrial zone.",
},
  map: {
    title: "Facility Model",
    subtitle: "Create and manage your industrial facility layout.",
  },
  heatmap: {
    title: "Risk Heat Map",
    subtitle: "Visual risk distribution across the facility.",
  },
  simulation: {
    title: "Simulation Center",
    subtitle: "Run and inspect engineering simulation results.",
  },
  domino: {
    title: "Domino Analysis",
    subtitle: "Review potential escalation pathways between assets.",
  },
  blast: {
    title: "Blast Analysis",
    subtitle: "Analyze pressure and impact zones.",
  },
  evacuation: {
    title: "Emergency Planning",
    subtitle: "Review evacuation routes and safety resources.",
  },
  reports: {
    title: "Reports",
    subtitle: "Facility reports, events and analysis exports.",
  },
};

function App() {
  const [landing, setLanding] = useState(true);
  const [page, setPage] = useState("dashboard");
  const [theme, setTheme] = useState("dark");
  const [assets, setAssets] = useState(INITIAL_ASSETS);
  const [selectedId, setSelectedId] = useState("T-101");
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [windSpeed, setWindSpeed] = useState("5.4");
  const [windDirection, setWindDirection] = useState("NW");

  const selectedAsset = assets.find(
    (asset) => asset.id === selectedId
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => setToast(""), 2500);

    return () => clearTimeout(timer);
  }, [toast]);

  const showToast = (message) => {
    setToast(message);
  };

  const updateAsset = (id, changes) => {
    setAssets((current) =>
      current.map((asset) =>
        asset.id === id ? { ...asset, ...changes } : asset
      )
    );
  };

  const deleteAsset = (id) => {
    setAssets((current) =>
      current.filter((asset) => asset.id !== id)
    );

    setSelectedId(null);
    showToast("Asset removed from facility");
  };

  const addAsset = (type) => {
    const definition = ASSET_TYPES.find(
      (item) => item.type === type
    );

    if (!definition) return;

    const sameType = assets.filter(
      (asset) => asset.type === type
    ).length;

    const prefix =
  type === "tank"
    ? "T"
    : type === "pressure-vessel"
    ? "PV"
    : type === "reactor"
    ? "R"
    : type === "boiler"
    ? "BLR"
    : type === "furnace"
    ? "FUR"
    : type === "heat-exchanger"
    ? "HX"
    : type === "building"
    ? "BLDG"
    : type === "control-room"
    ? "CTRL"
    : type === "warehouse"
    ? "WH"
    : type === "laboratory"
    ? "LAB"
    : type === "maintenance"
    ? "MAINT"
    : type === "admin"
    ? "ADM"
    : type === "storage"
    ? "ST"
    : type === "chemical-storage"
    ? "CHEM"
    : type === "fuel-storage"
    ? "FUEL"
    : type === "gas-storage"
    ? "GAS"
    : type === "fire-water-tank"
    ? "FWT"
    : type === "machine"
    ? "M"
    : type === "pump"
    ? "P"
    : type === "compressor"
    ? "COMP"
    : type === "cooling-tower"
    ? "CT"
    : type === "flare-stack"
    ? "FLR"
    : type === "pipeline"
    ? "PIPE"
    : type === "pipe-rack"
    ? "RACK"
    : type === "loading-bay"
    ? "LOAD"
    : type === "truck-loading"
    ? "TRUCK"
    : type === "rail-loading"
    ? "RAIL"
    : type === "road"
    ? "ROAD"
    : type === "substation"
    ? "SUB"
    : type === "shelter"
    ? "SAFE"
    : type === "exit"
    ? "EXIT"
    : type === "access"
    ? "ACCESS"
    : type === "hydrant"
    ? "HYD"
    : type === "detector"
    ? "DET"
    : type === "assembly-point"
    ? "ASM"
    : type === "main-gate"
    ? "GATE"
    : type === "security"
    ? "SEC"
    : "ASSET";

   const newAsset = {
  id: `${prefix}-${String(sameType + 1).padStart(2, "0")}`,
  type,
  name: definition.label,
  icon: definition.icon,
  x: 50,
  y: 45,
  status: "Normal",
  capacity: type === "tank" ? 500 : undefined,
  fuel: type === "tank" ? "LPG" : undefined,
  pressure: type === "tank" ? 10 : undefined,
  temperature: type === "tank" ? 25 : undefined,
};

    setAssets((current) => [...current, newAsset]);
    setSelectedId(newAsset.id);

    showToast(`${definition.label} added`);
  };

  if (landing) {
    return (
      <Landing
        onEnter={() => {
          setLanding(false);
          showToast("Workspace initialized");
        }}
      />
    );
  }

  return (
    <div className="app-shell">
      <TopBar
        page={page}
        theme={theme}
        setTheme={setTheme}
        onMenu={() => setSidebarOpen((value) => !value)}
      />

      <div className="workspace">
        <Sidebar
          page={page}
          setPage={(next) => {
            setPage(next);
            setSidebarOpen(false);
          }}
          open={sidebarOpen}
        />

        <main className="main-content">
          <PageHeader
            page={page}
            search={search}
            setSearch={setSearch}
          />

          {page === "dashboard" && (
            <Dashboard
              assets={assets}
              setPage={setPage}
              windSpeed={windSpeed}
              setWindSpeed={setWindSpeed}
              windDirection={windDirection}
              setWindDirection={setWindDirection}
            />
          )}
{page === "geoMap" && (
  <GeoMap
    onEnterZone={() => {
      setPage("map");
    }}
  />
)}
          {page === "map" && (
  <FacilityMap
    assets={assets}
    selectedId={selectedId}
    setSelectedId={setSelectedId}
    updateAsset={updateAsset}
    deleteAsset={deleteAsset}
    addAsset={addAsset}
    showToast={showToast}
  />
)}

          {page === "heatmap" && (
            <HeatMap
              assets={assets}
              windSpeed={windSpeed}
              windDirection={windDirection}
            />
          )}

          {page === "simulation" && (
            <Simulation />
          )}

          {page === "domino" && (
            <DominoAnalysis assets={assets} />
          )}

          {page === "blast" && (
            <BlastAnalysis assets={assets} />
          )}

          {page === "evacuation" && (
            <Evacuation assets={assets} />
          )}

          {page === "reports" && (
            <Reports />
          )}
        </main>
      </div>

      <StatusBar
        assets={assets}
        windSpeed={windSpeed}
        windDirection={windDirection}
      />

      {toast && <Toast message={toast} />}
    </div>
  );
}

/* =========================================================
   LANDING
   ========================================================= */

function Landing({ onEnter }) {
  return (
    <div className="landing">
      <div className="landing-grid" />

      <div className="landing-scan" />

      <div className="landing-content">
        <div className="landing-kicker">
          INDUSTRIAL SAFETY INTELLIGENCE
        </div>

        <h1 className="landing-title">
          <span>Industrial</span>
          <strong>Risk</strong>
        </h1>

        <p className="landing-subtitle">
          Facility modeling, risk visualization and emergency
          intelligence in one workspace.
        </p>

        <button className="landing-button" onClick={onEnter}>
          <span>ENTER WORKSPACE</span>
          <b>→</b>
        </button>

        <div className="landing-status">
          <span className="status-dot" />
          SYSTEM READY
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   TOP BAR
   ========================================================= */

function TopBar({
  page,
  theme,
  setTheme,
  onMenu,
}) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="mobile-menu" onClick={onMenu}>
          ☰
        </button>

        <div className="top-context">
          <span>FACILITY</span>
          <b>ZONE 01</b>
        </div>
      </div>

      <div className="topbar-center">
        <div className="system-indicator">
          <span />
          LIVE SYSTEM
        </div>
      </div>

      <div className="topbar-actions">
        <button
          className="icon-button"
          onClick={() =>
            setTheme(
              theme === "dark"
                ? "light"
                : "dark"
            )
          }
          title="Toggle theme"
        >
          {theme === "dark" ? "☼" : "☾"}
        </button>

        <div className="operator">
          <div className="operator-avatar">
            OP
          </div>

          <div>
            <strong>Operator</strong>
            <small>Safety Console</small>
          </div>
        </div>
      </div>
    </header>
  );
}

/* =========================================================
   SIDEBAR
   ========================================================= */

function Sidebar({
  page,
  setPage,
  open,
}) {
  const navigation = [
    {
      label: "Workspace",
      items: [
  ["dashboard", "Overview", "⌂"],
  ["geoMap", "Geographic Map", "◎"],
  ["map", "Facility Builder", "⌗"],
  ["heatmap", "Risk Heat Map", "◌"],
],
    },
    {
      label: "Analysis",
      items: [
        ["simulation", "Simulation Center", "△"],
        ["domino", "Domino Effect", "◇"],
        ["blast", "Blast Analysis", "◈"],
      ],
    },
    {
      label: "Emergency",
      items: [
        ["evacuation", "Evacuation Plan", "↗"],
      ],
    },
    {
      label: "Output",
      items: [
        ["reports", "Reports", "▤"],
      ],
    },
  ];

  return (
    <aside className={`sidebar ${open ? "open" : ""}`}>
      <div className="sidebar-scroll">
        {navigation.map((group) => (
          <div className="nav-group" key={group.label}>
            <div className="nav-label">
              {group.label}
            </div>

            {group.items.map(([id, label, icon]) => (
              <button
                key={id}
                className={`nav-item ${
                  page === id ? "active" : ""
                }`}
                onClick={() => setPage(id)}
              >
                <span className="nav-icon">
                  {icon}
                </span>

                <span>{label}</span>

                {page === id && (
                  <i className="nav-active-line" />
                )}
              </button>
            ))}
          </div>
        ))}

        <div className="sidebar-bottom">
          <div className="connection-card">
            <span className="connection-light" />

            <div>
              <strong>System online</strong>
              <small>All core services ready</small>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

/* =========================================================
   PAGE HEADER
   ========================================================= */

function PageHeader({
  page,
  search,
  setSearch,
}) {
  const data = PAGE_DATA[page];

  return (
    <div className="page-header">
      <div>
        <div className="breadcrumb">
          INDUSTRIAL RISK
          <span>/</span>
          {page.toUpperCase()}
        </div>

        <h1>{data.title}</h1>
        <p>{data.subtitle}</p>
      </div>

      <div className="header-tools">
        <div className="search-box">
          <span>⌕</span>

          <input
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search workspace..."
          />

          <kbd>⌘ K</kbd>
        </div>

        <button className="notification">
          <span />
          ◇
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   DASHBOARD
   ========================================================= */

function Dashboard({
  assets,
  setPage,
  windSpeed,
  setWindSpeed,
  windDirection,
  setWindDirection,
}) {
  const tanks = assets.filter(
    (asset) => asset.type === "tank"
  ).length;

  const normal = assets.filter(
    (asset) =>
      asset.status === "Normal" ||
      asset.status === "Safe"
  ).length;

  const cards = [
    {
      label: "ASSETS",
      value: assets.length,
      detail: "Registered facility assets",
      icon: "◇",
    },
    {
      label: "TANKS",
      value: tanks,
      detail: "Storage vessels",
      icon: "◎",
    },
    {
      label: "SYSTEM HEALTH",
      value: "98.4",
      suffix: "%",
      detail: "Operational availability",
      icon: "✓",
    },
    {
      label: "ACTIVE ALERTS",
      value: "02",
      detail: "Requires attention",
      icon: "!",
      danger: true,
    },
  ];

  return (
    <div className="dashboard-page">
      <section className="metric-grid">
        {cards.map((card, index) => (
          <div
            className={`metric-card ${
              card.danger ? "danger" : ""
            }`}
            key={card.label}
            style={{
              animationDelay: `${index * 70}ms`,
            }}
          >
            <div className="metric-top">
              <span>{card.label}</span>
              <i>{card.icon}</i>
            </div>

            <div className="metric-value">
              {card.value}
              {card.suffix && (
                <small>{card.suffix}</small>
              )}
            </div>

            <div className="metric-detail">
              {card.detail}
            </div>

            <div className="metric-line" />
          </div>
        ))}
      </section>

      <section className="dashboard-grid">
        <div className="panel facility-preview">
          <PanelHeading
            title="Facility Snapshot"
            eyebrow="CURRENT MODEL"
            action="OPEN BUILDER"
            onAction={() => setPage("map")}
          />

          <MiniFacilityMap assets={assets} />
        </div>

        <div className="panel">
          <PanelHeading
            title="Environmental Conditions"
            eyebrow="LIVE CONDITIONS"
          />

          <div className="environment">
            <div className="environment-main">
              <div className="wind-icon">↗</div>

              <div>
                <small>WIND SPEED</small>
<div className="wind-input">
  <input
    type="number"
    step="0.1"
    min="0"
    value={windSpeed}
    onFocus={(e) => e.target.select()}
    onChange={(e) => {
      setWindSpeed(e.target.value);
    }}
  />
  <em>m/s</em>
</div>
              </div>
            </div>

            <div className="environment-row">
              <span>Direction</span>
              <select
                className="wind-direction-input"
                value={windDirection}
                onChange={(e) => setWindDirection(e.target.value)}
                aria-label="Wind direction"
              >
                <option value="N">N — North</option>
                <option value="NE">NE — Northeast</option>
                <option value="E">E — East</option>
                <option value="SE">SE — Southeast</option>
                <option value="S">S — South</option>
                <option value="SW">SW — Southwest</option>
                <option value="W">W — West</option>
                <option value="NW">NW — Northwest</option>
              </select>
            </div>

            <div className="environment-row">
              <span>Atmosphere</span>
              <b>Stable</b>
            </div>

            <div className="environment-row">
              <span>Visibility</span>
              <b>Good</b>
            </div>
          </div>
        </div>
      </section>

      <section className="dashboard-grid lower">
        <div className="panel">
          <PanelHeading
            title="Facility Status"
            eyebrow="SYSTEM STATUS"
          />

          <div className="status-list">
            {assets.slice(0, 5).map((asset) => (
              <div className="status-row" key={asset.id}>
                <div className="status-asset">
                  <span
                    className={`asset-status ${asset.status === "Safe" ? "safe" : ""}`}
                  />
                  <div>
                    <strong>{asset.id}</strong>
                    <small>{asset.name}</small>
                  </div>
                </div>

                <span className="normal-badge">
                  {asset.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel alert-panel">
          <PanelHeading
            title="Risk Events"
            eyebrow="RECENT EVENTS"
          />

          <div className="event">
            <span className="event-marker warning" />

            <div>
              <strong>Pressure threshold check</strong>
              <small>T-101 · 08:42</small>
            </div>

            <span className="event-level">
              REVIEW
            </span>
          </div>

          <div className="event">
            <span className="event-marker danger" />

            <div>
              <strong>Simulation pending</strong>
              <small>Risk Engine · 08:38</small>
            </div>

            <span className="event-level danger-text">
              PENDING
            </span>
          </div>

          <div className="event">
            <span className="event-marker safe" />

            <div>
              <strong>Safety network online</strong>
              <small>Facility · 08:31</small>
            </div>

            <span className="event-level">
              OK
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}

/* =========================================================
   FACILITY BUILDER
   ========================================================= */

function FacilityBuilder({
  assets,
  selectedId,
  setSelectedId,
  updateAsset,
  deleteAsset,
  addAsset,
  showToast,
}) {
  const [tool, setTool] = useState("select");
  const [zoom, setZoom] = useState(100);

  return (
    <div className="builder">
      <div className="builder-toolbar">
        <div className="toolbar-group">
          <button
            className={tool === "select" ? "selected" : ""}
            onClick={() => setTool("select")}
          >
            ↖ Select
          </button>

          <button
            className={tool === "pan" ? "selected" : ""}
            onClick={() => setTool("pan")}
          >
            ✥ Pan
          </button>
        </div>

        <div className="toolbar-center">
          <span>FACILITY MODEL</span>
          <b>ZONE 01</b>
        </div>

        <div className="toolbar-group">
          <button onClick={() => setZoom(Math.max(60, zoom - 10))}>
            −
          </button>

          <span className="zoom-value">
            {zoom}%
          </span>

          <button onClick={() => setZoom(Math.min(150, zoom + 10))}>
            +
          </button>

          <button
            onClick={() => {
              setZoom(100);
              showToast("View reset");
            }}
          >
            Reset
          </button>
        </div>
      </div>

      <div className="builder-layout">
        <AssetLibrary addAsset={addAsset} />

        <FacilityCanvas
          assets={assets}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          updateAsset={updateAsset}
          zoom={zoom}
        />

        <Inspector
          asset={assets.find(
            (asset) => asset.id === selectedId
          )}
          updateAsset={updateAsset}
          deleteAsset={deleteAsset}
        />
      </div>

      <div className="builder-footer">
        <span>
          {assets.length} assets placed
        </span>

        <span>
          GRID 10m
        </span>

        <span>
          SNAP ON
        </span>

        <span>
          MODEL EDIT MODE
        </span>
      </div>
    </div>
  );
}

/* =========================================================
   ASSET LIBRARY
   ========================================================= */

function AssetLibrary({ addAsset }) {
  return (
    <aside className="asset-library panel">
      <div className="library-title">
        <span>ASSET LIBRARY</span>
        <small>ADD TO MODEL</small>
      </div>

      <div className="asset-library-list">
        {ASSET_TYPES.map((asset) => (
          <button
            key={asset.type}
            className={`asset-library-item ${asset.color}`}
            onClick={() => addAsset(asset.type)}
          >
            <span className="library-icon">
              {asset.icon}
            </span>

            <span>
              <strong>{asset.label}</strong>
              <small>+ ADD ASSET</small>
            </span>

            <b>+</b>
          </button>
        ))}
      </div>
    </aside>
  );
}

/* =========================================================
   FACILITY CANVAS
   ========================================================= */

function FacilityCanvas({
  assets,
  selectedId,
  setSelectedId,
  updateAsset,
  zoom,
}) {
  const canvasRef = useRef(null);
  const dragRef = useRef(null);

  const beginDrag = (event, asset) => {
    event.preventDefault();

    const rect =
      canvasRef.current.getBoundingClientRect();

    dragRef.current = {
      id: asset.id,
      rect,
    };

    setSelectedId(asset.id);

    const move = (moveEvent) => {
      if (!dragRef.current) return;

      const { rect } = dragRef.current;

      let x =
        ((moveEvent.clientX - rect.left) /
          rect.width) *
        100;

      let y =
        ((moveEvent.clientY - rect.top) /
          rect.height) *
        100;

      x = Math.max(2, Math.min(98, x));
      y = Math.max(4, Math.min(96, y));

      updateAsset(asset.id, {
        x,
        y,
      });
    };

    const stop = () => {
      dragRef.current = null;

      window.removeEventListener(
        "pointermove",
        move
      );

      window.removeEventListener(
        "pointerup",
        stop
      );
    };

    window.addEventListener(
      "pointermove",
      move
    );

    window.addEventListener(
      "pointerup",
      stop
    );
  };

  return (
    <div className="canvas-panel">
      <div className="canvas-info">
        <div>
          <span>FACILITY LAYOUT</span>
          <small>
            Drag assets to reposition them
          </small>
        </div>

        <div className="canvas-coordinates">
          X 00.00 · Y 00.00
        </div>
      </div>

      <div
        className="facility-canvas"
        ref={canvasRef}
      >
        <div
          className="facility-world"
          style={{
            transform: `scale(${zoom / 100})`,
          }}
        >
          <div className="ground-lines" />

          <div className="road road-a" />
          <div className="road road-b" />

          <div className="zone-label process">
            PROCESS AREA
          </div>

          <div className="zone-label storage-zone">
            STORAGE
          </div>

          <div className="zone-label admin">
            ADMIN / CONTROL
          </div>

          <div className="north-arrow">
            N
            <span>↑</span>
          </div>

          {assets.map((asset) => (
            <AssetVisual
              key={asset.id}
              asset={asset}
              selected={asset.id === selectedId}
              onPointerDown={(event) =>
                beginDrag(event, asset)
              }
              onClick={(event) => {
                event.stopPropagation();
                setSelectedId(asset.id);
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   ASSET VISUAL
   ========================================================= */

function AssetVisual({
  asset,
  selected,
  onPointerDown,
  onClick,
}) {
  return (
    <div
      className={`asset-visual asset-${asset.type} ${
        selected ? "selected" : ""
      }`}
      style={{
        left: `${asset.x}%`,
        top: `${asset.y}%`,
      }}
      onPointerDown={onPointerDown}
      onClick={onClick}
    >
      {asset.type === "tank" && (
        <>
          <div className="tank-roof" />
          <div className="tank-cylinder">
            <div className="tank-stripe" />
          </div>
          <div className="tank-leg left" />
          <div className="tank-leg right" />
        </>
      )}

      {asset.type === "building" && (
        <div className="building-shape">
          <span />
          <span />
          <span />
          <span />
        </div>
      )}

      {asset.type === "storage" && (
        <div className="storage-shape">
          <i />
          <i />
          <i />
        </div>
      )}

      {asset.type === "machine" && (
        <div className="machine-shape">
          ⚙
        </div>
      )}

      {asset.type === "pipeline" && (
        <div className="pipeline-shape">
          <i />
          <i />
        </div>
      )}

      {asset.type === "reactor" && (
        <div className="reactor-shape">
          <div />
        </div>
      )}

      {asset.type === "shelter" && (
        <div className="shelter-shape">
          ⌂
        </div>
      )}

      {asset.type === "hydrant" && (
        <div className="hydrant-shape">
          ✦
        </div>
      )}

      {asset.type === "exit" && (
        <div className="exit-shape">
          EXIT
        </div>
      )}

      {asset.type === "detector" && (
  <div className="detector-shape">
    ◇
  </div>
)}

{![
  "tank",
  "building",
  "storage",
  "machine",
  "pipeline",
  "reactor",
  "shelter",
  "hydrant",
  "exit",
  "detector",
].includes(asset.type) && (
  <div className="generic-asset-shape">
    {asset.icon}
  </div>
)}

<span className="asset-label">
  {asset.id}
</span>
    </div>
  );
}

/* =========================================================
   INSPECTOR
   ========================================================= */

function Inspector({
  asset,
  updateAsset,
  deleteAsset,
}) {
  if (!asset) {
    return (
      <aside className="inspector panel">
        <div className="inspector-empty">
          <div>◇</div>
          <strong>No asset selected</strong>
          <span>
            Select an asset on the facility model
            to inspect its properties.
          </span>
        </div>
      </aside>
    );
  }

  return (
    <aside className="inspector panel">
      <div className="inspector-heading">
        <div>
          <small>ASSET INSPECTOR</small>
          <h2>{asset.id}</h2>
        </div>

        <span className="asset-type-badge">
          {asset.type}
        </span>
      </div>

      <div className="inspector-scroll">
        <Field
          label="Asset name"
          value={asset.name}
          onChange={(value) =>
            updateAsset(asset.id, {
              name: value,
            })
          }
        />

        <div className="inspector-divider" />

        {asset.type === "tank" && (
          <>
            <InspectorSection title="PROCESS DATA">

              <Field
                label="Capacity"
                value={asset.capacity}
                suffix="m³"
                type="number"
                onChange={(value) =>
                  updateAsset(asset.id, {
                    capacity: value,
                  })
                }
              />

              <Field
                label="Fuel / Material"
                value={asset.fuel}
                onChange={(value) =>
                  updateAsset(asset.id, {
                    fuel: value,
                  })
                }
              />

              <Field
                label="Pressure"
                value={asset.pressure}
                suffix="bar"
                type="number"
                onChange={(value) =>
                  updateAsset(asset.id, {
                    pressure: value,
                  })
                }
              />

              <Field
                label="Temperature"
                value={asset.temperature}
                suffix="°C"
                type="number"
                onChange={(value) =>
                  updateAsset(asset.id, {
                    temperature: value,
                  })
                }
              />

            </InspectorSection>
          </>
        )}

        {asset.type === "storage" && (
          <InspectorSection title="STORAGE DATA">
            <Field
              label="Capacity"
              value={asset.capacity || 250}
              suffix="m³"
              type="number"
              onChange={(value) =>
                updateAsset(asset.id, {
                  capacity: value,
                })
              }
            />

            <Field
              label="Material"
              value={asset.material || "Chemical"}
              onChange={(value) =>
                updateAsset(asset.id, {
                  material: value,
                })
              }
            />
          </InspectorSection>
        )}

        <InspectorSection title="POSITION">
          <div className="position-grid">
            <Field
              label="X"
              value={Number(asset.x).toFixed(1)}
              suffix="%"
              type="number"
              onChange={(value) =>
                updateAsset(asset.id, {
                  x: Number(value),
                })
              }
            />

            <Field
              label="Y"
              value={Number(asset.y).toFixed(1)}
              suffix="%"
              type="number"
              onChange={(value) =>
                updateAsset(asset.id, {
                  y: Number(value),
                })
              }
            />
          </div>
        </InspectorSection>

        <InspectorSection title="STATUS">
          <select
            className="inspector-select"
            value={asset.status || "Normal"}
            onChange={(event) =>
              updateAsset(asset.id, {
                status: event.target.value,
              })
            }
          >
            <option>Normal</option>
            <option>Safe</option>
            <option>Warning</option>
            <option>Critical</option>
            <option>Offline</option>
          </select>
        </InspectorSection>

        <button
          className="delete-asset"
          onClick={() => deleteAsset(asset.id)}
        >
          DELETE ASSET
        </button>
      </div>
    </aside>
  );
}

function InspectorSection({
  title,
  children,
}) {
  return (
    <div className="inspector-section">
      <div className="section-caption">
        {title}
      </div>

      {children}
    </div>
  );
}

function Field({
  label,
  value,
  suffix,
  type = "text",
  onChange,
}) {
  return (
    <label className="field">
      <span>{label}</span>

      <div className="field-input">
        <input
          type={type}
          value={value ?? ""}
          onChange={(event) =>
            onChange(event.target.value)
          }
        />

        {suffix && <small>{suffix}</small>}
      </div>
    </label>
  );
}

/* =========================================================
   MINI FACILITY MAP
   ========================================================= */

function MiniFacilityMap({ assets }) {
  return (
    <div className="mini-map">
      <div className="mini-grid" />

      {assets.map((asset) => (
        <div
          key={asset.id}
          className={`mini-asset mini-${asset.type}`}
          style={{
            left: `${asset.x}%`,
            top: `${asset.y}%`,
          }}
        />
      ))}

      <div className="mini-map-label">
        LIVE FACILITY MODEL
      </div>
    </div>
  );
}

/* =========================================================
   HEAT MAP
   ========================================================= */

function HeatMap({
  assets,
  windSpeed,
  windDirection,
}) {
  const source = assets.find(
    (asset) => asset.type === "tank"
  );

  return (
    <div className="analysis-page">
      <div className="analysis-toolbar">
        <div>
          <span className="analysis-live">
            PREVIEW
          </span>

          <strong>
            Risk Field Visualization
          </strong>
        </div>

        <div className="future-badge">
          SIMULATION DATA WILL BE CONNECTED HERE
        </div>
      </div>

      <div className="heatmap-layout">
        <div className="heatmap-view">
          <div className="heatmap-grid" />

          <div
            className="risk-cloud risk-red"
            style={{
              left: `${source?.x || 45}%`,
              top: `${source?.y || 45}%`,
            }}
          />

          <div
            className="risk-cloud risk-orange"
            style={{
              left: `${(source?.x || 45) + 1}%`,
              top: `${(source?.y || 45) + 1}%`,
            }}
          />

          <div
            className="risk-cloud risk-yellow"
            style={{
              left: `${(source?.x || 45) + 2}%`,
              top: `${(source?.y || 45) + 2}%`,
            }}
          />

          {assets.map((asset) => (
            <div
              key={asset.id}
              className={`heatmap-asset heatmap-${asset.type}`}
              style={{
                left: `${asset.x}%`,
                top: `${asset.y}%`,
              }}
            >
              {asset.id}
            </div>
          ))}

          <div className="wind-vector">
            WIND {windSpeed} m/s · {windDirection}
            <span>→</span>
          </div>

          <div className="heatmap-overlay-title">
            FACILITY RISK FIELD
            <small>PREVIEW VISUALIZATION</small>
          </div>
        </div>

        <div className="analysis-side panel">
          <PanelHeading
            title="Risk Legend"
            eyebrow="VISUALIZATION"
          />

          <div className="risk-legend">
            <div>
              <i className="legend-red" />
              <span>Critical</span>
            </div>

            <div>
              <i className="legend-orange" />
              <span>High</span>
            </div>

            <div>
              <i className="legend-yellow" />
              <span>Moderate</span>
            </div>

            <div>
              <i className="legend-green" />
              <span>Low</span>
            </div>
          </div>

          <div className="future-box">
            <span>FUTURE DATA SOURCE</span>
            <strong>Python simulation results</strong>
            <p>
              The final risk field will be generated
              from uploaded simulation output and the
              user's facility model.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   SIMULATION
   ========================================================= */

function Simulation() {
  return (
    <div className="analysis-page">
      <div className="simulation-hero panel">
        <div className="simulation-orbit">
          <div />
          <div />
          <div />
        </div>

        <div className="simulation-content">
          <span>PYTHON SIMULATION ENGINE</span>

          <h2>
            Simulation Center
          </h2>

          <p>
            Upload and visualize simulation results
            without changing the facility model.
          </p>

          <button className="primary-action">
            SELECT SIMULATION FILE
          </button>
        </div>
      </div>

      <div className="simulation-grid">
        <SimulationCard
          title="Blast / Pressure"
          icon="◈"
          text="Pressure and overpressure result visualization."
        />

        <SimulationCard
          title="Thermal Radiation"
          icon="◉"
          text="Thermal exposure and radiation field results."
        />

        <SimulationCard
          title="Dispersion"
          icon="≋"
          text="Atmospheric concentration and dispersion results."
        />

        <SimulationCard
          title="Sedov–Taylor"
          icon="△"
          text="Future analytical shock-wave visualization."
        />
      </div>
    </div>
  );
}

function SimulationCard({
  title,
  icon,
  text,
}) {
  return (
    <div className="simulation-card panel">
      <div className="simulation-card-icon">
        {icon}
      </div>

      <h3>{title}</h3>

      <p>{text}</p>

      <span>READY FOR DATA</span>
    </div>
  );
}

/* =========================================================
   DOMINO
   ========================================================= */

function DominoAnalysis({ assets }) {
  const tanks = assets.filter(
    (asset) => asset.type === "tank"
  );

  return (
    <div className="analysis-page">
      <div className="analysis-grid-two">
        <div className="panel domino-network">
          <PanelHeading
            title="Escalation Network"
            eyebrow="DOMINO EFFECT"
          />

          <div className="network">
            <div className="network-node source">
              <b>T-101</b>
              <small>PRIMARY SOURCE</small>
            </div>

            <div className="network-line line-1" />

            <div className="network-node">
              <b>ST-01</b>
              <small>SECONDARY</small>
            </div>

            <div className="network-line line-2" />

            <div className="network-node">
              <b>BLDG-01</b>
              <small>EXPOSED</small>
            </div>

            <div className="network-line line-3" />

            <div className="network-node">
              <b>SAFE-01</b>
              <small>PROTECTED</small>
            </div>
          </div>
        </div>

        <div className="panel">
          <PanelHeading
            title="Exposure Summary"
            eyebrow="MODEL"
          />

          <div className="summary-number">
            {tanks.length}
            <small>
              potentially hazardous source assets
            </small>
          </div>

          <div className="summary-row">
            <span>Escalation chains</span>
            <b>03</b>
          </div>

          <div className="summary-row">
            <span>Protected assets</span>
            <b>04</b>
          </div>

          <div className="summary-row">
            <span>Critical paths</span>
            <b className="danger-text">01</b>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   BLAST
   ========================================================= */

function BlastAnalysis({ assets }) {
  return (
    <div className="analysis-page">
      <div className="blast-layout">
        <div className="panel blast-visual">
          <div className="blast-center">
            <div className="blast-wave one" />
            <div className="blast-wave two" />
            <div className="blast-wave three" />

            <span>
              {assets.find(
                (asset) => asset.type === "tank"
              )?.id || "SOURCE"}
            </span>
          </div>

          <div className="blast-caption">
            BLAST FIELD PREVIEW
          </div>
        </div>

        <div className="panel">
          <PanelHeading
            title="Blast Parameters"
            eyebrow="INPUT MODEL"
          />

          <div className="parameter-list">
            <div>
              <span>Source asset</span>
              <b>T-101</b>
            </div>

            <div>
              <span>Scenario</span>
              <b>Pending upload</b>
            </div>

            <div>
              <span>Peak pressure</span>
              <b>—</b>
            </div>

            <div>
              <span>Impact radius</span>
              <b>—</b>
            </div>
          </div>

          <div className="future-box">
            Python simulation output will populate
            these values.
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   EVACUATION
   ========================================================= */

function Evacuation({ assets }) {
  return (
    <div className="analysis-page">
      <div className="panel evacuation-map">
        <div className="evac-grid" />

        {assets.map((asset) => (
          <div
            key={asset.id}
            className="evac-asset"
            style={{
              left: `${asset.x}%`,
              top: `${asset.y}%`,
            }}
          >
            {asset.id}
          </div>
        ))}

        <div className="evac-route route-one" />
        <div className="evac-route route-two" />

        <div className="evac-exit exit-one">
          EXIT A
        </div>

        <div className="evac-exit exit-two">
          EXIT B
        </div>

        <div className="evac-title">
          EVACUATION PLANNING
          <small>
            ROUTE VISUALIZATION PREVIEW
          </small>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   REPORTS
   ========================================================= */

function Reports() {
  const reports = [
    ["Facility Risk Assessment", "Pending", "PDF"],
    ["Blast Scenario Summary", "Pending", "PDF"],
    ["Domino Effect Analysis", "Pending", "PDF"],
    ["Emergency Evacuation Plan", "Draft", "PDF"],
  ];

  return (
    <div className="panel reports-panel">
      <PanelHeading
        title="Reports"
        eyebrow="DOCUMENT CENTER"
      />

      <div className="reports-table">
        <div className="reports-header">
          <span>REPORT</span>
          <span>STATUS</span>
          <span>TYPE</span>
          <span />
        </div>

        {reports.map((report) => (
          <div className="report-row" key={report[0]}>
            <strong>{report[0]}</strong>

            <span>{report[1]}</span>

            <span>{report[2]}</span>

            <button>
              VIEW →
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================================================
   COMMON COMPONENTS
   ========================================================= */

function PanelHeading({
  title,
  eyebrow,
  action,
  onAction,
}) {
  return (
    <div className="panel-heading">
      <div>
        <small>{eyebrow}</small>
        <h2>{title}</h2>
      </div>

      {action && (
        <button onClick={onAction}>
          {action} →
        </button>
      )}
    </div>
  );
}

function StatusBar({
  assets,
  windSpeed,
  windDirection,
}) {
  return (
    <footer className="statusbar">
      <div>
        <span className="status-dot" />
        SYSTEM OPERATIONAL
      </div>

      <div>
        ASSETS {assets.length}
      </div>

      <div>
        WIND {windSpeed} m/s · {windDirection}
      </div>

      <div>
        LAST SYNC JUST NOW
      </div>
    </footer>
  );
}

function Toast({ message }) {
  return (
    <div className="toast">
      <span>✓</span>
      {message}
    </div>
  );
}

export default App;