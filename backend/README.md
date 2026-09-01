# SafeZone AI — Backend Service

The backend service for SafeZone AI provides REST APIs for scenario management, physics engine orchestration, risk score aggregation, and report generation.

---

## 🛠️ Technology Stack

- **Language**: Java 17+
- **Framework**: Spring Boot 3.2.x (Spring Web, Spring Validation)
- **Build Tool**: Gradle
- **Testing**: JUnit 5, Spring Boot Test, MockMvc

---

## 📂 Package Architecture

```
backend/src/main/java/com/safezone/
├── SafeZoneApplication.java  # Main Spring Boot application entry point
├── config/                   # Configuration (CORS, security, converters)
│   └── CorsConfig.java
├── controller/               # REST API Controllers
│   └── HealthController.java
├── dto/                      # Data Transfer Objects & request/response records
│   └── HealthResponse.java
├── service/                  # Business logic & simulation pipeline coordinators
├── model/                    # Domain models & entities
└── repository/               # Data access layer & persistence interfaces
```

---

## 🚀 How to Run the Backend

### Prerequisites
- Java Development Kit (JDK 17 or higher) installed and set in `JAVA_HOME` / `PATH`.
- Gradle (or use wrapper).

### 1. Build the Project
From the `backend/` directory:
```bash
gradle build
```

### 2. Run Tests
```bash
gradle test
```

### 3. Start the Server
```bash
gradle bootRun
```

The server will start locally at **`http://localhost:8080`**.

---

## 📡 Available Endpoints

### 1. Health Check
- **Method**: `GET`
- **Path**: `/api/health`
- **Response**: `200 OK`
```json
{
  "status": "UP",
  "service": "SafeZone AI Backend"
}
```

### 2. Run Simulation
- **Method**: `POST`
- **Path**: `/api/simulations`
- **Request Body**: `SimulationRequestDto`
- **Response**: `200 OK` + `SimulationResponseDto` (or `400 Bad Request` on validation failure)

### 3. List All Simulations
- **Method**: `GET`
- **Path**: `/api/simulations`
- **Response**: `200 OK` + `List<SimulationResponseDto>`

### 4. Get Simulation Result by ID
- **Method**: `GET`
- **Path**: `/api/simulations/{simulationId}`
- **Response**: `200 OK` + `SimulationResponseDto` (or `404 Not Found` if ID does not exist)

---

## 🌐 CORS Configuration
CORS is configured in `com.safezone.config.CorsConfig` to allow requests originating from frontend development servers:
- `http://localhost:3000`
- `http://localhost:5173` (Vite)
- `http://localhost:4173`

---

## ⚙️ Simulation Engine Configuration

SafeZone AI supports three simulation engine modes via Spring Boot configuration properties:

| Property | Default Value | Description |
|---|---|---|
| `simulation.engine` | `mock` | Engine mode: `mock` (static demo fixture), `sedov` (internal Sedov-Taylor blast physics engine), or `physics` (external HTTP physics service). |
| `simulation.sedov.gamma` | `1.4` | Specific heat ratio ($\gamma$) of air. |
| `simulation.sedov.xi` | `1.033` | Dimensionless self-similarity constant ($\xi$) for spherical blast waves. |
| `simulation.sedov.polygon-points` | `36` | Number of vertices generated for each circular hazard zone polygon. |
| `simulation.sedov.threshold.critical-kpa` | `70.0` | Peak overpressure threshold for Critical blast hazard zone (total destruction). |
| `simulation.sedov.threshold.high-kpa` | `20.0` | Peak overpressure threshold for High blast hazard zone (heavy structural damage). |
| `simulation.sedov.threshold.moderate-kpa` | `5.0` | Peak overpressure threshold for Moderate blast hazard zone (minor / glass damage). |
| `simulation.physics.url` | `http://localhost:8000` | Base URL of Deep's external physics service (active when `simulation.engine=physics`). |
| `simulation.physics.endpoint` | `/api/physics/simulate` | Endpoint path on the external physics service. |

### Running with Internal Sedov-Taylor Physics Engine
```bash
# Via command-line argument:
gradle bootRun --args='--simulation.engine=sedov'

# Or via environment variable:
SIMULATION_ENGINE=sedov gradle bootRun
```

### Running with Mock Engine (Default for Local UI Testing)
```bash
gradle bootRun
```

### Running with External Physics Engine
```bash
gradle bootRun --args='--simulation.engine=physics --simulation.physics.url=http://localhost:8000'
```

---

## 🔬 Sedov-Taylor Blast Wave Physics Model

When `simulation.engine=sedov` is selected, SafeZone AI calculates blast parameters analytically using self-similar strong-shock theory and Rankine-Hugoniot boundary conditions:

### 1. Explosion Energy Conversion
$$E = m_{\text{TNT}} \times 4.184 \times 10^6 \text{ Joules}$$

### 2. Ambient Air Density ($\rho$)
Calculated from the ideal gas law rather than hardcoded:
$$T(\text{K}) = T(^\circ\text{C}) + 273.15,\quad P(\text{Pa}) = P(\text{kPa}) \times 1000$$
$$\rho = \frac{P}{R_{\text{air}} \cdot T} \quad \left(R_{\text{air}} = 287.05 \text{ J}/(\text{kg}\cdot\text{K})\right)$$

### 3. Shock Radius & Arrival Time
The self-similar shock front radius $R(t)$ at time $t$ after detonation:
$$R(t) = \xi \left( \frac{E}{\rho} \right)^{1/5} t^{2/5}$$
Inverting for shock arrival time at asset distance $d$:
$$t_{\text{arrival}} = \left( \frac{d}{\xi (E/\rho)^{1/5}} \right)^{5/2}$$

### 4. Shock Propagation Velocity
$$D(t) = \frac{dR}{dt} = \frac{2}{5} \frac{R(t)}{t}$$

### 5. Peak Overpressure ($\Delta P$)
Using the strong-shock Rankine-Hugoniot pressure jump condition immediately behind the shock front:
$$\Delta P(R) = \frac{2}{\gamma + 1} \rho D(R)^2 = \frac{8\,\xi^5 E}{25\,(\gamma + 1)\,R^3} \text{ (Pa)}$$
$$\Delta P_{\text{kPa}}(R) = \frac{\Delta P(R)}{1000}$$

### 6. Hazard Zone Contour Radii
Solving for the distance $R$ at which peak overpressure reaches threshold $\Delta P_{\text{threshold}}$:
$$R_{\text{threshold}} = \left( \frac{8\,\xi^5 E}{25\,(\gamma + 1)\,(\Delta P_{\text{threshold, kPa}} \times 1000)} \right)^{1/3} \text{ meters}$$

### 7. Assumptions & Limitations
- **Point-Source Detonation:** Assumes instantaneous, point-source energy release in a homogeneous, unconfined atmosphere.
- **Strong-Shock Approximation:** Rankine-Hugoniot pressure jump applies in the strong-shock regime; accuracy decreases in the very far acoustic field ($< 1$ kPa).
- **Unreflected Incident Wave:** Does not include complex Mach stem reflection, ground reflection factors, or 3D CFD obstacle diffraction.
- **Disclaimer:** This is an analytical educational/hackathon model designed for interactive safety scenario exploration. It is **NOT** a certified computational fluid dynamics (CFD) tool and must **NOT** be used for real life-critical plant safety operations.


