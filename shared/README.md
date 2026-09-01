# SafeZone AI — Shared Data Contracts & Interface Specification

> **CANONICAL SOURCE OF TRUTH**: The JSON Schemas located in `shared/schemas/` define the official contract between **AR (Frontend)**, **Vaibhav (Backend)**, and **Deep (Simulation Engine)**. All module implementations and language-specific DTOs (TypeScript interfaces, Java Records, Pydantic models) derive from these schemas.

---

## 🧭 1. Local Facility Coordinates & Geographic Anchor

To eliminate any ambiguity between geographic mapping and physical simulation solvers:

```
                      +y (North, meters)
                              ▲
                              │
                              │        Asset (x, y, z)
                              │        • [x=+40m, y=+50m, z=0m]
                              │
 ─── -x (West, meters) ───────┼───────► +x (East, meters)
                              │ Origin (0, 0, 0)
                              │ [lat: 19.0760, lon: 72.8777]
                              │
                              ▼
                      -y (South, meters)
```

| Coordinate | Type | Definition & Rules |
|---|---|---|
| **Facility Anchor** | `latitude`, `longitude` | WGS84 decimal degrees. Used **ONLY** for world map placement and base orientation. |
| **Local $x$** | `number` | **Meters East (+)** / **West (-)** relative to the facility origin $(0, 0)$. |
| **Local $y$** | `number` | **Meters North (+)** / **South (-)** relative to the facility origin $(0, 0)$. |
| **Local $z$** | `number` | **Meters above local ground level** (default `0.0`). |

- **Frontend (AR)**: Translates canvas/map marker locations to local $(x, y, z)$ offsets in meters before generating request payloads.
- **Simulation (Deep)**: Solves all spatial models (Sedov-Taylor blast radius, point-source view factors, dispersion) purely in Cartesian metric space.

---

## 💨 2. Meteorological Wind Convention ("FROM" Direction)

- **Wind Direction (`directionDegreesFromNorth`)**: **METEOROLOGICAL STANDARD**
  - Specifies the azimuth angle in degrees clockwise from True North **FROM WHICH THE WIND IS BLOWING**.
  - `0.0°` = Wind blowing **from North** (towards South)
  - `90.0°` = Wind blowing **from East** (towards West)
  - `112.5°` = Wind blowing **from East-Southeast (ESE)** (towards West-Northwest)
  - `180.0°` = Wind blowing **from South** (towards North)
  - `270.0°` = Wind blowing **from West** (towards East)
- **Downwind Vector**: Physical plumes and flame tilts disperse towards:
  $$\theta_{\text{dispersion}} = (\theta_{\text{from}} + 180^\circ) \pmod{360^\circ}$$
- **Wind Speed (`speedMps`)**: In **meters per second ($\text{m/s}$)**.

---

## 💥 3. TNT Yield & Energy Conversion Convention

- **`tntEquivalentMassKg`**: Unambiguously defined as **TNT-equivalent mass in kilograms ($\text{kg}$)**.
- **Conversion Convention for Simulation Engine (Deep)**:
  Standard specific heat of detonation for TNT:
  $$E_{\text{TNT}} = 4.184 \times 10^6 \text{ J/kg} = 4.184 \text{ MJ/kg}$$
  Total explosion energy $E$ for Sedov-Taylor / blast shockwave modeling:
  $$E = m_{\text{TNT}} \times 4.184 \times 10^6 \text{ Joules}$$

---

## 🏷️ 4. Asset Types, Exits, Shelters, and Blockages

To maintain consistent and non-redundant modeling:

| Concept | Representation | Rationale |
|---|---|---|
| **Industrial Units** | `facility.assets[]` (`type`: `TANK`, `MACHINERY`, `BUILDING`, `STORAGE_AREA`) | Discrete facility physical assets with positions, dimensions, and contents. |
| **Exits & Gates** | `facility.assets[]` (`type`: `EXIT`) | Point locations for perimeter gates and muster points on the 2D layout. |
| **Shelters & Bunkers**| `facility.assets[]` (`type`: `SHELTER`) | Safe refuge structures with specific coordinates and blast/thermal ratings. |
| **Escape Routes** | `facility.escapeRoutes[]` | Ordered coordinate polyline paths leading from work areas to Exits/Shelters. |
| **Barriers & Walls** | `facility.blockages[]` | Separate entity with geometry and `attenuationFactor` (e.g. `BLAST_WALL`, `FIREWALL`, `BERM`). `BLOCKAGE` is intentionally removed from `AssetType`. |

---

## 📊 5. Severity Levels & Model-Derived Estimates

### Severity Tiers
Standardized to four tiers:
- **`LOW`**
- **`MODERATE`**
- **`HIGH`**
- **`CRITICAL`**

> **Note on Physical Thresholds**: The contract does not hardcode arbitrary physics thresholds. The simulation engine dynamically computes and provides the exact `thresholdValue` and `thresholdUnit` (e.g. $70 \text{ kPa}$, $37.5 \text{ kW/m}^2$) associated with each generated hazard zone.

### Model-Derived Estimates (Not Measured Certainties)
- **`failureProbabilityEstimate`**: Theoretical probability ($0.0 \dots 1.0$) computed via probit/vulnerability relations.
- **`estimatedTimeToRuptureSeconds`**: Model-derived estimated time to failure under incident thermal/blast flux.

---

## 🎯 6. Hazard Zone Classification

`HazardZoneDto` explicitly classifies threat zones into three primary mechanisms:
- **`THERMAL`**: Radiation flux from fires/BLEVEs ($\text{kW/m}^2$).
- **`BLAST`**: Shockwave peak overpressure from vapor explosions ($\text{kPa}$).
- **`COMBINED`**: Overlapping multi-hazard escalation contours.

---

## 📂 7. Directory & File Map

```
shared/
├── README.md                                    # This contract & conventions document
├── schemas/
│   ├── simulation-request.schema.json           # Canonical JSON Schema for Input
│   └── simulation-response.schema.json          # Canonical JSON Schema for Output
└── examples/
    ├── two-tank-explosion-request.json          # 2-Tank facility (T-101 explosion, ESE wind)
    └── two-tank-explosion-response.json         # Computed iso-zones, domino chain, safe routes
```
