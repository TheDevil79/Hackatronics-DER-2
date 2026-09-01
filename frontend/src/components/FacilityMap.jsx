import {
  MapContainer,
  TileLayer,
  Polygon,
  CircleMarker,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useMemo, useState } from "react";

/*
|--------------------------------------------------------------------------
| FACILITY LOCATION
|--------------------------------------------------------------------------
*/

const FACILITY_CENTER = [21.1659, 79.0889];

const INDUSTRIAL_ZONE = [
  [21.1705, 79.0805],
  [21.171, 79.096],
  [21.166, 79.0995],
  [21.157, 79.097],
  [21.156, 79.083],
  [21.162, 79.079],
];

/*
|--------------------------------------------------------------------------
| MAP LAYERS
|--------------------------------------------------------------------------
*/

const MAP_LAYERS = {
  satellite: {
    name: "Satellite",
    url:
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles © Esri",
  },

  street: {
    name: "Street",
    url:
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>',
  },
};

/*
|--------------------------------------------------------------------------
| SAMPLE EXTERNAL FACILITY / SAFETY LOCATIONS
|--------------------------------------------------------------------------
*/

const FACILITIES = [
  {
    id: "factory-a",
    name: "Factory A",
    position: [21.1654, 79.0872],
  },

  {
    id: "factory-b",
    name: "Factory B",
    position: [21.1685, 79.092],
  },

  {
    id: "factory-c",
    name: "Factory C",
    position: [21.1612, 79.091],
  },

  {
    id: "hospital",
    name: "City Hospital",
    position: [21.1695, 79.099],
    type: "hospital",
  },

  {
    id: "shelter-1",
    name: "Shelter 1",
    position: [21.171, 79.087],
    type: "shelter",
  },

  {
    id: "shelter-2",
    name: "Shelter 2",
    position: [21.164, 79.101],
    type: "shelter",
  },

  {
    id: "shelter-3",
    name: "Shelter 3",
    position: [21.158, 79.089],
    type: "shelter",
  },
];

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

const getZoneBounds = () => {
  const latitudes = INDUSTRIAL_ZONE.map((point) => point[0]);
  const longitudes = INDUSTRIAL_ZONE.map((point) => point[1]);

  return {
    minLat: Math.min(...latitudes),
    maxLat: Math.max(...latitudes),
    minLng: Math.min(...longitudes),
    maxLng: Math.max(...longitudes),
  };
};

const ZONE_BOUNDS = getZoneBounds();

/*
|--------------------------------------------------------------------------
| X/Y <-> LAT/LNG
|--------------------------------------------------------------------------
|
| Your existing assets use:
|
| x = percentage from left
| y = percentage from top
|
| Leaflet uses:
|
| latitude / longitude
|
*/

function assetToLatLng(asset) {
  const x = Number(asset.x ?? 50);
  const y = Number(asset.y ?? 45);

  const lng =
    ZONE_BOUNDS.minLng +
    (x / 100) *
      (ZONE_BOUNDS.maxLng - ZONE_BOUNDS.minLng);

  const lat =
    ZONE_BOUNDS.maxLat -
    (y / 100) *
      (ZONE_BOUNDS.maxLat - ZONE_BOUNDS.minLat);

  return [lat, lng];
}

function latLngToAssetPosition(lat, lng) {
  const x =
    ((lng - ZONE_BOUNDS.minLng) /
      (ZONE_BOUNDS.maxLng - ZONE_BOUNDS.minLng)) *
    100;

  const y =
    ((ZONE_BOUNDS.maxLat - lat) /
      (ZONE_BOUNDS.maxLat - ZONE_BOUNDS.minLat)) *
    100;

  return {
    x: Math.max(0, Math.min(100, x)),
    y: Math.max(0, Math.min(100, y)),
  };
}

/*
|--------------------------------------------------------------------------
| MAP CENTER CONTROLLER
|--------------------------------------------------------------------------
*/

function MapController({ zoom }) {
  const map = useMap();

  useMemo(() => {
    map.setView(FACILITY_CENTER, zoom);
  }, [map, zoom]);

  return null;
}

/*
|--------------------------------------------------------------------------
| ASSET ICON
|--------------------------------------------------------------------------
*/

function createAssetIcon(asset, selected) {
  const icon = asset.icon || "◇";

  return L.divIcon({
    className: "facility-asset-marker-wrapper",

    html: `
      <div class="facility-asset-marker ${
        selected ? "is-selected" : ""
      } asset-marker-${asset.type}">
        <div class="facility-asset-symbol">
          ${icon}
        </div>

        <div class="facility-asset-id">
          ${asset.id}
        </div>
      </div>
    `,

    iconSize: [72, 62],
    iconAnchor: [36, 31],
    popupAnchor: [0, -28],
  });
}

/*
|--------------------------------------------------------------------------
| ASSET MARKER
|--------------------------------------------------------------------------
*/

function FacilityAssetMarker({
  asset,
  selected,
  onSelect,
  onMove,
}) {
  const position = assetToLatLng(asset);

  return (
    <Marker
      position={position}
      draggable={true}
      icon={createAssetIcon(asset, selected)}
      eventHandlers={{
        click: (event) => {
          event.originalEvent?.stopPropagation();
          onSelect(asset.id);
        },

        dragend: (event) => {
          const marker = event.target;
          const latLng = marker.getLatLng();

          const nextPosition =
            latLngToAssetPosition(
              latLng.lat,
              latLng.lng
            );

          onMove(asset.id, nextPosition);
        },
      }}
    >
      <Popup>
        <strong>{asset.id}</strong>

        <br />

        {asset.name}

        <br />

        <small>
          {asset.type}
        </small>
      </Popup>
    </Marker>
  );
}

/*
|--------------------------------------------------------------------------
| MAIN COMPONENT
|--------------------------------------------------------------------------
*/

export default function FacilityMap({
  assets,
  selectedId,
  setSelectedId,
  updateAsset,
  deleteAsset,
  addAsset,
  showToast,
}) {
  const [mapLayer, setMapLayer] =
    useState("satellite");

  const [zoom, setZoom] = useState(15);

  const [showFacilities, setShowFacilities] =
    useState(true);

  const [showSafety, setShowSafety] =
    useState(true);

  /*
  |--------------------------------------------------------------------------
  | MOVE ASSET
  |--------------------------------------------------------------------------
  */

  const handleAssetMove = (id, position) => {
    updateAsset(id, position);

    showToast?.("Asset position updated");
  };

  /*
  |--------------------------------------------------------------------------
  | ADD ASSET
  |--------------------------------------------------------------------------
  */

  const handleAddAsset = (type) => {
    addAsset(type);

    showToast?.("Asset added to facility");
  };

  return (
    <div className="facility-map-builder">

      {/* =========================================================
          BUILDER TOOLBAR
          ========================================================= */}

      <div className="facility-builder-toolbar">

        <div className="facility-builder-left">

          <div className="facility-mode-badge">
            <span className="live-dot" />
            FACILITY MODEL
          </div>

          <div className="facility-zone-name">
            ZONE 01
          </div>

        </div>

        <div className="facility-builder-center">

          <strong>
            FACILITY LAYOUT
          </strong>

          <span>
            SATELLITE SITE MODEL
          </span>

        </div>

        <div className="facility-builder-actions">

          <button
            type="button"
            onClick={() =>
              setZoom((value) =>
                Math.max(13, value - 1)
              )
            }
          >
            −
          </button>

          <span>
            {zoom}
          </span>

          <button
            type="button"
            onClick={() =>
              setZoom((value) =>
                Math.min(19, value + 1)
              )
            }
          >
            +
          </button>

          <button
            type="button"
            onClick={() => {
              setZoom(15);
              showToast?.("Map view reset");
            }}
          >
            RESET
          </button>

        </div>

      </div>

      {/* =========================================================
          MAIN LAYOUT
          ========================================================= */}

      <div className="facility-builder-layout">

        {/* =======================================================
            ASSET LIBRARY
            ======================================================= */}

        <aside className="facility-asset-library">

          <div className="facility-library-header">

            <div>
              <strong>
                ASSET LIBRARY
              </strong>

              <small>
                ADD TO FACILITY
              </small>
            </div>

            <span>
              {assets.length}
            </span>

          </div>

          <div className="facility-library-scroll">

            <AssetCategory
              title="STORAGE / PROCESS"
              types={[
                {
                  type: "tank",
                  label: "Storage Tank",
                  icon: "◎",
                  color: "red",
                },

                {
                  type: "pressure-vessel",
                  label: "Pressure Vessel",
                  icon: "◎",
                  color: "red",
                },

                {
                  type: "reactor",
                  label: "Reactor",
                  icon: "◉",
                  color: "red",
                },

                {
                  type: "boiler",
                  label: "Boiler",
                  icon: "▣",
                  color: "red",
                },

                {
                  type: "furnace",
                  label: "Furnace",
                  icon: "◇",
                  color: "red",
                },

                {
                  type: "heat-exchanger",
                  label: "Heat Exchanger",
                  icon: "▤",
                  color: "red",
                },
              ]}
              onAdd={handleAddAsset}
            />

            <AssetCategory
              title="MACHINERY"
              types={[
                {
                  type: "machine",
                  label: "Machinery",
                  icon: "⚙",
                  color: "orange",
                },

                {
                  type: "pump",
                  label: "Pump",
                  icon: "◉",
                  color: "orange",
                },

                {
                  type: "compressor",
                  label: "Compressor",
                  icon: "◌",
                  color: "orange",
                },

                {
                  type: "cooling-tower",
                  label: "Cooling Tower",
                  icon: "△",
                  color: "orange",
                },

                {
                  type: "flare-stack",
                  label: "Flare Stack",
                  icon: "♢",
                  color: "red",
                },
              ]}
              onAdd={handleAddAsset}
            />

            <AssetCategory
              title="STORAGE"
              types={[
                {
                  type: "storage",
                  label: "Storage Area",
                  icon: "▤",
                  color: "green",
                },

                {
                  type: "chemical-storage",
                  label: "Chemical Storage",
                  icon: "◇",
                  color: "green",
                },

                {
                  type: "fuel-storage",
                  label: "Fuel Storage",
                  icon: "◎",
                  color: "red",
                },

                {
                  type: "gas-storage",
                  label: "Gas Cylinder Storage",
                  icon: "○",
                  color: "yellow",
                },

                {
                  type: "fire-water-tank",
                  label: "Fire Water Tank",
                  icon: "◍",
                  color: "cyan",
                },
              ]}
              onAdd={handleAddAsset}
            />

            <AssetCategory
              title="INFRASTRUCTURE"
              types={[
                {
                  type: "building",
                  label: "Building",
                  icon: "▣",
                  color: "blue",
                },

                {
                  type: "control-room",
                  label: "Control Room",
                  icon: "□",
                  color: "blue",
                },

                {
                  type: "warehouse",
                  label: "Warehouse",
                  icon: "▥",
                  color: "blue",
                },

                {
                  type: "laboratory",
                  label: "Laboratory",
                  icon: "⚗",
                  color: "blue",
                },

                {
                  type: "maintenance",
                  label: "Maintenance",
                  icon: "⚒",
                  color: "blue",
                },

                {
                  type: "admin",
                  label: "Admin / Office",
                  icon: "▧",
                  color: "blue",
                },
              ]}
              onAdd={handleAddAsset}
            />

            <AssetCategory
              title="PIPELINES / LOGISTICS"
              types={[
                {
                  type: "pipeline",
                  label: "Pipeline",
                  icon: "━",
                  color: "purple",
                },

                {
                  type: "pipe-rack",
                  label: "Pipe Rack",
                  icon: "╫",
                  color: "purple",
                },

                {
                  type: "loading-bay",
                  label: "Loading Bay",
                  icon: "▱",
                  color: "orange",
                },

                {
                  type: "truck-loading",
                  label: "Truck Loading",
                  icon: "▰",
                  color: "orange",
                },

                {
                  type: "rail-loading",
                  label: "Rail Loading",
                  icon: "═",
                  color: "orange",
                },

                {
                  type: "road",
                  label: "Road",
                  icon: "═",
                  color: "purple",
                },
              ]}
              onAdd={handleAddAsset}
            />

            <AssetCategory
              title="ELECTRICAL"
              types={[
                {
                  type: "substation",
                  label: "Electrical Substation",
                  icon: "⚡",
                  color: "yellow",
                },
              ]}
              onAdd={handleAddAsset}
            />

            <AssetCategory
              title="EMERGENCY / SAFETY"
              types={[
                {
                  type: "shelter",
                  label: "Emergency Shelter",
                  icon: "⌂",
                  color: "green",
                },

                {
                  type: "exit",
                  label: "Emergency Exit",
                  icon: "↗",
                  color: "green",
                },

                {
                  type: "access",
                  label: "Emergency Access",
                  icon: "✚",
                  color: "green",
                },

                {
                  type: "hydrant",
                  label: "Fire Hydrant",
                  icon: "✦",
                  color: "cyan",
                },

                {
                  type: "detector",
                  label: "Gas Detector",
                  icon: "◇",
                  color: "yellow",
                },

                {
                  type: "assembly-point",
                  label: "Assembly Point",
                  icon: "●",
                  color: "green",
                },
              ]}
              onAdd={handleAddAsset}
            />

            <AssetCategory
              title="SECURITY"
              types={[
                {
                  type: "main-gate",
                  label: "Main Gate",
                  icon: "▯",
                  color: "red",
                },

                {
                  type: "security",
                  label: "Security Building",
                  icon: "▣",
                  color: "blue",
                },
              ]}
              onAdd={handleAddAsset}
            />

          </div>

        </aside>

        {/* =======================================================
            MAP
            ======================================================= */}

        <section className="facility-map-panel">

          <div className="facility-map-panel-header">

            <div>

              <strong>
                FACILITY SITE MAP
              </strong>

              <small>
                Drag assets to reposition them
              </small>

            </div>

            <div className="facility-map-layer-buttons">

              <button
                type="button"
                className={
                  mapLayer === "satellite"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setMapLayer("satellite")
                }
              >
                SATELLITE
              </button>

              <button
                type="button"
                className={
                  mapLayer === "street"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setMapLayer("street")
                }
              >
                STREET
              </button>

            </div>

          </div>

          <div className="facility-leaflet-wrapper">

            <MapContainer
              center={FACILITY_CENTER}
              zoom={zoom}
              scrollWheelZoom={true}
              className="facility-leaflet-map"
            >

              <MapController zoom={zoom} />

              <TileLayer
                url={MAP_LAYERS[mapLayer].url}
                attribution={
                  MAP_LAYERS[mapLayer].attribution
                }
              />

              {/* INDUSTRIAL ZONE */}

              <Polygon
                positions={INDUSTRIAL_ZONE}
                pathOptions={{
                  color: "#ff3b30",
                  weight: 3,
                  dashArray: "10 8",
                  fillColor: "#ff3b30",
                  fillOpacity: 0.08,
                }}
              />

              {/* FACILITY LOCATIONS */}

              {showFacilities &&
                FACILITIES
                  .filter(
                    (facility) =>
                      !facility.type
                  )
                  .map((facility) => (
                    <CircleMarker
                      key={facility.id}
                      center={facility.position}
                      radius={7}
                      pathOptions={{
                        color: "#ffffff",
                        weight: 2,
                        fillColor: "#111111",
                        fillOpacity: 1,
                      }}
                    >
                      <Popup>
                        <strong>
                          {facility.name}
                        </strong>

                        <br />

                        Industrial Facility
                      </Popup>
                    </CircleMarker>
                  ))}

              {/* HOSPITAL */}

              {showSafety &&
                FACILITIES
                  .filter(
                    (facility) =>
                      facility.type ===
                      "hospital"
                  )
                  .map((facility) => (
                    <CircleMarker
                      key={facility.id}
                      center={facility.position}
                      radius={8}
                      pathOptions={{
                        color: "#38d6e8",
                        weight: 2,
                        fillColor: "#101a1d",
                        fillOpacity: 1,
                      }}
                    >
                      <Popup>
                        <strong>
                          {facility.name}
                        </strong>

                        <br />

                        Hospital
                      </Popup>
                    </CircleMarker>
                  ))}

              {/* SHELTERS */}

              {showSafety &&
                FACILITIES
                  .filter(
                    (facility) =>
                      facility.type ===
                      "shelter"
                  )
                  .map((facility) => (
                    <CircleMarker
                      key={facility.id}
                      center={facility.position}
                      radius={7}
                      pathOptions={{
                        color: "#32d583",
                        weight: 2,
                        fillColor: "#102018",
                        fillOpacity: 1,
                      }}
                    >
                      <Popup>
                        <strong>
                          {facility.name}
                        </strong>

                        <br />

                        Emergency Shelter
                      </Popup>
                    </CircleMarker>
                  ))}

              {/* USER ASSETS */}

              {assets.map((asset) => (
                <FacilityAssetMarker
                  key={asset.id}
                  asset={asset}
                  selected={
                    asset.id === selectedId
                  }
                  onSelect={setSelectedId}
                  onMove={handleAssetMove}
                />
              ))}

            </MapContainer>

            {/* MAP OVERLAY */}

            <div className="facility-map-overlay-top">

              <div className="facility-map-title">
                INDUSTRIAL ZONE 01
              </div>

              <div className="facility-map-subtitle">
                FACILITY MODEL / LIVE EDIT
              </div>

            </div>

            <div className="facility-map-overlay-bottom">

              <span>
                <i className="zone-indicator" />
                SELECTED INDUSTRIAL ZONE
              </span>

              <span>
                GRID 10m
              </span>

              <span>
                {assets.length} ASSETS
              </span>

            </div>

            <div className="facility-north-arrow">
              <strong>N</strong>
              <span>↑</span>
            </div>

          </div>

        </section>

        {/* =======================================================
            INSPECTOR
            ======================================================= */}

        <FacilityInspector
          asset={
            assets.find(
              (item) =>
                item.id === selectedId
            )
          }
          updateAsset={updateAsset}
          deleteAsset={deleteAsset}
        />

      </div>

      {/* =========================================================
          FOOTER
          ========================================================= */}

      <div className="facility-builder-footer">

        <span>
          {assets.length} ASSETS PLACED
        </span>

        <span>
          SATELLITE SITE
        </span>

        <span>
          DRAG TO POSITION
        </span>

        <span>
          MODEL EDIT MODE
        </span>

      </div>

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| ASSET CATEGORY
|--------------------------------------------------------------------------
*/

function AssetCategory({
  title,
  types,
  onAdd,
}) {
  return (
    <div className="facility-asset-category">

      <div className="facility-category-title">
        {title}
      </div>

      {types.map((asset) => (
        <button
          type="button"
          key={asset.type}
          className={`facility-asset-button ${asset.color}`}
          onClick={() =>
            onAdd(asset.type)
          }
        >

          <span className="facility-asset-button-icon">
            {asset.icon}
          </span>

          <span className="facility-asset-button-text">

            <strong>
              {asset.label}
            </strong>

            <small>
              + ADD ASSET
            </small>

          </span>

          <b>
            +
          </b>

        </button>
      ))}

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| INSPECTOR
|--------------------------------------------------------------------------
*/

function FacilityInspector({
  asset,
  updateAsset,
  deleteAsset,
}) {
  if (!asset) {
    return (
      <aside className="facility-inspector">

        <div className="facility-inspector-empty">

          <div className="empty-icon">
            ◇
          </div>

          <strong>
            NO ASSET SELECTED
          </strong>

          <span>
            Select an asset on the satellite
            facility model to inspect its
            properties.
          </span>

        </div>

      </aside>
    );
  }

  return (
    <aside className="facility-inspector">

      <div className="facility-inspector-header">

        <div>

          <small>
            ASSET INSPECTOR
          </small>

          <h2>
            {asset.id}
          </h2>

        </div>

        <span>
          {asset.type}
        </span>

      </div>

      <div className="facility-inspector-scroll">

        <InspectorField
          label="Asset name"
          value={asset.name}
          onChange={(value) =>
            updateAsset(asset.id, {
              name: value,
            })
          }
        />

        <div className="facility-inspector-divider" />

        {asset.type === "tank" && (
          <div>

            <InspectorSectionTitle>
              PROCESS DATA
            </InspectorSectionTitle>

            <InspectorField
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

            <InspectorField
              label="Fuel / Material"
              value={asset.fuel}
              onChange={(value) =>
                updateAsset(asset.id, {
                  fuel: value,
                })
              }
            />

            <InspectorField
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

            <InspectorField
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

          </div>
        )}

        {asset.type === "storage" && (
          <div>

            <InspectorSectionTitle>
              STORAGE DATA
            </InspectorSectionTitle>

            <InspectorField
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

            <InspectorField
              label="Material"
              value={
                asset.material ||
                "Chemical"
              }
              onChange={(value) =>
                updateAsset(asset.id, {
                  material: value,
                })
              }
            />

          </div>
        )}

        <InspectorSectionTitle>
          POSITION
        </InspectorSectionTitle>

        <div className="facility-position-grid">

          <InspectorField
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

          <InspectorField
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

        <InspectorSectionTitle>
          STATUS
        </InspectorSectionTitle>

        <select
          className="facility-status-select"
          value={asset.status || "Normal"}
          onChange={(event) =>
            updateAsset(asset.id, {
              status: event.target.value,
            })
          }
        >

          <option>
            Normal
          </option>

          <option>
            Safe
          </option>

          <option>
            Warning
          </option>

          <option>
            Critical
          </option>

          <option>
            Offline
          </option>

        </select>

        <button
          type="button"
          className="facility-delete-button"
          onClick={() =>
            deleteAsset(asset.id)
          }
        >
          DELETE ASSET
        </button>

      </div>

    </aside>
  );
}

/*
|--------------------------------------------------------------------------
| INSPECTOR FIELD
|--------------------------------------------------------------------------
*/

function InspectorField({
  label,
  value,
  suffix,
  type = "text",
  onChange,
}) {
  return (
    <label className="facility-inspector-field">

      <span>
        {label}
      </span>

      <div>

        <input
          type={type}
          value={value ?? ""}
          onChange={(event) =>
            onChange(
              event.target.value
            )
          }
        />

        {suffix && (
          <small>
            {suffix}
          </small>
        )}

      </div>

    </label>
  );
}

/*
|--------------------------------------------------------------------------
| SECTION TITLE
|--------------------------------------------------------------------------
*/

function InspectorSectionTitle({
  children,
}) {
  return (
    <div className="facility-inspector-section-title">
      {children}
    </div>
  );
}