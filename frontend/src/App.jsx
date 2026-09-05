import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

import GeoMap from "./components/GeoMap";
import FacilityMap from "./components/FacilityMap";
import EnvironmentPanel from "./components/EnvironmentPanel";
import DominoVisualizer from "./components/DominoVisualizer";
import GraphEvacuationMap from "./components/GraphEvacuationMap";
import AlertCenterModal from "./components/AlertCenterModal";
import { SafeZoneApi } from "./services/api";
import {
  INITIAL_FACILITY_ASSETS,
  MOCK_SIMULATION_RESULT,
  MOCK_REPORTS
} from "./services/mockData";

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
    subtitle: "Facility safety intelligence, environmental conditions, and live system status.",
  },
  geoMap: {
    title: "Geographic Map",
    subtitle: "Select an industrial zone, inspect locality and emergency shelters.",
  },
  map: {
    title: "Facility Builder",
    subtitle: "Create, position, and manage your industrial assets and containment barriers.",
  },
  heatmap: {
    title: "Risk Heat Map",
    subtitle: "Visual risk distribution and hazard contour fields across the facility.",
  },
  simulation: {
    title: "Simulation Center",
    subtitle: "Run wind-aware Sedov-Taylor blast, thermal radiation, and dispersion models.",
  },
  domino: {
    title: "Domino Effect",
    subtitle: "Review cascading escalation pathways, rupture timelines, and asset vulnerability.",
  },
  blast: {
    title: "Blast Analysis",
    subtitle: "Analyze overpressure shock fronts, impulse propagation, and structural impact.",
  },
  evacuation: {
    title: "Evacuation Plan",
    subtitle: "Tactical escape corridors, cutoff zones, assembly areas, and emergency shelters.",
  },
  reports: {
    title: "Reports",
    subtitle: "Automated risk assessment reports, domino logs, and incident exports.",
  },
};

function App() {
  const [landing, setLanding] = useState(true);
  const [page, setPage] = useState("dashboard");
  const [theme, setTheme] = useState("dark");
  const [assets, setAssets] = useState(INITIAL_FACILITY_ASSETS);
  const [selectedId, setSelectedId] = useState("T-101");
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Environmental conditions
  const [windSpeed, setWindSpeed] = useState("5.4");
  const [windDirection, setWindDirection] = useState("NW");
  const [temperature, setTemperature] = useState("28.5");
  const [ambientPressure, setAmbientPressure] = useState("101.3");

  // Backend connection & Simulation states
  const [backendStatus, setBackendStatus] = useState({
    isOnline: false,
    isLive: false,
    message: "Connecting to SafeZone Backend..."
  });
  const [simulationResult, setSimulationResult] = useState(MOCK_SIMULATION_RESULT);
  const [simulationHistory, setSimulationHistory] = useState([MOCK_SIMULATION_RESULT]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Check backend health on mount and periodically
  useEffect(() => {
    async function checkHealth() {
      const health = await SafeZoneApi.checkBackendHealth();
      setBackendStatus(health);
    }
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3000);
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
    const definition = ASSET_TYPES.find((item) => item.type === type);
    if (!definition) return;

    const sameType = assets.filter((asset) => asset.type === type).length;
    const prefix =
      type === "tank" ? "T" :
      type === "pressure-vessel" ? "PV" :
      type === "reactor" ? "R" :
      type === "boiler" ? "BLR" :
      type === "furnace" ? "FUR" :
      type === "heat-exchanger" ? "HX" :
      type === "building" ? "BLDG" :
      type === "control-room" ? "CTRL" :
      type === "warehouse" ? "WH" :
      type === "laboratory" ? "LAB" :
      type === "maintenance" ? "MAINT" :
      type === "admin" ? "ADM" :
      type === "storage" ? "ST" :
      type === "chemical-storage" ? "CHEM" :
      type === "fuel-storage" ? "FUEL" :
      type === "gas-storage" ? "GAS" :
      type === "fire-water-tank" ? "FWT" :
      type === "machine" ? "M" :
      type === "pump" ? "P" :
      type === "compressor" ? "COMP" :
      type === "cooling-tower" ? "CT" :
      type === "flare-stack" ? "FLR" :
      type === "pipeline" ? "PIPE" :
      type === "pipe-rack" ? "RACK" :
      type === "loading-bay" ? "LOAD" :
      type === "truck-loading" ? "TRUCK" :
      type === "rail-loading" ? "RAIL" :
      type === "road" ? "ROAD" :
      type === "substation" ? "SUB" :
      type === "shelter" ? "SAFE" :
      type === "exit" ? "EXIT" :
      type === "access" ? "ACCESS" :
      type === "hydrant" ? "HYD" :
      type === "detector" ? "DET" :
      type === "assembly-point" ? "ASM" :
      type === "main-gate" ? "GATE" :
      type === "security" ? "SEC" : "ASSET";

    const newAsset = {
      id: `${prefix}-${String(sameType + 1).padStart(2, "0")}`,
      type,
      name: `${definition.label} ${sameType + 1}`,
      icon: definition.icon,
      x: 45 + (sameType % 5) * 4,
      y: 45 + Math.floor(sameType / 5) * 5,
      status: "Normal",
      capacity: type === "tank" ? 500 : undefined,
      fuel: type === "tank" ? "LPG" : undefined,
      pressure: type === "tank" ? 10 : undefined,
      temperature: type === "tank" ? 25 : undefined,
    };

    setAssets((current) => [...current, newAsset]);
    setSelectedId(newAsset.id);
    showToast(`${definition.label} added to model`);
  };

  const handleRunSimulation = async (simParams = {}) => {
    setIsSimulating(true);
    showToast("Executing physics simulation...");

    const targetSourceId = simParams.sourceAssetId || selectedId || "T-101";
    const srcAsset = assets.find((a) => a.id === targetSourceId) || assets[0];
    const sourcePosition = { x: Number(srcAsset?.x ?? 22), y: Number(srcAsset?.y ?? 28) };

    try {
      const payload = {
        requestId: `req-${Date.now()}`,
        sourceAssetId: targetSourceId,
        sourcePosition: sourcePosition,
        energyJ: Number(simParams.energyJ) || 2.5e9,
        durationSeconds: Number(simParams.durationSeconds) || 1.5,
        windSpeedKmh: Number(windSpeed) * 3.6,
        windDirectionDeg: windDirection === "N" ? 0 :
                          windDirection === "NE" ? 45 :
                          windDirection === "E" ? 90 :
                          windDirection === "SE" ? 135 :
                          windDirection === "S" ? 180 :
                          windDirection === "SW" ? 225 :
                          windDirection === "W" ? 270 : 315,
        ambientPressurePa: Number(ambientPressure) * 1000 || 101325,
        airDensityKgM3: 1.225,
        assets: assets,
        ...simParams
      };

      const result = await SafeZoneApi.runSimulation(payload);
      setSimulationResult(result.data);
      setSimulationHistory((prev) => [result.data, ...prev.slice(0, 9)]);

      if (result.isLive) {
        showToast(`Simulation complete: ${result.engine}`);
      } else {
        showToast("Simulation generated via Analytical Demonstrator (Offline)");
      }
    } catch (err) {
      console.error("Simulation error:", err);
      showToast("Simulation calculation failed, using cached baseline");
    } finally {
      setIsSimulating(false);
    }
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
        backendStatus={backendStatus}
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
            simulationResult={simulationResult}
            setPage={setPage}
            onOpenAlerts={() => setIsAlertsOpen(true)}
          />

          {page === "dashboard" && (
            <Dashboard
              assets={assets}
              setPage={setPage}
              windSpeed={windSpeed}
              setWindSpeed={setWindSpeed}
              windDirection={windDirection}
              setWindDirection={setWindDirection}
              temperature={temperature}
              setTemperature={setTemperature}
              ambientPressure={ambientPressure}
              setAmbientPressure={setAmbientPressure}
              simulationResult={simulationResult}
              backendStatus={backendStatus}
              onOpenAlerts={() => setIsAlertsOpen(true)}
            />
          )}

          {page === "geoMap" && (
            <GeoMap
              onEnterZone={() => {
                setPage("map");
                showToast("Entered Industrial Zone 01");
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
              simulationResult={simulationResult}
              selectedId={selectedId}
              setSelectedId={setSelectedId}
              onRunSim={(sourceId) => handleRunSimulation(sourceId ? { sourceAssetId: sourceId } : {})}
              isSimulating={isSimulating}
            />
          )}

          {page === "simulation" && (
            <Simulation
              assets={assets}
              simulationResult={simulationResult}
              simulationHistory={simulationHistory}
              setSimulationResult={setSimulationResult}
              onRunSimulation={handleRunSimulation}
              isSimulating={isSimulating}
              windSpeed={windSpeed}
              windDirection={windDirection}
              ambientPressure={ambientPressure}
              showToast={showToast}
            />
          )}

          {page === "domino" && (
            <DominoAnalysis
              assets={assets}
              simulationResult={simulationResult}
              onSimulate={handleRunSimulation}
              selectedId={selectedId}
              setSelectedId={setSelectedId}
            />
          )}

          {page === "blast" && (
            <BlastAnalysis
              assets={assets}
              simulationResult={simulationResult}
              selectedId={selectedId}
              setSelectedId={setSelectedId}
              onRunSimulation={handleRunSimulation}
              isSimulating={isSimulating}
            />
          )}

          {page === "evacuation" && (
            <Evacuation
              assets={assets}
              simulationResult={simulationResult}
            />
          )}

          {page === "reports" && (
            <Reports
              simulationResult={simulationResult}
              selectedReport={selectedReport}
              setSelectedReport={setSelectedReport}
            />
          )}
        </main>
      </div>

      <StatusBar
        assets={assets}
        windSpeed={windSpeed}
        windDirection={windDirection}
        backendStatus={backendStatus}
      />

      {toast && <Toast message={toast} />}

      <AlertCenterModal
        isOpen={isAlertsOpen}
        onClose={() => setIsAlertsOpen(false)}
        simulationResult={simulationResult}
        assets={assets}
        setPage={setPage}
        setSelectedId={setSelectedId}
      />
    </div>
  );
}

/* =========================================================
   1. LANDING
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
  backendStatus,
  onMenu,
}) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="mobile-menu" onClick={onMenu} aria-label="Toggle Navigation">
          ☰
        </button>

        <div className="top-context">
          <span>FACILITY</span>
          <b>ZONE 01</b>
        </div>
      </div>

      <div className="topbar-center">
        <div className="system-indicator">
          <span className={backendStatus?.isOnline ? "live-dot online" : "live-dot mock"} />
          {backendStatus?.isOnline ? "CORE BACKEND ONLINE" : "OFFLINE / MOCK MODE"}
        </div>
      </div>

      <div className="topbar-actions">
        <button
          className="icon-button"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          title="Toggle theme"
        >
          {theme === "dark" ? "☼" : "☾"}
        </button>

        <div className="operator">
          <div className="operator-avatar">OP</div>
          <div>
            <strong>Safety Console</strong>
            <small>{backendStatus?.isOnline ? "Live Sync" : "Local Mode"}</small>
          </div>
        </div>
      </div>
    </header>
  );
}

/* =========================================================
   SIDEBAR
   ========================================================= */

function Sidebar({ page, setPage, open }) {
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
            <div className="nav-label">{group.label}</div>

            {group.items.map(([id, label, icon]) => (
              <button
                key={id}
                className={`nav-item ${page === id ? "active" : ""}`}
                onClick={() => setPage(id)}
              >
                <span className="nav-icon">{icon}</span>
                <span>{label}</span>
                {page === id && <i className="nav-active-line" />}
              </button>
            ))}
          </div>
        ))}

        <div className="sidebar-bottom">
          <div className="connection-card">
            <span className="connection-light" />
            <div>
              <strong>SafeZone AI Core</strong>
              <small>Physics & Risk Platform</small>
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

function PageHeader({ page, search, setSearch, simulationResult, setPage, onOpenAlerts }) {
  const data = PAGE_DATA[page] || { title: page, subtitle: "" };
  const sourceId = simulationResult?.parameters?.sourceAssetId || "T-101";

  return (
    <div className="page-header">
      <div>
        <div className="breadcrumb">
          SAFEZONE AI
          <span>/</span>
          {page.toUpperCase()}
        </div>

        <h1>{data.title}</h1>
        <p>{data.subtitle}</p>
      </div>

      <div className="header-tools">
        {simulationResult && (
          <div
            className="active-sim-chip"
            onClick={onOpenAlerts}
            title="Active Emergency Incident Alert - Click to inspect safety directives"
          >
            <span className="chip-dot" />
            <div className="chip-text">
              <span className="chip-title">
                LOADED RUN: <strong>{simulationResult.simulationId || "sim-default"}</strong>
              </span>
              <small>
                Epicenter: <b>{sourceId}</b> · Peak: <b>{simulationResult.blastMetrics?.peakOverpressureKPa || 320} kPa</b> · Radius: <b>{simulationResult.blastMetrics?.finalRadiusMeters || 92}m</b>
              </small>
            </div>
            <span
              className="chip-arrow"
              onClick={(e) => {
                e.stopPropagation();
                setPage("simulation");
              }}
              title="Click to jump directly to Simulation Center"
            >
              VIEW SIMULATION →
            </span>
          </div>
        )}

        <div className="search-box">
          <span>⌕</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search facility assets..."
          />
          <kbd>⌘ K</kbd>
        </div>

        <button
          className="notification"
          title="Active Safety & Incident Alarms (Click to Inspect)"
          onClick={onOpenAlerts}
          style={{ cursor: "pointer", position: "relative" }}
        >
          <span className="alert-beacon-dot" />
          ◇
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   2. DASHBOARD
   ========================================================= */

function Dashboard({
  assets,
  setPage,
  windSpeed,
  setWindSpeed,
  windDirection,
  setWindDirection,
  temperature,
  setTemperature,
  ambientPressure,
  setAmbientPressure,
  simulationResult,
  backendStatus,
  onOpenAlerts
}) {
  const tanks = assets.filter((asset) => asset.type === "tank" || asset.type === "fuel-storage" || asset.type === "fire-water-tank").length;
  const criticalAssets = assets.filter((a) => a.riskLevel === "Critical" || a.status === "Critical").length;

  const cards = [
    {
      label: "TOTAL ASSETS",
      value: assets.length,
      detail: "Registered in Zone 01",
      icon: "◇",
      onClick: () => setPage("map")
    },
    {
      label: "STORAGE VESSELS",
      value: tanks,
      detail: "High-energy tanks & spheres",
      icon: "◎",
      onClick: () => setPage("map")
    },
    {
      label: "SYSTEM HEALTH",
      value: backendStatus?.isOnline ? "99.8" : "98.4",
      suffix: "%",
      detail: backendStatus?.isOnline ? "Backend Live Connected" : "Local Engine Ready",
      icon: "✓",
    },
    {
      label: "ACTIVE ALERTS",
      value: criticalAssets > 0 ? `0${criticalAssets + 1}` : "03",
      detail: "Requires risk attention (Click to inspect)",
      icon: "!",
      danger: true,
      onClick: onOpenAlerts
    },
  ];

  return (
    <div className="dashboard-page">
      <section className="metric-grid">
        {cards.map((card, index) => (
          <div
            className={`metric-card ${card.danger ? "danger" : ""}`}
            key={card.label}
            style={{ animationDelay: `${index * 70}ms`, cursor: card.onClick ? "pointer" : "default" }}
            onClick={card.onClick}
          >
            <div className="metric-top">
              <span>{card.label}</span>
              <i>{card.icon}</i>
            </div>
            <div className="metric-value">
              {card.value}
              {card.suffix && <small>{card.suffix}</small>}
            </div>
            <div className="metric-detail">{card.detail}</div>
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

        <EnvironmentPanel
          windSpeed={windSpeed}
          setWindSpeed={setWindSpeed}
          windDirection={windDirection}
          setWindDirection={setWindDirection}
          temperature={temperature}
          setTemperature={setTemperature}
          ambientPressure={ambientPressure}
          setAmbientPressure={setAmbientPressure}
        />
      </section>

      <section className="dashboard-grid lower">
        <div className="panel">
          <PanelHeading
            title="Facility Status"
            eyebrow="ASSET INVENTORY"
            action="VIEW ALL"
            onAction={() => setPage("map")}
          />

          <div className="status-list">
            {assets.slice(0, 6).map((asset) => (
              <div className="status-row" key={asset.id}>
                <div className="status-asset">
                  <span
                    className={`asset-status ${
                      asset.status === "Safe" ? "safe" :
                      asset.status === "Critical" ? "critical" :
                      asset.status === "Warning" ? "warning" : ""
                    }`}
                  />
                  <div>
                    <strong>{asset.id}</strong>
                    <small>{asset.name}</small>
                  </div>
                </div>

                <span className={`normal-badge ${asset.riskLevel === "Critical" ? "danger-text" : ""}`}>
                  {asset.status || "Normal"}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel alert-panel">
          <PanelHeading
            title="Risk Events"
            eyebrow="LIVE MONITORING"
            action="OPEN ALERTS"
            onAction={onOpenAlerts}
          />

          <div className="event">
            <span className="event-marker danger" />
            <div>
              <strong>Primary Risk: {simulationResult?.parameters?.sourceAssetId || "T-101"} Vapor Cloud Explosion</strong>
              <small>Peak Overpressure: {simulationResult?.blastMetrics?.peakOverpressureKPa || 320} kPa</small>
            </div>
            <span className="event-level danger-text">CRITICAL</span>
          </div>

          <div className="event">
            <span className="event-marker warning" />
            <div>
              <strong>Domino Escalation Risk at T-102</strong>
              <small>Secondary Rupture Probability: 72% within 165s</small>
            </div>
            <span className="event-level">REVIEW</span>
          </div>

          <div className="event">
            <span className="event-marker safe" />
            <div>
              <strong>Emergency Bunker SAFE-01 Operational</strong>
              <small>Overpressure Protection Dampers Active</small>
            </div>
            <span className="event-level">OK</span>
          </div>
        </div>
      </section>
    </div>
  );
}

/* =========================================================
   5. RISK HEAT MAP
   ========================================================= */

function HeatMap({
  assets,
  windSpeed,
  windDirection,
  simulationResult,
  selectedId,
  setSelectedId,
  onRunSim,
  isSimulating
}) {
  const [viewMode, setViewMode] = useState("composite"); // "composite" | "blast"
  const sourceAssetId = simulationResult?.parameters?.sourceAssetId || selectedId || "T-101";
  const source = assets.find((a) => a.id === sourceAssetId) || assets[0];
  const inspectedAsset = assets.find((a) => a.id === (selectedId || sourceAssetId)) || source;

  // Calculate asset-specific hazard and exposure metrics
  const getAssetExposure = (asset) => {
    if (asset.id === sourceAssetId) {
      return {
        level: "critical",
        overpressureKPa: simulationResult?.blastMetrics?.peakOverpressureKPa || 320,
        thermalKwM2: 150.0,
        damageState: "TOTAL_LOSS",
        failureProbability: 1.0,
        isEpicenter: true
      };
    }

    const match = (simulationResult?.affectedAssets || []).find((a) => a.assetId === asset.id);
    let blastPressure = match ? match.peakOverpressureKPa : 2.1;
    let blastThermal = match ? match.peakThermalRadiationKwM2 : 1.0;
    let blastDamage = match ? match.damageState : "NO_SIGNIFICANT_DAMAGE";
    let blastProb = match ? match.failureProbabilityEstimate : 0.02;

    let blastLevel = blastPressure >= 70 ? "critical" :
                     blastPressure >= 20 ? "high" :
                     blastPressure >= 5 ? "moderate" : "low";

    // Intrinsic hazard profile of volatile/pressurized assets
    let intrinsicLevel = "low";
    if (asset.type === "tank" || asset.type === "pressure-vessel") {
      intrinsicLevel = (asset.id === "T-101" || asset.id === "T-102") ? "high" : "moderate";
    } else if (asset.type === "reactor" || asset.type === "chemical-storage" || asset.type === "pipeline") {
      intrinsicLevel = "moderate";
    }

    const priority = { critical: 4, high: 3, moderate: 2, low: 1 };
    const level = priority[blastLevel] >= priority[intrinsicLevel] ? blastLevel : intrinsicLevel;

    return {
      level,
      overpressureKPa: blastPressure,
      thermalKwM2: blastThermal,
      damageState: blastDamage,
      failureProbability: blastProb,
      isEpicenter: false
    };
  };

  const inspectedExposure = getAssetExposure(inspectedAsset);

  return (
    <div className="analysis-page">
      <div className="analysis-toolbar">
        <div>
          <span className="analysis-live">
            {simulationResult?.isMock ? "CALIBRATED OFFLINE MODEL" : "LIVE PHYSICS ENGINE"}
          </span>
          <strong>Facility Multi-Asset Risk Field & Blast Dispersion</strong>
        </div>

        <div className="toolbar-actions-right" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {/* EPICENTER SELECTOR */}
          <div className="sim-field-inline" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <label style={{ fontSize: "10px", color: "var(--muted)" }}>Active Epicenter:</label>
            <select
              value={sourceAssetId}
              onChange={(e) => onRunSim(e.target.value)}
              className="inspector-select"
              style={{ height: "28px", width: "160px", fontSize: "10px" }}
            >
              {assets.filter((a) => a.type === "tank" || a.type === "reactor" || a.type === "boiler" || a.type === "chemical-storage").map((a) => (
                <option key={a.id} value={a.id}>{a.id} - {a.name}</option>
              ))}
            </select>
          </div>

          <div className="mode-toggle-group">
            <button
              className={`toggle-btn ${viewMode === "composite" ? "active" : ""}`}
              onClick={() => setViewMode("composite")}
            >
              ALL TANKS & ASSETS RISK
            </button>
            <button
              className={`toggle-btn ${viewMode === "blast" ? "active" : ""}`}
              onClick={() => setViewMode("blast")}
            >
              SIMULATED BLAST PLUME
            </button>
          </div>

          <button
            className="primary-action-btn"
            onClick={() => onRunSim(inspectedAsset.id)}
            disabled={isSimulating}
          >
            {isSimulating ? "COMPUTING..." : `RECALCULATE FROM ${inspectedAsset.id} ⟳`}
          </button>
        </div>
      </div>

      <div className="heatmap-layout">
        <div className="heatmap-view">
          <div className="heatmap-grid" />

          {/* MODE 1: COMPOSITE MULTI-TANK HAZARD FIELD */}
          {viewMode === "composite" && (
            <>
              {assets.map((asset) => {
                const exposure = getAssetExposure(asset);
                if (exposure.level === "low") return null;

                const cloudClass =
                  exposure.level === "critical" ? "risk-red" :
                  exposure.level === "high" ? "risk-orange" : "risk-yellow";

                const size =
                  exposure.level === "critical" ? 220 :
                  exposure.level === "high" ? 170 : 120;

                return (
                  <div
                    key={`risk-cloud-${asset.id}`}
                    className={`risk-cloud ${cloudClass}`}
                    style={{
                      left: `${asset.x}%`,
                      top: `${asset.y}%`,
                      width: `${size}px`,
                      height: `${size}px`,
                      opacity: exposure.isEpicenter ? 0.9 : 0.65,
                    }}
                  />
                );
              })}
            </>
          )}

          {/* MODE 2: SINGLE EPICENTER DISPERSION PLUME */}
          {viewMode === "blast" && (
            <>
              <div
                className="risk-cloud risk-red"
                style={{
                  left: `${source?.x || 22}%`,
                  top: `${source?.y || 28}%`,
                  width: "190px",
                  height: "190px",
                }}
              />
              <div
                className="risk-cloud risk-orange"
                style={{
                  left: `${(source?.x || 22) + 2}%`,
                  top: `${(source?.y || 28) + 2}%`,
                  width: "300px",
                  height: "300px",
                }}
              />
              <div
                className="risk-cloud risk-yellow"
                style={{
                  left: `${(source?.x || 22) + 4}%`,
                  top: `${(source?.y || 28) + 3}%`,
                  width: "440px",
                  height: "440px",
                }}
              />
            </>
          )}

          {/* ASSET MARKERS WITH RISK BADGES */}
          {assets.map((asset) => {
            const exposure = getAssetExposure(asset);
            const isSelected = asset.id === inspectedAsset.id;

            return (
              <div
                key={asset.id}
                className={`heatmap-asset-pill ${exposure.level} ${isSelected ? "selected-pin" : ""}`}
                style={{
                  left: `${asset.x}%`,
                  top: `${asset.y}%`,
                }}
                onClick={() => setSelectedId?.(asset.id)}
                title={`Click to inspect ${asset.id}`}
              >
                <span className="pill-id">{asset.id}</span>
                <span className="pill-val">{exposure.overpressureKPa.toFixed(0)} kPa</span>
              </div>
            );
          })}

          <div className="wind-vector">
            WIND {windSpeed} m/s · {windDirection} ({(Number(windSpeed || 0) * 3.6).toFixed(1)} km/h)
            <span>→</span>
          </div>

          <div className="heatmap-overlay-title">
            {viewMode === "composite" ? "MULTI-ASSET FACILITY RISK FIELD" : "DIRECTIONAL BLAST & THERMAL PLUME"}
            <small>PRIMARY EPICENTER: {source?.id} · ACTIVE INSPECTOR: {inspectedAsset?.id}</small>
          </div>
        </div>

        <div className="analysis-side panel">
          <PanelHeading title="Asset Risk Inspector" eyebrow="HAZARD METRICS" />

          <div className="inspected-asset-card">
            <div className="inspected-top">
              <span className={`badge-state ${inspectedExposure.level}`}>
                {inspectedExposure.level.toUpperCase()} HAZARD
              </span>
              <strong>{inspectedAsset.id}</strong>
            </div>
            <div className="inspected-name">{inspectedAsset.name}</div>
            <div className="inspected-meta">
              Type: {inspectedAsset.type} {inspectedAsset.fuel ? `· Fuel: ${inspectedAsset.fuel}` : ""}
            </div>

            <div className="inspected-metrics-grid">
              <div className="metric-box">
                <span>PEAK OVERPRESSURE</span>
                <b className={inspectedExposure.overpressureKPa >= 70 ? "danger-text" : ""}>
                  {inspectedExposure.overpressureKPa} kPa
                </b>
              </div>
              <div className="metric-box">
                <span>THERMAL RADIATION</span>
                <b>{inspectedExposure.thermalKwM2} kW/m²</b>
              </div>
              <div className="metric-box">
                <span>RUPTURE RISK</span>
                <b>{(inspectedExposure.failureProbability * 100).toFixed(0)}%</b>
              </div>
              <div className="metric-box">
                <span>DAMAGE STATE</span>
                <strong style={{ fontSize: "10px" }}>{inspectedExposure.damageState}</strong>
              </div>
            </div>

            <button
              className="primary-action-btn"
              style={{ width: "100%", marginTop: "10px" }}
              onClick={() => onRunSim(inspectedAsset.id)}
            >
              SIMULATE BLAST FROM {inspectedAsset.id} →
            </button>
          </div>

          <div className="risk-legend" style={{ marginTop: "12px" }}>
            <div>
              <i className="legend-red" />
              <span><strong>Critical</strong> (≥ 70 kPa / ≥ 37.5 kW/m²)</span>
            </div>
            <div>
              <i className="legend-orange" />
              <span><strong>High</strong> (≥ 20 kPa / ≥ 12.5 kW/m²)</span>
            </div>
            <div>
              <i className="legend-yellow" />
              <span><strong>Moderate</strong> (≥ 5 kPa / ≥ 4.0 kW/m²)</span>
            </div>
            <div>
              <i className="legend-green" />
              <span><strong>Low</strong> (Safe threshold &lt; 5 kPa)</span>
            </div>
          </div>

          <div className="affected-preview-list">
            <small className="section-subtitle">ALL FACILITY ASSETS (SELECT TO INSPECT)</small>
            <div className="asset-quick-select-list">
              {assets.map((a) => {
                const exp = getAssetExposure(a);
                return (
                  <div
                    key={a.id}
                    className={`affected-item-mini clickable ${a.id === inspectedAsset.id ? "active-row" : ""}`}
                    onClick={() => setSelectedId?.(a.id)}
                  >
                    <div className="affected-asset-info">
                      <strong className="affected-id">{a.id}</strong>
                      <span className="affected-sep">-</span>
                      <span className="affected-name">{a.name}</span>
                    </div>
                    <span className={`affected-kpa-pill level-${exp.level}`}>
                      {exp.overpressureKPa.toFixed(0)} kPa
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   6. SIMULATION CENTER
   ========================================================= */

function Simulation({
  assets,
  simulationResult,
  simulationHistory = [],
  setSimulationResult,
  onRunSimulation,
  isSimulating,
  windSpeed,
  windDirection,
  ambientPressure,
  showToast
}) {
  const [activeTab, setActiveTab] = useState("results"); // "results" | "history" | "physics"
  const [scenarioType, setScenarioType] = useState("blast");
  const [sourceAssetId, setSourceAssetId] = useState(
    simulationResult?.parameters?.sourceAssetId || "T-101"
  );
  const [energyExp, setEnergyExp] = useState(
    simulationResult?.parameters?.energyJ ? (simulationResult.parameters.energyJ / 1e9).toFixed(1) : "2.5"
  );
  const [durationSeconds, setDurationSeconds] = useState(
    simulationResult?.parameters?.durationSeconds ? String(simulationResult.parameters.durationSeconds) : "1.5"
  );

  useEffect(() => {
    if (simulationResult?.parameters?.sourceAssetId) {
      setSourceAssetId(simulationResult.parameters.sourceAssetId);
    }
    if (simulationResult?.parameters?.energyJ) {
      setEnergyExp((simulationResult.parameters.energyJ / 1e9).toFixed(1));
    }
    if (simulationResult?.parameters?.durationSeconds) {
      setDurationSeconds(String(simulationResult.parameters.durationSeconds));
    }
  }, [simulationResult]);

  const handleSimulate = (e) => {
    e?.preventDefault();
    onRunSimulation({
      scenarioType,
      sourceAssetId,
      energyJ: Number(energyExp) * 1e9,
      durationSeconds: Number(durationSeconds),
    });
  };

  return (
    <div className="analysis-page">
      <div className="simulation-hero panel">
        <div className="simulation-orbit">
          <div />
          <div />
          <div />
        </div>

        <div className="simulation-content">
          <span className="hero-tag">PYTHON & SPRING BOOT SIMULATION ENGINE</span>
          <h2>Simulation Center</h2>
          <p>
            Configure scenario physics parameters, execute wind-aware explosion models,
            and inspect canonical hazard outputs.
          </p>

          <form className="sim-control-bar" onSubmit={handleSimulate}>
            <div className="sim-field">
              <label>Source Vessel</label>
              <select
                value={sourceAssetId}
                onChange={(e) => setSourceAssetId(e.target.value)}
              >
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.id} - {a.name} ({a.type})
                  </option>
                ))}
              </select>
            </div>

            <div className="sim-field">
              <label>Energy (10⁹ Joules)</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="50"
                value={energyExp}
                onChange={(e) => setEnergyExp(e.target.value)}
              />
            </div>

            <div className="sim-field">
              <label>Duration (s)</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="10"
                value={durationSeconds}
                onChange={(e) => setDurationSeconds(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="primary-action"
              disabled={isSimulating}
            >
              {isSimulating ? "COMPUTING PHYSICS..." : "RUN SIMULATION →"}
            </button>
          </form>
        </div>
      </div>

      <div className="sim-status-banner">
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <span className={simulationResult?.isMock ? "status-tag preview" : "status-tag live"}>
            {simulationResult?.isMock ? "CALIBRATED OFFLINE DEMO DATA" : "LIVE SIMULATION OUTPUT"}
          </span>
          <span>Run ID: <strong>{simulationResult?.simulationId}</strong> · Exec Time: {simulationResult?.executionTimeMs} ms</span>
        </div>

        {/* SUBNAVIGATION TABS */}
        <div className="sim-sub-tabs">
          <button
            className={`tab-item ${activeTab === "results" ? "active" : ""}`}
            onClick={() => setActiveTab("results")}
          >
            📊 LIVE IMPACT RESULTS
          </button>
          <button
            className={`tab-item ${activeTab === "history" ? "active" : ""}`}
            onClick={() => setActiveTab("history")}
          >
            🕒 SIMULATION HISTORY ({simulationHistory.length})
          </button>
          <button
            className={`tab-item ${activeTab === "physics" ? "active" : ""}`}
            onClick={() => setActiveTab("physics")}
          >
            📐 PHYSICS CURVES & JSON
          </button>
        </div>
      </div>

      {/* TAB 1: LIVE SIMULATION IMPACT RESULTS */}
      {activeTab === "results" && (
        <>
          <div className="simulation-grid">
            <SimulationCard
              title="Blast / Pressure"
              icon="◈"
              active={scenarioType === "blast"}
              onClick={() => setScenarioType("blast")}
              metrics={[
                { label: "Peak Overpressure", value: `${simulationResult?.blastMetrics?.peakOverpressureKPa || 320} kPa` },
                { label: "Shock Velocity", value: `${simulationResult?.blastMetrics?.shockSpeedMps || 645} m/s` },
                { label: "Blast Radius", value: `${simulationResult?.blastMetrics?.finalRadiusMeters || 92} m` },
              ]}
              text="Wind-corrected Sedov-Taylor shock wave front and dynamic peak pressure field."
            />

            <SimulationCard
              title="Thermal Radiation"
              icon="◉"
              active={scenarioType === "thermal"}
              onClick={() => setScenarioType("thermal")}
              metrics={[
                { label: "Max Heat Flux", value: "150.0 kW/m²" },
                { label: "Ignition Zone (37.5 kW)", value: "35.0 m" },
                { label: "Burn Zone (12.5 kW)", value: "68.0 m" },
              ]}
              text="Pool & jet fire radiation geometry with view factor integration."
            />

            <SimulationCard
              title="Dispersion"
              icon="≋"
              active={scenarioType === "dispersion"}
              onClick={() => setScenarioType("dispersion")}
              metrics={[
                { label: "Plume Direction", value: `${windDirection} (${(Number(windSpeed)*3.6).toFixed(1)} km/h)` },
                { label: "LEL Boundary", value: "125.0 m" },
                { label: "Atmosphere", value: "Class D Stable" },
              ]}
              text="Gaussian plume atmospheric concentration and toxic vapor drift modeling."
            />

            <SimulationCard
              title="Sedov–Taylor Analytic"
              icon="△"
              active={scenarioType === "sedov"}
              onClick={() => setScenarioType("sedov")}
              metrics={[
                { label: "Dimensionless ξ", value: "1.033" },
                { label: "Adiabatic Index γ", value: "1.40" },
                { label: "Wind Skew Factor", value: `${simulationResult?.blastMetrics?.windAsymmetryFactor || 1.24}` },
              ]}
              text="Self-similar strong point explosion analytical formulation with wind correction."
            />
          </div>

          <div className="panel sim-results-table-panel">
            <PanelHeading title="Affected Assets Exposure Matrix" eyebrow="SIMULATION SUMMARY" />
            <div className="sim-table-wrap">
              <table className="sim-table">
                <thead>
                  <tr>
                    <th>ASSET</th>
                    <th>NAME</th>
                    <th>DISTANCE</th>
                    <th>OVERPRESSURE</th>
                    <th>THERMAL FLUX</th>
                    <th>DAMAGE STATE</th>
                    <th>RUPTURE PROBABILITY</th>
                  </tr>
                </thead>
                <tbody>
                  {(simulationResult?.affectedAssets || []).map((asset) => (
                    <tr key={asset.assetId}>
                      <td><strong>{asset.assetId}</strong></td>
                      <td>{asset.name}</td>
                      <td>{asset.distanceMeters} m</td>
                      <td><b className={asset.peakOverpressureKPa >= 50 ? "danger-text" : asset.peakOverpressureKPa >= 20 ? "warning-text" : ""}>{asset.peakOverpressureKPa} kPa</b></td>
                      <td>{asset.peakThermalRadiationKwM2} kW/m²</td>
                      <td>
                        <span className={`badge-state ${asset.damageState.toLowerCase()}`}>
                          {asset.damageState}
                        </span>
                      </td>
                      <td>{(asset.failureProbabilityEstimate * 100).toFixed(0)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* TAB 2: SIMULATION RUNS HISTORY LOG */}
      {activeTab === "history" && (
        <div className="panel sim-history-panel">
          <PanelHeading title="Simulation Execution Log & History" eyebrow="SAVED RUNS" />
          <div className="sim-table-wrap">
            <table className="sim-table">
              <thead>
                <tr>
                  <th>RUN ID</th>
                  <th>SOURCE VESSEL</th>
                  <th>ENERGY</th>
                  <th>DURATION</th>
                  <th>PEAK PRESSURE</th>
                  <th>SEVERITY</th>
                  <th>EXEC TIME</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {simulationHistory.map((run, idx) => (
                  <tr key={run.simulationId || idx} className={run.simulationId === simulationResult?.simulationId ? "active-run-row" : ""}>
                    <td>
                      <code>{run.simulationId}</code>
                      {run.simulationId === simulationResult?.simulationId && (
                        <span className="badge-state safe" style={{ marginLeft: "6px" }}>ACTIVE</span>
                      )}
                    </td>
                    <td><strong>{run.parameters?.sourceAssetId || "T-101"}</strong></td>
                    <td>{((run.parameters?.energyJ || 2.5e9) / 1e9).toFixed(1)} × 10⁹ J</td>
                    <td>{run.parameters?.durationSeconds || 1.5}s</td>
                    <td><b className="danger-text">{run.blastMetrics?.peakOverpressureKPa || 320} kPa</b></td>
                    <td>
                      <span className={`badge-state ${run.overallSeverity?.toLowerCase() || "critical"}`}>
                        {run.overallSeverity || "CRITICAL"}
                      </span>
                    </td>
                    <td>{run.executionTimeMs || 140} ms</td>
                    <td>
                      <button
                        className="secondary-btn"
                        style={{ padding: "4px 8px", fontSize: "10px", background: "var(--red)", color: "#fff" }}
                        onClick={() => {
                          setSimulationResult(run);
                          setActiveTab("results");
                          showToast?.(`Loaded simulation run ${run.simulationId}`);
                        }}
                      >
                        LOAD RUN →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PHYSICS CURVES & DIRECT JSON INSPECTOR */}
      {activeTab === "physics" && (
        <div className="physics-inspector-grid">
          <div className="panel physics-curve-panel">
            <PanelHeading title="Sedov-Taylor Overpressure Decay Curve P(r)" eyebrow="THEORETICAL GAS DYNAMICS" />
            <div className="curve-chart-box">
              <svg viewBox="0 0 500 240" className="physics-svg">
                {/* Axes */}
                <line x1="50" y1="20" x2="50" y2="200" stroke="var(--line-strong)" strokeWidth="2" />
                <line x1="50" y1="200" x2="480" y2="200" stroke="var(--line-strong)" strokeWidth="2" />

                {/* Threshold Lines */}
                <line x1="50" y1="80" x2="480" y2="80" stroke="rgba(255, 59, 54, 0.4)" strokeDasharray="4" />
                <text x="55" y="75" fill="var(--red)" fontSize="9">70 kPa (Destruction Threshold)</text>

                <line x1="50" y1="140" x2="480" y2="140" stroke="rgba(255, 159, 28, 0.4)" strokeDasharray="4" />
                <text x="55" y="135" fill="var(--orange)" fontSize="9">20 kPa (Heavy Damage Threshold)</text>

                {/* Sedov Taylor Curve */}
                <path
                  d="M 50 30 Q 90 90, 160 145 T 320 185 T 480 195"
                  fill="none"
                  stroke="var(--red)"
                  strokeWidth="3"
                />

                {/* Asset Points on Curve */}
                <circle cx="50" cy="30" r="5" fill="var(--red)" />
                <text x="60" y="35" fill="#fff" fontSize="10">T-101 (0m, 320 kPa)</text>

                <circle cx="160" cy="145" r="4" fill="var(--orange)" />
                <text x="170" y="145" fill="#fff" fontSize="9">T-102 (42m, 48.5 kPa)</text>

                <circle cx="120" cy="115" r="4" fill="var(--orange)" />
                <text x="130" y="115" fill="#fff" fontSize="9">PIPE-01 (28m, 78 kPa)</text>

                <circle cx="280" cy="180" r="4" fill="var(--yellow)" />
                <text x="290" y="180" fill="#fff" fontSize="9">R-01 (65m, 34 kPa)</text>

                {/* Axis Labels */}
                <text x="240" y="225" fill="var(--muted)" fontSize="10">Distance r (meters)</text>
                <text x="15" y="110" fill="var(--muted)" fontSize="10" transform="rotate(-90 15 110)">Overpressure (kPa)</text>
              </svg>
            </div>
          </div>

          <div className="panel json-inspector-panel">
            <PanelHeading title="Canonical Response Payload" eyebrow="JSON DATA" />
            <pre className="json-pre">
              {JSON.stringify(simulationResult, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

function SimulationCard({
  title,
  icon,
  text,
  metrics = [],
  active,
  onClick
}) {
  return (
    <div
      className={`simulation-card panel ${active ? "active-card" : ""}`}
      onClick={onClick}
      style={{ cursor: "pointer" }}
    >
      <div className="sim-card-header">
        <div className="simulation-card-icon">{icon}</div>
        <h3>{title}</h3>
      </div>

      <div className="sim-card-metrics">
        {metrics.map((m) => (
          <div key={m.label} className="metric-row-mini">
            <span>{m.label}</span>
            <strong>{m.value}</strong>
          </div>
        ))}
      </div>

      <p>{text}</p>
      <span className="card-status-badge">READY FOR SIMULATION</span>
    </div>
  );
}

/* =========================================================
   7. DOMINO EFFECT
   ========================================================= */

function DominoAnalysis({ assets, simulationResult, onSimulate, selectedId, setSelectedId }) {
  const selectableTanks = useMemo(() => {
    const list = assets.filter(
      (a) =>
        a.type === "tank" ||
        a.type === "fuel-storage" ||
        a.type === "gas-storage" ||
        a.type === "reactor" ||
        a.type === "boiler" ||
        a.type === "pressure-vessel"
    );
    return list.length > 0 ? list : assets.slice(0, 6);
  }, [assets]);

  const [chosenSourceId, setChosenSourceId] = useState(null);
  const activeSourceId = chosenSourceId || simulationResult?.parameters?.sourceAssetId || selectedId || "T-101";
  const sourceAsset = assets.find((a) => a.id === activeSourceId) || { id: activeSourceId, name: "Primary Incident Epicenter", fuel: "LPG", capacity: 500, x: 22, y: 28 };

  const steps = useMemo(() => {
    if (simulationResult?.parameters?.sourceAssetId === activeSourceId && simulationResult?.dominoPropagation?.length > 0) {
      return simulationResult.dominoPropagation;
    }

    const otherAssets = assets.filter((a) => a.id !== activeSourceId);
    const sorted = [...otherAssets].sort((a, b) => {
      const da = Math.hypot(Number(a.x || 0) - Number(sourceAsset.x || 0), Number(a.y || 0) - Number(sourceAsset.y || 0));
      const db = Math.hypot(Number(b.x || 0) - Number(sourceAsset.x || 0), Number(b.y || 0) - Number(sourceAsset.y || 0));
      return da - db;
    }).slice(0, 3);

    const mechanisms = [
      { mech: "OVERPRESSURE_SHEAR", delay: 12, prob: 0.95, desc: "Blast wave snaps header flange, releasing pressurized vapor." },
      { mech: "THERMAL_RADIATION_RUPTURE", delay: 165, prob: 0.72, desc: "Thermal radiation heats unwetted shell plates leading to secondary BLEVE." },
      { mech: "JET_FIRE_IMPINGEMENT", delay: 240, prob: 0.58, desc: "High-temperature jet flame direct impingement compromises pump seal and motor block." }
    ];

    let prevId = activeSourceId;
    return sorted.map((target, idx) => {
      const m = mechanisms[idx] || mechanisms[0];
      const step = {
        stepOrder: idx + 1,
        triggerAssetId: prevId,
        targetAssetId: target.id,
        mechanism: m.mech,
        escalationProbabilityEstimate: m.prob,
        estimatedDelaySeconds: m.delay,
        riskContribution: `${target.name || target.id}: ${m.desc}`
      };
      prevId = target.id;
      return step;
    });
  }, [activeSourceId, simulationResult, assets, sourceAsset]);

  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(2);

  const handleTankChange = (newId) => {
    setChosenSourceId(newId);
    setSelectedId?.(newId);
    setCurrentTime(0);
    setIsPlaying(false);
    onSimulate?.({ sourceAssetId: newId });
  };

  return (
    <div className="analysis-page">
      <div className="analysis-toolbar domino-toolbar-custom">
        <div>
          <span className="analysis-live">CASCADE ESCALATION ENGINE</span>
          <strong>Domino Propagation Pathways & Secondary Rupture Risk</strong>
        </div>

        {/* EPICENTER TANK SELECTOR & QUICK CHIPS */}
        <div className="domino-epicenter-selector-wrap">
          <label className="epicenter-label">
            <span>💥 INCIDENT EPICENTER:</span>
            <select
              value={activeSourceId}
              onChange={(e) => handleTankChange(e.target.value)}
              className="domino-tank-select"
            >
              {selectableTanks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.id} - {t.name} ({t.fuel || t.type})
                </option>
              ))}
            </select>
          </label>

          <div className="quick-tank-pills">
            {selectableTanks.slice(0, 4).map((t) => (
              <button
                key={t.id}
                className={`quick-tank-chip ${activeSourceId === t.id ? "active" : ""}`}
                onClick={() => handleTankChange(t.id)}
                title={`Simulate domino cascade starting at ${t.id} (${t.name})`}
              >
                {t.id}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            className="secondary-btn"
            style={{ padding: "6px 12px", fontSize: "11px" }}
            onClick={() => {
              setCurrentTime(0);
              setIsPlaying(true);
            }}
          >
            ▶ ANIMATE PROPAGATION
          </button>
          <button
            className="primary-action-btn"
            onClick={() => onSimulate?.({ sourceAssetId: activeSourceId })}
          >
            RECOMPUTE ESCALATION ⟳
          </button>
        </div>
      </div>

      {/* INTERACTIVE 2D PROPAGATION ANIMATOR & TIMELINE SCRUBBER */}
      <DominoVisualizer
        assets={assets}
        steps={steps}
        sourceAsset={sourceAsset}
        currentTime={currentTime}
        setCurrentTime={setCurrentTime}
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
        playbackSpeed={playbackSpeed}
        setPlaybackSpeed={setPlaybackSpeed}
        onReset={() => {
          setCurrentTime(0);
          setIsPlaying(false);
        }}
        onSelectEpicenter={handleTankChange}
      />

      <div className="analysis-grid-two">
        <div className="panel domino-network-panel">
          <PanelHeading
            title="Cascading Propagation Chain"
            eyebrow="FAILURE PROGRESSION TIMELINE"
          />

          <div className="domino-chain-wrapper">
            {/* Primary Source Card */}
            <div
              className={`domino-node-card source-card ${currentTime >= 0 ? "breached-rupture" : ""}`}
              onClick={() => {
                setCurrentTime(0);
                setIsPlaying(false);
              }}
              style={{ cursor: "pointer" }}
              title="Click to seek timeline to T+0s"
            >
              <div className="domino-card-top">
                <span className="domino-phase-badge source-badge">PRIMARY EPICENTER · T+0s</span>
                <span className="domino-status-pill danger">RUPTURE / BLEVE</span>
              </div>
              <div className="domino-card-body">
                <div className="domino-asset-id">{sourceAsset.id}</div>
                <div className="domino-asset-name">{sourceAsset.name || "LPG Storage Sphere 1"}</div>
                <div className="domino-asset-detail">Fuel / Material: {sourceAsset.fuel || "LPG"} · Capacity: {sourceAsset.capacity || 500} m³</div>
              </div>
            </div>

            {/* Escalation Sequence */}
            {steps.map((step, idx) => {
              const prevStep = steps[idx - 1];
              const prevDelay = prevStep ? Number(prevStep.estimatedDelaySeconds) || 0 : 0;
              const delay = Number(step.estimatedDelaySeconds) || 0;

              const isRuptured = currentTime >= delay;
              const isImpinging = !isRuptured && currentTime >= prevDelay;

              const hopSpan = Math.max(delay - prevDelay, 0.1);
              const progressPct = Math.max(0, Math.min(100, Math.round(((currentTime - prevDelay) / hopSpan) * 100)));

              return (
                <div key={step.stepOrder || idx} className="domino-step-block">
                  <div className="domino-connector-bar">
                    <div className="connector-bar-progress">
                      <div className="connector-bar-fill" style={{ height: `${progressPct}%` }} />
                    </div>
                    <div className="connector-badge">
                      <span className="connector-mech">{step.mechanism ? step.mechanism.replace(/_/g, " ") : "THERMAL OVERPRESSURE"}</span>
                      <span className="connector-stats">
                        <strong>Δt {step.estimatedDelaySeconds}s</strong> · {(step.escalationProbabilityEstimate * 100).toFixed(0)}% Probability
                        {isImpinging && <span style={{ color: "#ff9f1c", marginLeft: "6px" }}>⚡ {progressPct}%</span>}
                      </span>
                    </div>
                    <div className="connector-arrow-head" style={{ color: isRuptured ? "#ff3b30" : isImpinging ? "#ff9f1c" : "var(--muted)" }}>▼</div>
                  </div>

                  <div
                    className={`domino-node-card target-card ${isRuptured ? "breached-rupture" : isImpinging ? "active-impingement" : ""}`}
                    onClick={() => {
                      setCurrentTime(delay);
                      setIsPlaying(false);
                    }}
                    style={{ cursor: "pointer" }}
                    title={`Click to seek timeline to T+${step.estimatedDelaySeconds}s`}
                  >
                    <div className="domino-card-top">
                      <span className="domino-phase-badge step-badge">STEP {step.stepOrder}: SECONDARY RECEPTOR</span>
                      <span className={isRuptured ? "domino-status-pill danger" : isImpinging ? "domino-prob-pill" : "badge-state"}>
                        {isRuptured
                          ? `💥 BREACHED AT T+${step.estimatedDelaySeconds}s`
                          : isImpinging
                          ? `⚡ IMPINGING (${Math.max(0, Math.round(delay - currentTime))}s LEFT)`
                          : `${(step.escalationProbabilityEstimate * 100).toFixed(0)}% RISK QUEUED`}
                      </span>
                    </div>
                    <div className="domino-card-body">
                      <div className="domino-asset-id">{step.targetAssetId}</div>
                      <div className="domino-step-reason">{step.riskContribution}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="panel domino-stats-panel">
          <PanelHeading
            title="Exposure Summary"
            eyebrow="STATISTICAL MODEL"
          />

          <div className="summary-number">
            {(simulationResult?.overallRiskScore || 84.5).toFixed(1)}
            <small>Overall Escalation Risk Score / 100</small>
          </div>

          <div className="summary-row">
            <span>Critical Escalation Chains</span>
            <b>{steps.length} Identified Pathways</b>
          </div>

          <div className="summary-row">
            <span>High Vulnerability Assets</span>
            <b className="danger-text">
              {(simulationResult?.affectedAssets || []).filter((a) => a.failureProbabilityEstimate > 0.5).length} Assets
            </b>
          </div>

          <div className="summary-row">
            <span>Time-To-Escalation Window</span>
            <b>12s – 240s</b>
          </div>

          <div className="summary-row">
            <span>First Responder Deluge Window</span>
            <b className="warning-text">&lt; 90 Seconds</b>
          </div>

          <div className="future-box">
            <span>TACTICAL MITIGATION DIRECTIVE</span>
            <strong>Active Deluge Countermeasure</strong>
            <p>
              Applying water spray deluge to secondary spheres within 90 seconds
              reduces thermal shell plate rupture probability from {(steps[0]?.escalationProbabilityEstimate * 100 || 72).toFixed(0)}% down to 18%.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   8. BLAST ANALYSIS (2D CARTESIAN PHYSICS SIMULATOR)
   ========================================================= */

function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius, fill, stroke) {
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.2;
  ctx.stroke();
}

function BlastAnalysis({
  assets,
  simulationResult,
  selectedId,
  setSelectedId,
  onRunSimulation,
  isSimulating
}) {
  const sourceAsset = assets.find((a) => a.id === selectedId) || assets[0];
  const initialEnergy = simulationResult?.parameters?.energyJ || 2.82e9;

  const [simTime, setSimTime] = useState(3.50);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sliderWindSpeed, setSliderWindSpeed] = useState(40.0);
  const [sliderWindDir, setSliderWindDir] = useState(90.0);
  const [energyJ, setEnergyJ] = useState(initialEnergy);
  const [showShockOutline, setShowShockOutline] = useState(true);

  const canvasRef = useRef(null);

  // Animation Loop
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setSimTime((prev) => {
        const next = Number((prev + 0.05).toFixed(2));
        if (next >= 10.0) {
          setIsPlaying(false);
          return 10.0;
        }
        return next;
      });
    }, 40);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Physics Calculations
  const t = Math.max(1e-3, simTime);
  const rho = 1.225;
  const xi = 1.0;
  const gamma = 1.4;
  const p0 = 101325.0;

  // Sedov Radius: R(t) = xi * (E / rho)^(1/5) * t^(2/5)
  const radius = xi * Math.pow(energyJ / rho, 0.2) * Math.pow(t, 0.4);
  // Shock Speed: v(t) = 0.4 * R(t) / t
  const speed = (0.4 * radius) / t;
  const post_shock = (2.0 * rho * Math.pow(speed, 2)) / (gamma + 1.0);
  const demo_scale = 0.08 * p0 * (Math.max(energyJ, 1.0) / 1e9) * 0.45 / (1.0 + (radius / 110.0) * 1.35);
  const overpressure = Math.max(post_shock - p0, demo_scale);

  // Wind Asymmetry & Advection
  const windMps = (sliderWindSpeed * 1000.0) / 3600.0;
  const downwindDeg = ((sliderWindDir % 360.0) + 180.0) % 360.0;
  const cartesianRad = (Math.PI / 180.0) * (90.0 - downwindDeg);
  const advectionFactor = 0.35;
  const center_x = windMps * t * Math.cos(cartesianRad) * advectionFactor;
  const center_y = windMps * t * Math.sin(cartesianRad) * advectionFactor;
  const alpha = Number(Math.min(0.85, 0.15 + (sliderWindSpeed / 80.0) * 0.70).toFixed(2));

  // Render 2D Cartesian Physics Field
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    // Background
    ctx.fillStyle = "#0c1015";
    ctx.fillRect(0, 0, width, height);

    // Plot Dimensions
    const extent = 500;
    const margin = { left: 55, right: 85, top: 38, bottom: 42 };
    const plotW = width - margin.left - margin.right;
    const plotH = height - margin.top - margin.bottom;

    const toScreenX = (wx) => margin.left + ((wx + extent) / (2 * extent)) * plotW;
    const toScreenY = (wy) => margin.top + ((extent - wy) / (2 * extent)) * plotH;

    // Plot Border
    ctx.strokeStyle = "#223344";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(margin.left, margin.top, plotW, plotH);

    // Coordinate Grid & Ticks
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    for (let g = -400; g <= 400; g += 200) {
      const sx = toScreenX(g);
      const sy = toScreenY(g);

      ctx.beginPath();
      ctx.moveTo(sx, margin.top);
      ctx.lineTo(sx, margin.top + plotH);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(margin.left, sy);
      ctx.lineTo(margin.left + plotW, sy);
      ctx.stroke();

      ctx.fillStyle = "#8899aa";
      ctx.font = "10px monospace";
      ctx.textAlign = "center";
      ctx.fillText(g.toString(), sx, margin.top + plotH + 15);
      ctx.textAlign = "right";
      ctx.fillText(g.toString(), margin.left - 8, sy + 4);
    }

    // Axes Labels
    ctx.fillStyle = "#c5d1de";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("x (m)", margin.left + plotW / 2, height - 10);

    ctx.save();
    ctx.translate(16, margin.top + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("y (m)", 0, 0);
    ctx.restore();

    // Draw Heat Glow Field (Inferno palette)
    const scx = toScreenX(center_x);
    const scy = toScreenY(center_y);
    const sRadius = (radius / (2 * extent)) * plotW;

    const heatGrad = ctx.createRadialGradient(scx, scy, 2, scx, scy, Math.max(15, sRadius * 1.6));
    heatGrad.addColorStop(0, "rgba(255, 255, 230, 0.98)");
    heatGrad.addColorStop(0.18, "rgba(255, 185, 45, 0.88)");
    heatGrad.addColorStop(0.42, "rgba(225, 45, 35, 0.72)");
    heatGrad.addColorStop(0.70, "rgba(110, 15, 95, 0.45)");
    heatGrad.addColorStop(1, "rgba(12, 16, 21, 0)");

    ctx.save();
    ctx.beginPath();
    ctx.arc(scx, scy, Math.max(15, sRadius * 1.6), 0, 2 * Math.PI);
    ctx.fillStyle = heatGrad;
    ctx.fill();
    ctx.restore();

    // Draw Aerodynamic Wind-Advected Shock Front Curve (Cyan Outline) only if enabled
    if (showShockOutline) {
      const stretch = 1.0 + 0.65 * alpha;
      const squeeze_upwind = Math.max(0.4, 1.0 - 0.45 * alpha);
      const squeeze_cross = Math.max(0.5, 1.0 - 0.25 * alpha);
      const numPts = 140;

      ctx.beginPath();
      for (let i = 0; i <= numPts; i++) {
        const theta = (i * 2 * Math.PI) / numPts;
        const cos_t = Math.cos(theta);
        const sin_t = Math.sin(theta);
        const x_local = cos_t >= 0 ? radius * stretch * cos_t : radius * squeeze_upwind * cos_t;
        const y_local = radius * squeeze_cross * sin_t;

        const x_world = center_x + (x_local * Math.cos(cartesianRad) - y_local * Math.sin(cartesianRad));
        const y_world = center_y + (x_local * Math.sin(cartesianRad) + y_local * Math.cos(cartesianRad));

        const sx = toScreenX(x_world);
        const sy = toScreenY(y_world);

        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.strokeStyle = "#00f0ff";
      ctx.lineWidth = 2.5;
      ctx.shadowColor = "#00f0ff";
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Draw Wind Direction Dashed Arrow
    const windLineLen = 140;
    const wxEnd = center_x + windLineLen * Math.cos(cartesianRad);
    const wyEnd = center_y + windLineLen * Math.sin(cartesianRad);
    ctx.beginPath();
    ctx.setLineDash([6, 4]);
    ctx.moveTo(toScreenX(center_x - 35 * Math.cos(cartesianRad)), toScreenY(center_y - 35 * Math.sin(cartesianRad)));
    ctx.lineTo(toScreenX(wxEnd), toScreenY(wyEnd));
    ctx.strokeStyle = "#29b6f6";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Advected Center Star
    drawStar(ctx, scx, scy, 5, 9, 4.5, "#ffffff", "#00f0ff");

    // Draw Colorbar on the Right
    const cbX = width - margin.right + 22;
    const cbY = margin.top;
    const cbW = 14;
    const cbH = plotH;
    const cbGrad = ctx.createLinearGradient(0, cbY + cbH, 0, cbY);
    cbGrad.addColorStop(0, "#0c1015");
    cbGrad.addColorStop(0.25, "#550f60");
    cbGrad.addColorStop(0.55, "#dc3228");
    cbGrad.addColorStop(0.8, "#ffb428");
    cbGrad.addColorStop(1, "#ffffdc");
    ctx.fillStyle = cbGrad;
    ctx.fillRect(cbX, cbY, cbW, cbH);
    ctx.strokeStyle = "#445566";
    ctx.strokeRect(cbX, cbY, cbW, cbH);

    // Colorbar Ticks
    ctx.fillStyle = "#8899aa";
    ctx.font = "9px monospace";
    ctx.textAlign = "left";
    const maxPa = Math.max(3500, Math.round(overpressure));
    for (let tStep = 0; tStep <= 4; tStep++) {
      const val = Math.round((maxPa / 4) * tStep);
      const ty = cbY + cbH - (cbH / 4) * tStep;
      ctx.fillText(val.toString(), cbX + cbW + 5, ty + 3);
    }
    ctx.save();
    ctx.translate(width - 8, margin.top + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.fillStyle = "#c5d1de";
    ctx.font = "10px sans-serif";
    ctx.fillText("Illustrative overpressure (Pa)", 0, 0);
    ctx.restore();

    // Draw Legend Box (Top Right inside Plot)
    const legX = margin.left + plotW - 195;
    const legY = margin.top + 10;
    const legH = showShockOutline ? 72 : 52;
    ctx.fillStyle = "rgba(12, 16, 22, 0.85)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.fillRect(legX, legY, 185, legH);
    ctx.strokeRect(legX, legY, 185, legH);

    drawStar(ctx, legX + 16, legY + 16, 5, 6, 3, "#ffffff", "#00f0ff");
    ctx.fillStyle = "#c5d1de";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("Advected blast center", legX + 32, legY + 20);

    if (showShockOutline) {
      ctx.beginPath();
      ctx.moveTo(legX + 8, legY + 38);
      ctx.lineTo(legX + 24, legY + 38);
      ctx.strokeStyle = "#00f0ff";
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.fillText("Shock front", legX + 32, legY + 41);

      ctx.beginPath();
      ctx.setLineDash([4, 3]);
      ctx.moveTo(legX + 8, legY + 56);
      ctx.lineTo(legX + 24, legY + 56);
      ctx.strokeStyle = "#29b6f6";
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillText("Wind direction", legX + 32, legY + 59);
    } else {
      ctx.beginPath();
      ctx.setLineDash([4, 3]);
      ctx.moveTo(legX + 8, legY + 36);
      ctx.lineTo(legX + 24, legY + 36);
      ctx.strokeStyle = "#29b6f6";
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillText("Wind direction", legX + 32, legY + 39);
    }

    // Draw Sleek HUD Telemetry Box (No blue outline, dark glass aesthetic)
    const hudX = margin.left + 10;
    const hudY = margin.top + plotH - 122;
    ctx.fillStyle = "rgba(12, 16, 22, 0.85)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    ctx.fillRect(hudX, hudY, 182, 114);
    ctx.strokeRect(hudX, hudY, 182, 114);

    ctx.fillStyle = "#90caf9";
    ctx.font = "10px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`t = ${t.toFixed(2)} s`, hudX + 10, hudY + 18);
    ctx.fillText(`R(t) = ${radius.toFixed(2)} m`, hudX + 10, hudY + 34);
    ctx.fillText(`shock speed = ${speed.toFixed(2)} m/s`, hudX + 10, hudY + 50);
    ctx.fillText(`front overpressure = ${overpressure.toExponential(2)} Pa`, hudX + 10, hudY + 66);
    ctx.fillText(`alpha = ${alpha.toFixed(2)}`, hudX + 10, hudY + 82);
    ctx.fillText(`energy = ${energyJ.toExponential(2)} J`, hudX + 10, hudY + 98);
    ctx.fillText(`wind = ${sliderWindSpeed.toFixed(1)} km/h @ ${sliderWindDir.toFixed(0)}°`, hudX + 10, hudY + 110);

  }, [simTime, sliderWindSpeed, sliderWindDir, energyJ, radius, speed, overpressure, center_x, center_y, alpha, showShockOutline]);

  const [blastViewMode, setBlastViewMode] = useState("cartesian");

  return (
    <div className="analysis-page">
      <div className="analysis-toolbar">
        <div>
          <span className="analysis-live">SEDOV-TAYLOR GAS DYNAMICS & FACILITY IMPACT</span>
          <strong>Blast Dynamics & Plant-Wide Damage Analysis</strong>
        </div>

        <div className="toolbar-actions-right" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {/* VIEW SWITCHER: CARTESIAN PHYSICS vs OVERALL FACILITY EFFECT */}
          <div className="mode-toggle-group">
            <button
              className={`toggle-btn ${blastViewMode === "cartesian" ? "active" : ""}`}
              onClick={() => setBlastViewMode("cartesian")}
            >
              🔬 2D GAS DYNAMICS (PHYSICS)
            </button>
            <button
              className={`toggle-btn ${blastViewMode === "facility" ? "active" : ""}`}
              onClick={() => setBlastViewMode("facility")}
            >
              🏭 FACILITY OVERALL EFFECT
            </button>
          </div>

          <div className="source-picker-wrap" style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <label style={{ fontSize: "10px", color: "var(--muted)" }}>Incident Asset: </label>
            <select
              value={selectedId || sourceAsset?.id}
              onChange={(e) => {
                setSelectedId(e.target.value);
                onRunSimulation({ sourceAssetId: e.target.value });
              }}
              className="inspector-select"
              style={{ width: "150px", height: "28px", fontSize: "10px" }}
            >
              {assets.filter((a) => a.type === "tank" || a.type === "reactor" || a.type === "boiler" || a.type === "chemical-storage").map((a) => (
                <option key={a.id} value={a.id}>{a.id} - {a.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: 2D CARTESIAN PHYSICS FIELD */}
      {blastViewMode === "cartesian" && (
        <div className="blast-layout">
          <div className="panel blast-visual" style={{ padding: "16px", display: "flex", flexDirection: "column", alignItems: "center", background: "#06090d" }}>
            <h3 style={{ color: "var(--text)", fontSize: "13px", fontWeight: "700", marginBottom: "10px", letterSpacing: "0.05em" }}>
              SafeZone AI — Educational Blast Propagation
            </h3>

            <div style={{ position: "relative", width: "100%", display: "flex", justifyContent: "center" }}>
              <canvas
                ref={canvasRef}
                width={680}
                height={520}
                style={{
                  width: "100%",
                  maxWidth: "680px",
                  height: "auto",
                  background: "#0c1015",
                  borderRadius: "6px",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.6)"
                }}
              />
            </div>

            {/* STANDALONE SLIDERS & CONTROLLER (MATCHING PYTHON VISUALIZER) */}
            <div className="visualizer-sliders-box" style={{ width: "100%", maxWidth: "680px", marginTop: "16px", display: "flex", flexDirection: "column", gap: "12px", background: "var(--panel-2)", padding: "14px", borderRadius: "6px", border: "1px solid var(--line)" }}>
              {/* Time Slider */}
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <span style={{ width: "110px", fontSize: "10px", color: "var(--text-2)", fontWeight: "600" }}>Time (s)</span>
                <input
                  type="range"
                  min="0.10"
                  max="10.0"
                  step="0.05"
                  value={simTime}
                  onChange={(e) => {
                    setIsPlaying(false);
                    setSimTime(Number(e.target.value));
                  }}
                  style={{ flex: 1, accentColor: "var(--red)", cursor: "pointer" }}
                />
                <span style={{ width: "35px", fontSize: "10px", fontFamily: "monospace", color: "var(--text)" }}>{simTime.toFixed(1)}</span>
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  style={{
                    background: isPlaying ? "var(--red)" : "var(--panel-3)",
                    color: "#fff",
                    border: "1px solid var(--line-strong)",
                    fontSize: "10px",
                    fontWeight: "700",
                    padding: "5px 14px",
                    borderRadius: "4px",
                    cursor: "pointer",
                    minWidth: "70px"
                  }}
                >
                  {isPlaying ? "Pause" : "Play"}
                </button>
              </div>

              {/* Wind Speed Slider */}
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <span style={{ width: "110px", fontSize: "10px", color: "var(--text-2)", fontWeight: "600" }}>Wind speed (km/h)</span>
                <input
                  type="range"
                  min="0"
                  max="80"
                  step="1"
                  value={sliderWindSpeed}
                  onChange={(e) => setSliderWindSpeed(Number(e.target.value))}
                  style={{ flex: 1, accentColor: "#29b6f6", cursor: "pointer" }}
                />
                <span style={{ width: "35px", fontSize: "10px", fontFamily: "monospace", color: "var(--text)" }}>{sliderWindSpeed}</span>
                <div style={{ minWidth: "70px" }} />
              </div>

              {/* Wind Direction Slider */}
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <span style={{ width: "110px", fontSize: "10px", color: "var(--text-2)", fontWeight: "600" }}>Wind direction (deg)</span>
                <input
                  type="range"
                  min="0"
                  max="360"
                  step="5"
                  value={sliderWindDir}
                  onChange={(e) => setSliderWindDir(Number(e.target.value))}
                  style={{ flex: 1, accentColor: "#29b6f6", cursor: "pointer" }}
                />
                <span style={{ width: "35px", fontSize: "10px", fontFamily: "monospace", color: "var(--text)" }}>{sliderWindDir}</span>
                <div style={{ minWidth: "70px" }} />
              </div>

              {/* Shock Boundary Outline Toggle */}
              <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: "4px", borderTop: "1px solid var(--line)" }}>
                <button
                  type="button"
                  onClick={() => setShowShockOutline(!showShockOutline)}
                  style={{
                    background: showShockOutline ? "rgba(0, 240, 255, 0.15)" : "var(--panel-3)",
                    border: `1px solid ${showShockOutline ? "#00f0ff" : "var(--line-strong)"}`,
                    color: showShockOutline ? "#00f0ff" : "var(--muted)",
                    fontSize: "10px",
                    fontWeight: "600",
                    padding: "4px 10px",
                    borderRadius: "4px",
                    cursor: "pointer",
                    transition: "var(--ease)"
                  }}
                >
                  {showShockOutline ? "✓ Cyan Shock Front Outline (ON)" : "Show Cyan Shock Front Outline (OFF)"}
                </button>
              </div>
            </div>
          </div>

          <div className="panel blast-param-panel">
            <PanelHeading
              title="Analytical Parameters"
              eyebrow="PHYSICS FORMULATION"
            />

            <div className="parameter-list">
              <div>
                <span>Source Incident Asset</span>
                <b>{sourceAsset?.id} ({sourceAsset?.name})</b>
              </div>
              <div>
                <span>Explosion Energy</span>
                <b>{(energyJ / 1e9).toFixed(2)} × 10⁹ J (~0.6t TNT)</b>
              </div>
              <div>
                <span>Sedov Radius R(t={simTime.toFixed(1)}s)</span>
                <b style={{ color: "var(--orange)" }}>{radius.toFixed(2)} m</b>
              </div>
              <div>
                <span>Instantaneous Shock Speed</span>
                <b>{speed.toFixed(2)} m/s</b>
              </div>
              <div>
                <span>Front Overpressure</span>
                <b className="danger-text">{overpressure.toExponential(2)} Pa ({(overpressure / 1000).toFixed(1)} kPa)</b>
              </div>
              <div>
                <span>Wind Asymmetry Alpha</span>
                <b>{alpha.toFixed(2)}</b>
              </div>
              <div>
                <span>Wind Vector</span>
                <b>{sliderWindSpeed} km/h @ {sliderWindDir}°</b>
              </div>
            </div>

            <div className="future-box">
              <span>SEDOV-TAYLOR FORMULATION</span>
              <p>
                Self-similar blast radius expansion R(t) = ξ₀ · (E / ρ₀)^(1/5) · t^(2/5) with adiabatic exponent γ = 1.40.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: FACILITY OVERALL EFFECT & DAMAGE CONTOURS */}
      {blastViewMode === "facility" && (
        <div className="blast-layout">
          <div className="panel blast-visual" style={{ position: "relative", minHeight: "560px" }}>
            {/* STATIC REFERENCE CONTOUR RINGS */}
            <div className="ref-ring lethal-ring" style={{ width: `${42 * 2.6 * 2}px`, height: `${42 * 2.6 * 2}px` }}>
              <span className="ring-label">70 kPa Lethal Zone (42m)</span>
            </div>

            <div className="ref-ring heavy-ring" style={{ width: `${88 * 2.6 * 2}px`, height: `${88 * 2.6 * 2}px` }}>
              <span className="ring-label">20 kPa Heavy Damage (88m)</span>
            </div>

            <div className="ref-ring" style={{ width: `${140 * 2.6 * 2}px`, height: `${140 * 2.6 * 2}px`, borderColor: "rgba(255, 214, 10, 0.25)" }}>
              <span className="ring-label">5 kPa Glass Shatter (140m)</span>
            </div>

            {/* EPICENTER CORE NODE */}
            <div className="blast-center">
              <div className="blast-core-node">
                <span style={{ fontSize: "14px", fontWeight: "bold", color: "var(--red)" }}>{sourceAsset?.id || "T-101"}</span>
                <small style={{ fontSize: "9px", color: "var(--text-2)", letterSpacing: "0.1em" }}>EPICENTER</small>
              </div>
            </div>

            <div className="blast-caption">
              OVERALL CONTOUR ENVELOPE · 70 kPa (42m) · 20 kPa (88m) · 5 kPa (140m)
            </div>
          </div>

          <div className="panel blast-param-panel">
            <PanelHeading
              title="Overall Facility Impact"
              eyebrow="FACILITY DAMAGE OVERVIEW"
            />

            <div className="parameter-list">
              <div>
                <span>Epicenter Vessel</span>
                <b>{sourceAsset?.id} ({sourceAsset?.name})</b>
              </div>
              <div>
                <span>Max Blast Radius</span>
                <b>{(simulationResult?.blastMetrics?.finalRadiusMeters || 92.4)} m</b>
              </div>
              <div>
                <span>70 kPa Total Destruction</span>
                <b className="danger-text">42.0 m Radius</b>
              </div>
              <div>
                <span>20 kPa Structural Damage</span>
                <b className="warning-text">88.0 m Radius</b>
              </div>
              <div>
                <span>5 kPa Glass/Cladding Shatter</span>
                <b>140.0 m Radius</b>
              </div>
              <div>
                <span>Total Affected Assets</span>
                <b className="danger-text">{(simulationResult?.affectedAssets || []).length} Facility Units</b>
              </div>
            </div>

            <div className="future-box">
              <span>PROTECTIVE MEASURES</span>
              <p>
                Ensure automated blast wall barriers are deployed along the 70 kPa perimeter to protect adjacent units.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Asset Blast Impact Matrix */}
      <div className="panel sim-results-table-panel" style={{ marginTop: "12px" }}>
        <PanelHeading title="Facility Assets Blast Exposure Matrix" eyebrow="ZONE IMPACT" />
        <div className="sim-table-wrap">
          <table className="sim-table">
            <thead>
              <tr>
                <th>ASSET ID</th>
                <th>ASSET NAME</th>
                <th>RADIAL DISTANCE</th>
                <th>INCIDENT OVERPRESSURE</th>
                <th>STATUS AT t={simTime.toFixed(2)}s</th>
                <th>PREDICTED DAMAGE</th>
                <th>FAILURE PROBABILITY</th>
              </tr>
            </thead>
            <tbody>
              {(simulationResult?.affectedAssets || []).map((a) => {
                const isHit = radius >= a.distanceMeters;
                return (
                  <tr key={a.assetId} className={isHit ? "asset-hit-row" : ""}>
                    <td><strong>{a.assetId}</strong></td>
                    <td>{a.name}</td>
                    <td>{a.distanceMeters} m</td>
                    <td><b className={a.peakOverpressureKPa >= 50 ? "danger-text" : a.peakOverpressureKPa >= 20 ? "warning-text" : ""}>{a.peakOverpressureKPa} kPa</b></td>
                    <td>
                      <span className={`badge-state ${isHit ? "critical" : "safe"}`}>
                        {isHit ? "WAVE IMPACTED" : "PENDING SHOCK FRONT"}
                      </span>
                    </td>
                    <td><span className={`badge-state ${a.damageState.toLowerCase()}`}>{a.damageState}</span></td>
                    <td>{(a.failureProbabilityEstimate * 100).toFixed(0)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   9. EVACUATION PLAN (TACTICAL VECTOR EGRESS SYSTEM)
   ========================================================= */

function Evacuation({ assets, simulationResult }) {
  return (
    <div className="analysis-page">
      <GraphEvacuationMap simulationResult={simulationResult} />
    </div>
  );
}

/* =========================================================
   10. REPORTS
   ========================================================= */

function Reports({ simulationResult, selectedReport, setSelectedReport }) {
  const [reports] = useState(MOCK_REPORTS);

  return (
    <div className="reports-page-wrapper">
      <div className="panel reports-panel">
        <PanelHeading
          title="Document Center"
          eyebrow="FACILITY SAFETY ASSESSMENTS & COMPLIANCE"
        />

        <div className="reports-table">
          <div className="reports-header">
            <span>REPORT TITLE</span>
            <span>TYPE</span>
            <span>DATE</span>
            <span>RISK SCORE</span>
            <span>STATUS</span>
            <span />
          </div>

          {reports.map((report) => (
            <div className="report-row" key={report.id}>
              <div>
                <strong>{report.title}</strong>
                <small className="report-id">{report.id}</small>
              </div>
              <span>{report.type}</span>
              <span>{report.date}</span>
              <span><strong>{report.overallScore}</strong></span>
              <span className="badge-status safe">{report.status}</span>
              <button
                className="report-view-btn"
                onClick={() => setSelectedReport(report)}
              >
                VIEW REPORT →
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Report Details Drawer / Modal */}
      {selectedReport && (
        <div className="panel report-modal">
          <div className="modal-header">
            <div>
              <small>{selectedReport.type}</small>
              <h2>{selectedReport.title}</h2>
              <span>ID: {selectedReport.id} · Generated: {selectedReport.date} by {selectedReport.author}</span>
            </div>
            <button className="close-btn" onClick={() => setSelectedReport(null)}>✕</button>
          </div>

          <div className="modal-body">
            <div className="report-summary-box">
              <strong>EXECUTIVE SUMMARY</strong>
              <p>{selectedReport.summary}</p>
            </div>

            {selectedReport.sections.map((sec, idx) => (
              <div key={idx} className="report-section">
                <h3>{sec.title}</h3>
                <p>{sec.content}</p>
              </div>
            ))}
          </div>

          <div className="modal-footer">
            <button
              className="secondary-btn"
              onClick={() => {
                window.print();
              }}
            >
              ⎙ PRINT / EXPORT PDF
            </button>
            <button
              className="primary-action-btn"
              onClick={() => {
                const blob = new Blob([JSON.stringify({ report: selectedReport, simulation: simulationResult }, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${selectedReport.id}-safezone.json`;
                a.click();
              }}
            >
              EXPORT JSON DATA
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   COMMON COMPONENTS
   ========================================================= */

function MiniFacilityMap({ assets }) {
  const [hoveredAsset, setHoveredAsset] = useState(null);

  return (
    <div className="mini-map">
      <div className="mini-grid" />

      {/* Interconnecting Process SVG Pipelines */}
      <svg className="mini-pipes-svg" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 1 }}>
        <path d="M 22% 28% L 26% 38% L 28% 48% L 48% 42% L 54% 58% L 65% 55%" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" strokeDasharray="3 3" fill="none" />
        <path d="M 35% 29% L 26% 38%" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" strokeDasharray="3 3" fill="none" />
        <path d="M 48% 42% L 68% 22% L 78% 30%" stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeDasharray="2 2" fill="none" />
      </svg>

      {assets.map((asset) => {
        const isStorage = asset.type === "tank" || asset.type === "pressure-vessel";
        const isProcess = asset.type === "reactor" || asset.type === "boiler" || asset.type === "furnace";
        const isMachinery = asset.type === "machine" || asset.type === "pump" || asset.type === "compressor";
        const isSafety = asset.type === "shelter" || asset.type === "exit" || asset.type === "gate" || asset.type === "building";

        const badgeClass = isStorage ? "mini-tank" : isProcess ? "mini-process" : isMachinery ? "mini-machine" : isSafety ? "mini-safety" : "mini-structure";

        return (
          <div
            key={asset.id}
            className={`mini-asset-node ${badgeClass} ${hoveredAsset?.id === asset.id ? "hovered" : ""}`}
            style={{
              left: `${asset.x}%`,
              top: `${asset.y}%`,
            }}
            onMouseEnter={() => setHoveredAsset(asset)}
            onMouseLeave={() => setHoveredAsset(null)}
          >
            <span className="mini-node-dot" />
            <span className="mini-node-id">{asset.id}</span>
          </div>
        );
      })}

      {/* Floating Interactive Hover Tooltip */}
      {hoveredAsset && (
        <div
          className="mini-map-tooltip"
          style={{
            left: `${Math.min(Math.max(hoveredAsset.x, 15), 85)}%`,
            top: `${hoveredAsset.y > 60 ? hoveredAsset.y - 14 : hoveredAsset.y + 8}%`,
          }}
        >
          <div className="tooltip-title">
            <strong>{hoveredAsset.id}</strong> · {hoveredAsset.name}
          </div>
          <div className="tooltip-detail">
            <span>Type: {hoveredAsset.type}</span>
            {hoveredAsset.fuel && <span>Fuel: {hoveredAsset.fuel}</span>}
            {hoveredAsset.capacity && <span>Cap: {hoveredAsset.capacity} m³</span>}
          </div>
        </div>
      )}

      <div className="mini-map-label">
        <span className="status-dot online" style={{ width: "6px", height: "6px", marginRight: "6px" }} />
        LIVE FACILITY MODEL ({assets.length} ASSETS ACTIVE)
      </div>
    </div>
  );
}

function PanelHeading({ title, eyebrow, action, onAction }) {
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

function StatusBar({ assets, windSpeed, windDirection, backendStatus }) {
  return (
    <footer className="statusbar">
      <div>
        <span className={backendStatus?.isOnline ? "status-dot online" : "status-dot"} />
        {backendStatus?.isOnline ? "CORE ENGINE ONLINE" : "OFFLINE DEMO MODE"}
      </div>
      <div>ASSETS: {assets.length}</div>
      <div>WIND: {windSpeed} m/s · {windDirection}</div>
      <div>LAT/LON: 21.1659° N, 79.0889° E</div>
      <div>LAST SYNC: JUST NOW</div>
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