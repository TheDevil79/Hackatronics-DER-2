import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polygon,
  CircleMarker,
  useMap,
} from "react-leaflet";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useState, useEffect } from "react";


// ------------------------------------------------------------
// FIX DEFAULT LEAFLET MARKER ICON
// ------------------------------------------------------------

const markerIcon = new L.Icon({
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",

  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",

  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",

  iconSize: [25, 41],
  iconAnchor: [12, 41],
});


// ------------------------------------------------------------
// MAP LAYERS
// ------------------------------------------------------------

const MAP_LAYERS = {
  street: {
    name: "Street",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>',
  },

  satellite: {
    name: "Satellite",
    url:
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution:
      "Tiles &copy; Esri",
  },
};


// ------------------------------------------------------------
// MAP LOCATION CONTROLLER
// ------------------------------------------------------------

function LocationController({ location }) {
  const map = useMap();

  if (location) {
    map.flyTo(location, 15, {
      duration: 1.2,
    });
  }

  return null;
}


// ------------------------------------------------------------
// SAMPLE FACILITY DATA
// ------------------------------------------------------------

const FACILITIES = [
  {
    id: "factory-a",
    name: "Factory A",
    type: "Industrial Facility",
    position: [21.1654, 79.0872],
  },

  {
    id: "factory-b",
    name: "Factory B",
    type: "Industrial Facility",
    position: [21.1685, 79.092],
  },

  {
    id: "factory-c",
    name: "Factory C",
    type: "Industrial Facility",
    position: [21.1612, 79.091],
  },

  {
    id: "hospital",
    name: "City Hospital",
    type: "Hospital",
    position: [21.1695, 79.099],
  },

  {
    id: "shelter-1",
    name: "Shelter 1",
    type: "Emergency Shelter",
    position: [21.171, 79.087],
  },

  {
    id: "shelter-2",
    name: "Shelter 2",
    type: "Emergency Shelter",
    position: [21.164, 79.101],
  },

  {
    id: "shelter-3",
    name: "Shelter 3",
    type: "Emergency Shelter",
    position: [21.158, 79.089],
  },
];


// ------------------------------------------------------------
// INDUSTRIAL ZONES
// ------------------------------------------------------------

const ZONES = {
  zone1: {
    id: "zone1",
    name: "Industrial Zone 01",
    subName: "PetroChem Core Complex",
    center: [21.1659, 79.0889],
    area: "8.62 km²",
    population: "12,540",
    elevation: "310 m",
    facilitiesCount: 3,
    boundary: [
      [21.1705, 79.0805],
      [21.171, 79.096],
      [21.166, 79.0995],
      [21.157, 79.097],
      [21.156, 79.083],
      [21.162, 79.079],
    ]
  },
  zone2: {
    id: "zone2",
    name: "Industrial Zone 02",
    subName: "Refinery & Storage Terminal",
    center: [21.1820, 79.1120],
    area: "11.45 km²",
    population: "8,920",
    elevation: "295 m",
    facilitiesCount: 4,
    boundary: [
      [21.1880, 79.1020],
      [21.1895, 79.1220],
      [21.1810, 79.1260],
      [21.1740, 79.1180],
      [21.1760, 79.1050],
    ]
  },
  zone3: {
    id: "zone3",
    name: "Industrial Zone 03",
    subName: "Chemical Freight Logistics Corridor",
    center: [21.1480, 79.0650],
    area: "6.80 km²",
    population: "5,410",
    elevation: "325 m",
    facilitiesCount: 2,
    boundary: [
      [21.1540, 79.0580],
      [21.1550, 79.0720],
      [21.1440, 79.0740],
      [21.1410, 79.0620],
    ]
  }
};

const INDUSTRIAL_ZONE = ZONES.zone1.boundary;

// ------------------------------------------------------------
// MAIN COMPONENT
// ------------------------------------------------------------

export default function GeoMap({ onEnterZone }) {
  const [mapLayer, setMapLayer] = useState("satellite");
  const [activeZoneKey, setActiveZoneKey] = useState("zone1");
  const [selectedZone, setSelectedZone] = useState(true);
  const [zoneToastVisible, setZoneToastVisible] = useState(true);
  const [customGeoJson, setCustomGeoJson] = useState(null);

  useEffect(() => {
    setZoneToastVisible(true);
    const timer = setTimeout(() => {
      setZoneToastVisible(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, [activeZoneKey]);

  const [search, setSearch] = useState("");
  const [location, setLocation] = useState(null);

  const [showFacilities, setShowFacilities] = useState(true);
  const [showShelters, setShowShelters] = useState(true);
  const [showHospital, setShowHospital] = useState(true);

  const currentZone = ZONES[activeZoneKey] || ZONES.zone1;
  const center = currentZone.center;


  // ----------------------------------------------------------
  // SEARCH LOCATION
  // ----------------------------------------------------------

  const handleSearch = async () => {
    if (!search.trim()) return;

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          search
        )}`
      );

      const data = await response.json();

      if (data.length > 0) {
        setLocation([
          Number(data[0].lat),
          Number(data[0].lon),
        ]);
      } else {
        alert("Location not found.");
      }
    } catch (error) {
      console.error(error);
      alert("Unable to search location.");
    }
  };


  // ----------------------------------------------------------
  // ENTER ZONE
  // ----------------------------------------------------------

  const handleEnterZone = () => {
    if (!selectedZone) {
      alert("Please select an industrial zone first.");
      return;
    }

    if (onEnterZone) {
      onEnterZone({
        name: "Industrial Zone 01",

        center: center,

        boundary: INDUSTRIAL_ZONE,

        area: "8.62 km²",

        population: "12,540",

        elevation: "310 m",
      });
    }
  };


  // ----------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------

  return (
    <div className="geo-page">

      {/* -------------------------------------------------- */}
      {/* LEFT CONTROL PANEL */}
      {/* -------------------------------------------------- */}

      <aside className="geo-sidebar">

        <div className="geo-section-title">
          <span>01</span>
          GEOGRAPHIC MAP
        </div>

        <h2>Select Zone</h2>

        <p className="geo-description">
          Select an industrial zone from the locality map.
        </p>


        {/* SEARCH */}

        <div className="geo-search">

          <input
            type="text"
            placeholder="Search city, address or coordinates..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleSearch();
              }
            }}
          />

          <button onClick={handleSearch}>
            SEARCH
          </button>

        </div>


        {/* MAP LAYERS */}

        <div className="geo-panel">

          <div className="geo-panel-heading">
            MAP LAYERS
          </div>

          <label className="geo-check">
            <input
              type="radio"
              name="map-layer"
              checked={mapLayer === "satellite"}
              onChange={() => setMapLayer("satellite")}
            />

            <span>Satellite Imagery</span>
          </label>

          <label className="geo-check">
            <input
              type="radio"
              name="map-layer"
              checked={mapLayer === "street"}
              onChange={() => setMapLayer("street")}
            />

            <span>Street Map</span>
          </label>

          <label className="geo-check">
            <input
              type="checkbox"
              checked={showFacilities}
              onChange={(event) =>
                setShowFacilities(event.target.checked)
              }
            />

            <span>Industrial Facilities</span>
          </label>

          <label className="geo-check">
            <input
              type="checkbox"
              checked={showHospital}
              onChange={(event) =>
                setShowHospital(event.target.checked)
              }
            />

            <span>Hospitals</span>
          </label>

          <label className="geo-check">
            <input
              type="checkbox"
              checked={showShelters}
              onChange={(event) =>
                setShowShelters(event.target.checked)
              }
            />

            <span>Emergency Shelters</span>
          </label>

        </div>


        {/* LEGEND */}

        <div className="geo-panel">

          <div className="geo-panel-heading">
            LEGEND
          </div>

          <div className="geo-legend-item">
            <span className="legend-dot factory"></span>
            Industrial Facility
          </div>

          <div className="geo-legend-item">
            <span className="legend-dot selected"></span>
            Selected Zone
          </div>

          <div className="geo-legend-item">
            <span className="legend-dot hospital"></span>
            Hospital
          </div>

          <div className="geo-legend-item">
            <span className="legend-dot shelter"></span>
            Shelter
          </div>

        </div>


        {/* ZONE SWITCHER */}

        <div className="geo-panel">

          <div className="geo-panel-heading">
            INDUSTRIAL ZONES
          </div>

          {Object.values(ZONES).map((z) => (
            <label key={z.id} className="geo-check" style={{ marginBottom: "6px" }}>
              <input
                type="radio"
                name="zone-select"
                checked={activeZoneKey === z.id}
                onChange={() => {
                  setActiveZoneKey(z.id);
                  setLocation(z.center);
                }}
              />
              <div>
                <strong>{z.name}</strong>
                <small style={{ display: "block", color: "var(--text-2)", fontSize: "10px" }}>
                  {z.subName}
                </small>
              </div>
            </label>
          ))}

        </div>


        {/* CUSTOM ZONE & GEOJSON UPLOAD */}

        <label className="geo-secondary-button" style={{ display: "block", textAlign: "center", cursor: "pointer" }}>
          ↑ UPLOAD GEOJSON / KML
          <input
            type="file"
            accept=".json,.geojson,.kml"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = (event) => {
                try {
                  const parsed = JSON.parse(event.target.result);
                  setCustomGeoJson(parsed);
                  alert(`Successfully loaded GeoJSON: ${file.name}`);
                } catch {
                  alert("Failed to parse GeoJSON file. Please upload a valid .geojson or .json format.");
                }
              };
              reader.readAsText(file);
            }}
          />
        </label>

        {customGeoJson && (
          <button
            className="geo-secondary-button"
            style={{ borderColor: "var(--red)", color: "var(--red)" }}
            onClick={() => setCustomGeoJson(null)}
          >
            ✕ CLEAR CUSTOM GEOJSON
          </button>
        )}

      </aside>


      {/* -------------------------------------------------- */}
      {/* MAP */}
      {/* -------------------------------------------------- */}

      <main className="geo-map-area">

        <div className="geo-map-header">

          <div>

            <div className="geo-breadcrumb">
              SITE / LOCALITY
            </div>

            <h1>
              Geographic Site Map
            </h1>

            <p>
              Select the industrial zone you want to model.
            </p>

          </div>

          <div className="map-status">
            <span></span>
            LIVE MAP
          </div>

        </div>


        <div className="geo-map-wrapper">

          <MapContainer
            center={center}
            zoom={14}
            scrollWheelZoom={true}
            className="geo-leaflet-map"
          >

            <TileLayer
              url={MAP_LAYERS[mapLayer].url}
              attribution={MAP_LAYERS[mapLayer].attribution}
            />


            <LocationController location={location} />


            {/* INDUSTRIAL ZONE */}

            {selectedZone && (
              <Polygon
                positions={currentZone.boundary}
                pathOptions={{
                  color: "#ff3b30",
                  weight: 3,
                  dashArray: "10 8",
                  fillColor: "#ff3b30",
                  fillOpacity: 0.16,
                }}

                eventHandlers={{
                  click: () => setSelectedZone(true),
                }}
              />
            )}


            {/* FACILITIES */}

            {showFacilities &&
              FACILITIES.filter(
                (facility) =>
                  facility.type === "Industrial Facility"
              ).map((facility) => (

                <CircleMarker
                  key={facility.id}
                  center={facility.position}
                  radius={9}
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

                    {facility.type}

                  </Popup>

                </CircleMarker>

              ))}


            {/* HOSPITAL */}

            {showHospital &&
              FACILITIES.filter(
                (facility) =>
                  facility.type === "Hospital"
              ).map((facility) => (

                <Marker
                  key={facility.id}
                  position={facility.position}
                  icon={markerIcon}
                >

                  <Popup>

                    <strong>
                      {facility.name}
                    </strong>

                    <br />

                    Hospital

                  </Popup>

                </Marker>

              ))}


            {/* SHELTERS */}

            {showShelters &&
              FACILITIES.filter(
                (facility) =>
                  facility.type === "Emergency Shelter"
              ).map((facility) => (

                <Marker
                  key={facility.id}
                  position={facility.position}
                  icon={markerIcon}
                >

                  <Popup>

                    <strong>
                      {facility.name}
                    </strong>

                    <br />

                    Emergency Shelter

                  </Popup>

                </Marker>

              ))}

          </MapContainer>


          {/* SELECTED ZONE LABEL (AUTO-DISMISSING) */}

          {zoneToastVisible && (
            <div
              className="selected-zone-label"
              onClick={() => setZoneToastVisible(false)}
              style={{ cursor: "pointer" }}
              title="Click to dismiss"
            >
              <div className="zone-pin">
                ●
              </div>

              <div>
                <strong>
                  Selected Zone
                </strong>

                <span>
                  {currentZone.name}
                </span>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setZoneToastVisible(false);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--muted)",
                  cursor: "pointer",
                  marginLeft: "8px",
                  fontSize: "10px",
                }}
              >
                ✕
              </button>
            </div>
          )}


          {/* MAP NORTH */}

          <div className="map-north">
            N
            <div>▲</div>
          </div>

        </div>


        {/* ------------------------------------------------ */}
        {/* BOTTOM INFORMATION */}
        {/* ------------------------------------------------ */}

        <div className="geo-bottom-grid">


          {/* ZONE INFORMATION */}

          <section className="zone-info-card">

            <div className="card-label">
              SELECTED AREA
            </div>

            <h2>
              {currentZone.name}
            </h2>

            <div className="zone-stats">

              <div>
                <span>AREA</span>
                <strong>{currentZone.area}</strong>
              </div>

              <div>
                <span>POPULATION</span>
                <strong>{currentZone.population}</strong>
              </div>

              <div>
                <span>ELEVATION</span>
                <strong>{currentZone.elevation}</strong>
              </div>

              <div>
                <span>FACILITIES</span>
                <strong>{currentZone.facilitiesCount}</strong>
              </div>

            </div>

          </section>


          {/* COORDINATES */}

          <section className="coordinate-card">

            <div className="card-label">
              CENTER COORDINATES
            </div>

            <div className="coordinate-value">
              {currentZone.center[0]}° N
            </div>

            <div className="coordinate-value">
              {currentZone.center[1]}° E
            </div>

          </section>


          {/* ACTION */}

          <section className="zone-action-card">

            <div>

              <div className="card-label">
                NEXT STEP
              </div>

              <strong>
                Build your facility model
              </strong>

              <p>
                Enter this zone and place tanks,
                buildings and other industrial assets.
              </p>

            </div>

            <button
              className="enter-zone-button"
              onClick={handleEnterZone}
            >
              ENTER ZONE
              <span>→</span>
            </button>

          </section>

        </div>

      </main>

    </div>
  );
}