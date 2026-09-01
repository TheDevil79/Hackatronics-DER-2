# SafeZone AI — Industrial Fire, Blast & Threat-Zone Simulator

**SafeZone AI** is an advanced, physics-grounded industrial hazard and domino-effect threat-zone simulator designed for chemical refineries, petrochemical storage, and manufacturing plants. It combines analytical gas dynamics (Sedov-Taylor blast wave propagation), atmospheric advection vectoring, thermal radiation footprints, and cascading multi-unit vulnerability estimation to assist plant safety engineers, risk officers, and emergency first responders.

---

## 👥 Team & Component Ownership

| Module | Owner | Scope / Responsibilities |
|---|---|---|
| **`backend/`** | **Vaibhav** (Lead/Coordinator) | Spring Boot 3 REST APIs, consequence analysis pipeline, multi-zone risk matrices, canonical schema validation. |
| **`frontend/`** | **AR** | Vite + React industrial control dashboard, 2D Cartesian physics canvas, tactical vector evacuation corridors, Leaflet geospatial overlay. |
| **`simulation/`** | **Deep** | Python FastAPI Sedov-Taylor blast propagation engine, atmospheric wind advection, Matplotlib visualizer (`visualizer.py`), and analytical physics formulas. |
| **`shared/`** | **Team** | Canonical JSON schemas (`simulation-request.schema.json`, `simulation-response.schema.json`). |
| **`docs/`** | **Team** | Mathematical derivations, architecture diagrams, compliance references, and runbooks. |

---

## 🌳 Repository Structure

```
SafeZone-AI/
├── frontend/          # React + Vite dashboard, 2D Cartesian canvas, Tactical Egress, Leaflet maps
├── backend/           # Spring Boot 3.2 Java REST API & Python orchestration pipeline
├── simulation/        # Python FastAPI wind-advected Sedov-Taylor physics microservice
├── shared/            # JSON Schema definitions & cross-language API contracts
├── docs/              # Physics models, architectural specifications, and API docs
├── .gitignore         # Ignores sensitive .env, secrets, build artifacts, and node_modules
└── README.md          # Project documentation and setup guide
```

---

## 🔒 Security & Environment Variables

All API keys, endpoints, and credentials are kept out of version control. Copy `.env.example` to `.env` in the appropriate directories:

### Frontend Configuration (`frontend/.env`)
```bash
# SafeZone AI - Frontend Environment
VITE_API_BASE_URL=http://localhost:8080/api/v1
VITE_PHYSICS_ENGINE_URL=http://localhost:8000
VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_token_here_optional
```

> **Note**: `.env` and `.env.*` are strictly excluded in `.gitignore` to prevent any accidental leakage of private tokens or credentials.

---

## 🚀 Quickstart & Local Execution

### 1. Physics Engine (Python FastAPI)
```bash
cd simulation
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
python run.py
# Running on: http://localhost:8000
```

### 2. Core Backend (Spring Boot)
```bash
cd backend
# On Windows:
.\gradlew.bat bootRun
# On Linux/macOS:
./gradlew bootRun
# Running on: http://localhost:8080
```

### 3. Frontend Control Center (React + Vite)
```bash
cd frontend
npm install
npm run dev
# Running on: http://localhost:5173
```

---

## 🌿 Branching Strategy & Pull Request Workflow

To submit changes via a dedicated feature branch and Pull Request:

1. **Create and switch to your feature branch**:
   ```bash
   git checkout -b feature/frontend-threat-analysis
   ```

2. **Stage and commit your changes**:
   ```bash
   git add .
   git commit -m "feat: complete educational blast physics visualizer, tactical evacuation system, and facility snapshot"
   ```

3. **Push the branch to your remote repository**:
   ```bash
   git push -u origin feature/frontend-threat-analysis
   ```

4. **Create a Pull Request (PR)**:
   * Open your GitHub repository in your browser.
   * Click **Compare & pull request** next to your pushed branch.
   * Set the base branch to `main` and compare branch to `feature/frontend-threat-analysis`.
   * Review diffs and click **Create pull request**.

