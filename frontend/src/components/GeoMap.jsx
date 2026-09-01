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
import { useState } from "react";


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
// SELECTED INDUSTRIAL ZONE
// ------------------------------------------------------------

const INDUSTRIAL_ZONE = [
  [21.1705, 79.0805],
  [21.171, 79.096],
  [21.166, 79.0995],
  [21.157, 79.097],
  [21.156, 79.083],
  [21.162, 79.079],
];


// ------------------------------------------------------------
// MAIN COMPONENT
// ------------------------------------------------------------

export default function GeoMap({ onEnterZone }) {
  const [mapLayer, setMapLayer] = useState("satellite");

  const [selectedZone, setSelectedZone] = useState(true);

  const [search, setSearch] = useState("");

  const [location, setLocation] = useState(null);

  const [showFacilities, setShowFacilities] = useState(true);

  const [showShelters, setShowShelters] = useState(true);

  const [showHospital, setShowHospital] = useState(true);

  const center = [21.1659, 79.0889];


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


        {/* CUSTOM ZONE */}

        <button
          className="geo-secondary-button"
          onClick={() => {
            alert(
              "Custom zone drawing will be connected next."
            );
          }}
        >
          + DRAW CUSTOM ZONE
        </button>


        <button
          className="geo-secondary-button"
          onClick={() => {
            alert(
              "KML / GeoJSON upload will be connected next."
            );
          }}
        >
          ↑ UPLOAD KML / GEOJSON
        </button>

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
                positions={INDUSTRIAL_ZONE}
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


          {/* SELECTED ZONE LABEL */}

          {selectedZone && (
            <div className="selected-zone-label">

              <div className="zone-pin">
                ●
              </div>

              <div>

                <strong>
                  Selected Zone
                </strong>

                <span>
                  Industrial Zone 01
                </span>

              </div>

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
              Industrial Zone 01
            </h2>

            <div className="zone-stats">

              <div>
                <span>AREA</span>
                <strong>8.62 km²</strong>
              </div>

              <div>
                <span>POPULATION</span>
                <strong>12,540</strong>
              </div>

              <div>
                <span>ELEVATION</span>
                <strong>310 m</strong>
              </div>

              <div>
                <span>FACILITIES</span>
                <strong>3</strong>
              </div>

            </div>

          </section>


          {/* COORDINATES */}

          <section className="coordinate-card">

            <div className="card-label">
              CENTER COORDINATES
            </div>

            <div className="coordinate-value">
              21.1659° N
            </div>

            <div className="coordinate-value">
              79.0889° E
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