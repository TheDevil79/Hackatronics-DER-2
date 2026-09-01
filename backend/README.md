# SafeZone AI — Backend Service & Physics Simulation Engines

The backend service for SafeZone AI provides REST APIs for scenario management, physics engine orchestration, risk score aggregation, and consequence evaluation.

> [!IMPORTANT]
> **DISCLAIMER**: SafeZone AI is an educational demonstrator and hackathon prototype. It is **NOT** a certified engineering safety calculator or CFD simulation tool and must not be used for life-critical plant safety operations.

---

## 🏗️ Architecture Overview

SafeZone AI adopts a clean, modular architecture separating physical blast wave modeling from consequence analysis:

```
                            +--------------------------+
                            |     Frontend Client      |
                            +--------------------------+
                                         |
                                         | POST /api/simulations
                                         v
                            +--------------------------+
                            |   SimulationController   |
                            +--------------------------+
                                         |
                                         v
                            +--------------------------+
                            |    SimulationService     |
                            +--------------------------+
                                         |
                      +------------------+------------------+
                      |                                     |
                      v                                     v
         +--------------------------+          +--------------------------+
         |SedovTaylorSimulationEngine|          |PythonSedovSimulationEngine|
         |    (Java In-Process)     |          |  (Spring RestClient)     |
         +--------------------------+          +--------------------------+
                      |                                     |
                      | (Fallback)                          | HTTP JSON
                      |                                     v
                      |                        +--------------------------+
                      |                        |  FastAPI Python Service  |
                      |                        |     (Port 8000)          |
                      |                        +--------------------------+
                      |                                     |
                      |                                     v
                      +----------------> [ Consequence Pipeline ] <---------+
                                         - DamageAssessmentService
                                         - DominoAnalysisService
                                         - RouteAssessmentService
                                         - RiskAssessmentService
                                         - SimulationRepository
```

### Module Responsibilities

| Layer | Component | Language | Scope / Responsibilities |
|---|---|---|---|
| **Physics Model** | `simulation/` (FastAPI) | Python 3.10+ | Pure blast propagation: Sedov-Taylor radius $R(t)$, shock velocity $D(t)$, wind advection $(u_x, u_y)$, asymmetry $\alpha$, directional blast front deformation, and point overpressures. |
| **Fallback Physics** | `SedovTaylorSimulationEngine` | Java 17 | In-process analytical Sedov-Taylor physics with directional wind modulation (`WindEffectModel`). |
| **Client / Adapter** | `PythonSedovSimulationEngine` | Java 17 | Transforms DTOs (TNT mass $\to$ Joules, m/s $\to$ km/h), communicates with Python over HTTP, and coordinates consequence layers. |
| **Consequence Analysis**| `DamageAssessmentService` | Java 17 | Authoritative damage states (`TOTAL_LOSS`, `STRUCTURAL_DAMAGE`, `MINOR_DAMAGE`), failure probability, time-to-rupture. |
| **Domino Cascade** | `DominoAnalysisService` | Java 17 | Secondary escalation graph, arrival + rupture delays, multi-hop domino chain. |
| **Route Vulnerability** | `RouteAssessmentService` | Java 17 | Evacuation route safety classification (`SAFE`, `CAUTION`, `UNSAFE`) and path cutoff distance. |
| **Multi-Hazard Risk** | `RiskAssessmentService` | Java 17 | Multi-hazard risk score calculation and severity classification (`LOW`, `MODERATE`, `HIGH`, `CRITICAL`). |

---

## 🚀 How to Run

### 1. Start the Python Physics Service
```bash
cd simulation
pip install -r requirements.txt
python run.py
```
The Python service will be available at **`http://localhost:8000`**.
- Health check: `GET http://localhost:8000/health`
- Simulate endpoint: `POST http://localhost:8000/api/physics/simulate`

### 2. Start the Spring Boot Backend

#### Option A: Run with Python Physics Engine (Default for advanced wind model)
```bash
cd backend
gradle bootRun --args='--simulation.engine=python-sedov'
```

#### Option B: Run with Java Sedov-Taylor Engine
```bash
gradle bootRun --args='--simulation.engine=java-sedov'
```

#### Option C: Run with Mock Engine (Static demo fixture)
```bash
gradle bootRun --args='--simulation.engine=mock'
```

The Spring Boot backend will be available at **`http://localhost:8080`**.

---

## ⚙️ Engine Configuration & Aliases

Configure `application.properties` or provide CLI arguments:

```properties
# Engine Selection: 'python-sedov', 'java-sedov', or 'mock'
# Supported aliases:
#   'python', 'physics', 'sedov-python' -> PythonSedovSimulationEngine
#   'sedov', 'java-sedov'                -> SedovTaylorSimulationEngine
#   'mock'                               -> MockSimulationEngine
simulation.engine=python-sedov

# Python Microservice Connection Settings
simulation.python.base-url=http://localhost:8000
simulation.python.connect-timeout-ms=2000
simulation.python.read-timeout-ms=10000
simulation.python.fallback-to-java=true
```

### Automatic Fallback Behavior
When `simulation.engine=python-sedov` and `simulation.python.fallback-to-java=true`:
- If the Python microservice is offline or unreachable, the backend logs a warning:
  `"Python Sedov engine unavailable; falling back to Java Sedov engine."`
- The request seamlessly executes using `SedovTaylorSimulationEngine` without returning an HTTP 500 error to the client.

---

## 💨 Wind Validation & Physics Verification

### Benchmark Case: Equal-Distance Upwind vs Downwind Assets
- **Epicenter**: `T-SRC` at `(40, 50)`
- **Downwind Asset**: `T-WEST` at `(-15, 50)` — 55 m West
- **Upwind Asset**: `T-EAST` at `(95, 50)` — 55 m East
- **Wind**: 3 m/s (10.8 km/h) FROM East (90°)

### Results & Verification:
1. **Blast Center Advection**: The blast epicenter shifts towards the West $(-X)$ in the direction of wind travel.
2. **Directional Deformation**: The shock front stretches in the downwind direction ($\alpha > 0$).
3. **Asset Exposure**:
   - `T-WEST` (Downwind): Higher overpressure, higher failure probability, and shorter rupture time.
   - `T-EAST` (Upwind): Lower overpressure, lower exposure, and prolonged rupture time.
4. **Zero-Wind Symmetry**: When wind speed is 0 km/h, $\alpha = 0$, blast center remains at $(x_0, y_0)$, and exposure is symmetric.

---

## 📡 API Endpoints

### 1. Run Simulation
- **Method**: `POST`
- **Path**: `/api/simulations`
- **Request Body**:
```json
{
  "requestId": "req-safezone-demo-001",
  "facility": {
    "facilityId": "FAC-PETRO-09",
    "name": "Apex Petrochemical Storage Yard",
    "location": { "latitude": 19.0760, "longitude": 72.8777, "elevationMeters": 12.0 },
    "boundary": {
      "widthMeters": 300.0,
      "lengthMeters": 200.0,
      "polygon": [
        { "x": -50.0, "y": -50.0 }, { "x": 250.0, "y": -50.0 },
        { "x": 250.0, "y": 150.0 }, { "x": -50.0, "y": 150.0 }
      ]
    },
    "assets": [
      {
        "assetId": "T-101",
        "name": "LPG Storage Sphere 1",
        "type": "TANK",
        "position": { "x": 40.0, "y": 50.0, "z": 0.0 },
        "dimensions": { "diameter": 14.0, "height": 16.0 },
        "tankProperties": { "material": "LPG", "capacityM3": 1500.0, "fillLevelPercentage": 75.0, "operatingPressureBar": 8.5, "operatingTemperatureC": 28.0, "containmentDike": true }
      },
      {
        "assetId": "T-102",
        "name": "Propane Storage Sphere 2",
        "type": "TANK",
        "position": { "x": 95.0, "y": 50.0, "z": 0.0 },
        "dimensions": { "diameter": 14.0, "height": 16.0 },
        "tankProperties": { "material": "PROPANE", "capacityM3": 1500.0, "fillLevelPercentage": 60.0, "operatingPressureBar": 9.2, "operatingTemperatureC": 28.0, "containmentDike": true }
      }
    ],
    "escapeRoutes": [
      {
        "routeId": "ROUTE-WEST",
        "name": "West Perimeter Evacuation Path",
        "points": [ { "x": 50.0, "y": 20.0 }, { "x": 10.0, "y": 20.0 }, { "x": -40.0, "y": 20.0 } ]
      }
    ],
    "blockages": []
  },
  "incident": {
    "sourceAssetId": "T-101",
    "incidentType": "VAPOR_CLOUD_EXPLOSION",
    "parameters": {
      "fuelMassKg": 4500.0,
      "tntEquivalentMassKg": 675.0,
      "firePoolDiameterMeters": 22.0,
      "releaseDurationSeconds": 45.0
    }
  },
  "wind": {
    "speedMps": 6.5,
    "directionDegreesFromNorth": 112.5,
    "directionCompass": "ESE",
    "unit": "METRIC"
  },
  "environment": {
    "ambientTemperatureC": 32.0,
    "relativeHumidityPercentage": 65.0,
    "atmosphericPressureKPa": 101.325,
    "stabilityClass": "D",
    "solarRadiationWm2": 650.0
  },
  "simulationConfig": {
    "thermalCalculationEnabled": true,
    "blastCalculationEnabled": true,
    "dominoAnalysisEnabled": true,
    "gridResolutionMeters": 2.0,
    "timeHorizonSeconds": 600.0
  }
}
```

---

## 🧪 Testing

Run test suite:
```bash
# Python tests
cd simulation && python -m unittest test_physics.py

# Java tests
cd backend && gradle test
```
