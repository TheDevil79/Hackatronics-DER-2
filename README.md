# SafeZone AI — Industrial Fire & Explosion Threat-Zone Simulator

SafeZone AI is a physics-backed industrial hazard and domino-effect threat-zone simulator designed for chemical and manufacturing plants. It models thermal radiation footprints, blast wave overpressures (Sedov-Taylor), atmospheric wind dispersion, and cascading multi-unit escalation risks to assist plant safety engineers and first responders.

---

## 👥 Team & Component Ownership

| Module | Owner | Scope / Responsibilities |
|---|---|---|
| **`backend/`** | **Vaibhav** (Lead/Coordinator) | REST APIs, request validation, database models, integration pipelines, automated report generation. |
| **`frontend/`** | **AR** | Interactive map UI, factory 2D/3D layout editor, sensor overlays, threat-zone visualization. |
| **`simulation/`** | **Deep** | Core physics models: thermal radiation (point source / solid flame), Sedov-Taylor blast wave, atmospheric wind vectoring, domino vulnerability & risk scoring. |
| **`shared/`** | **Team** | Canonical JSON schemas, API contracts, TypeScript/Python shared data structures. |
| **`docs/`** | **Team** | Architecture diagrams, physics assumptions & derivations, API specifications, hackathon pitch material. |

---

## 🌳 Repository Structure

```
SafeZone-AI/
├── frontend/          # React / Map UI / Factory layout editor
├── backend/           # FastAPI / REST APIs / Database / Coordination
├── simulation/        # Physics & explosion/radiation threat models
├── shared/            # Common schemas, types, and contracts
├── docs/              # Technical documentation & architecture notes
├── .gitignore         # Git ignore rules for Node, Python, env, and OS files
└── README.md          # Project overview and team ownership
```

---

## 🌿 Git Branching Strategy

- **`main`**: Protected integration and stable release branch. No direct commits.
- **`feature/backend-api`**: Vaibhav's development branch (Backend & Integration).
- **`feature/frontend-ui`**: AR's development branch (Frontend & Map UI).
- **`feature/simulation-engine`**: Deep's development branch (Physics Engine).

All feature branches branch off `main` and merge back into `main` via PRs / reviewed integration.
