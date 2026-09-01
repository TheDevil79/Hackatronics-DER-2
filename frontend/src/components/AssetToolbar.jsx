const assets = [
  // STORAGE / PROCESS
  { type: "tank", icon: "◉", label: "Storage Tank" },
  { type: "pressure-vessel", icon: "◎", label: "Pressure Vessel" },
  { type: "reactor", icon: "◈", label: "Reactor" },
  { type: "boiler", icon: "▣", label: "Boiler" },
  { type: "furnace", icon: "◇", label: "Furnace" },
  { type: "heat-exchanger", icon: "▤", label: "Heat Exchanger" },

  // MACHINERY
  { type: "machinery", icon: "⚙", label: "Machinery" },
  { type: "pump", icon: "◉", label: "Pump" },
  { type: "compressor", icon: "◌", label: "Compressor" },
  { type: "cooling-tower", icon: "△", label: "Cooling Tower" },
  { type: "flare-stack", icon: "♢", label: "Flare Stack" },

  // STORAGE
  { type: "storage", icon: "▤", label: "Storage Area" },
  { type: "chemical-storage", icon: "◇", label: "Chemical Storage" },
  { type: "fuel-storage", icon: "◉", label: "Fuel Storage" },
  { type: "gas-storage", icon: "○", label: "Gas Cylinder Storage" },
  { type: "fire-water-tank", icon: "◍", label: "Fire Water Tank" },

  // INFRASTRUCTURE
  { type: "building", icon: "▦", label: "Building" },
  { type: "control-room", icon: "□", label: "Control Room" },
  { type: "warehouse", icon: "▥", label: "Warehouse" },
  { type: "laboratory", icon: "⚗", label: "Laboratory" },
  { type: "maintenance", icon: "⚒", label: "Maintenance Building" },
  { type: "admin", icon: "▧", label: "Admin / Office" },

  // PIPELINES
  { type: "pipeline", icon: "━", label: "Pipeline" },
  { type: "pipe-rack", icon: "╫", label: "Pipe Rack" },

  // LOGISTICS
  { type: "loading-bay", icon: "▱", label: "Loading / Unloading Bay" },
  { type: "truck-loading", icon: "▰", label: "Truck Loading Area" },
  { type: "rail-loading", icon: "═", label: "Rail Loading Area" },
  { type: "road", icon: "═", label: "Road" },

  // ELECTRICAL
  { type: "substation", icon: "⚡", label: "Electrical Substation" },

  // EMERGENCY / SAFETY
  { type: "shelter", icon: "⌂", label: "Emergency Shelter" },
  { type: "exit", icon: "↗", label: "Emergency Exit" },
  { type: "access", icon: "✚", label: "Emergency Access" },
  { type: "hydrant", icon: "✦", label: "Fire Hydrant" },
  { type: "gas-detector", icon: "◇", label: "Gas Detector" },
  { type: "assembly-point", icon: "●", label: "Assembly Point" },

  // SECURITY
  { type: "main-gate", icon: "▯", label: "Main Gate" },
  { type: "security", icon: "▣", label: "Security Building" },
];


function AssetToolbar({ selectedTool, setSelectedTool }) {
  return (
    <aside className="asset-toolbar">

      <h2>ASSET LIBRARY</h2>

      <p className="toolbar-help">
        Select an asset and place it on the facility map.
      </p>

      <div className="asset-list">

        {assets.map((asset) => (

          <button
            key={asset.type}
            type="button"
            className={
              selectedTool === asset.type
                ? "asset-button selected"
                : "asset-button"
            }
            onClick={() => setSelectedTool(asset.type)}
          >

            <span className="asset-icon">
              {asset.icon}
            </span>

            <span className="asset-button-text">
              <strong>{asset.label}</strong>

              <small>
                + ADD ASSET
              </small>
            </span>

          </button>

        ))}

      </div>

      <div className="toolbar-tip">

        <strong>Placement</strong>

        <p>
          Select an asset, then click anywhere on the facility map
          to place it.
        </p>

      </div>

    </aside>
  );
}


export default AssetToolbar;