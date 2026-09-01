/**
 * Centralized API & Service Layer for SafeZone AI
 * Connects frontend to Spring Boot backend and Python Physics simulation engine.
 * Automatically falls back to isolated mock dataset when backend is unreachable.
 */

import {
  INITIAL_FACILITY_ASSETS,
  MOCK_SIMULATION_RESULT,
  MOCK_REPORTS
} from "./mockData";

const BACKEND_API_BASE = import.meta.env?.VITE_API_BASE_URL || "http://localhost:8080/api";
const PHYSICS_API_BASE = import.meta.env?.VITE_PHYSICS_API_URL || "http://localhost:8000/api/physics";

const REQUEST_TIMEOUT_MS = 4000;

/**
 * Robust fetch with timeout
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(options.headers || {})
      }
    });
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Central SafeZone API Client
 */
export const SafeZoneApi = {
  // -------------------------------------------------------------
  // Backend Health & Connectivity
  // -------------------------------------------------------------
  async checkBackendHealth() {
    try {
      const res = await fetchWithTimeout(`${BACKEND_API_BASE}/health`, { method: "GET" }, 2000);
      if (res.ok) {
        const data = await res.json();
        return { isOnline: true, isLive: true, data, message: "Connected to SafeZone Spring Boot Backend" };
      }
    } catch {
      // Backend not running
    }
    return { isOnline: false, isLive: false, message: "Running in Offline / Mock Mode (Backend at localhost:8080 offline)" };
  },

  // -------------------------------------------------------------
  // Facility & Assets (GET /api/facility, /api/assets, etc.)
  // -------------------------------------------------------------
  async getFacility() {
    try {
      const res = await fetchWithTimeout(`${BACKEND_API_BASE}/facility`);
      if (res.ok) {
        const data = await res.json();
        return { isLive: true, data };
      }
    } catch {
      // Fallback
    }
    return {
      isLive: false,
      data: {
        facilityId: "FACILITY-ZONE-01",
        name: "PetroChem Industrial Complex - Zone 01",
        center: [21.1659, 79.0889],
        zone: "Zone 01",
        assets: INITIAL_FACILITY_ASSETS
      }
    };
  },

  async getAssets() {
    try {
      const res = await fetchWithTimeout(`${BACKEND_API_BASE}/assets`);
      if (res.ok) {
        const data = await res.json();
        return { isLive: true, data };
      }
    } catch {
      // Fallback
    }
    return { isLive: false, data: INITIAL_FACILITY_ASSETS };
  },

  async createAsset(asset) {
    try {
      const res = await fetchWithTimeout(`${BACKEND_API_BASE}/assets`, {
        method: "POST",
        body: JSON.stringify(asset)
      });
      if (res.ok) {
        const data = await res.json();
        return { isLive: true, data };
      }
    } catch {
      // Fallback
    }
    return { isLive: false, data: asset };
  },

  async updateAsset(id, assetUpdates) {
    try {
      const res = await fetchWithTimeout(`${BACKEND_API_BASE}/assets/${id}`, {
        method: "PUT",
        body: JSON.stringify(assetUpdates)
      });
      if (res.ok) {
        const data = await res.json();
        return { isLive: true, data };
      }
    } catch {
      // Fallback
    }
    return { isLive: false, data: { id, ...assetUpdates } };
  },

  async deleteAsset(id) {
    try {
      const res = await fetchWithTimeout(`${BACKEND_API_BASE}/assets/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        return { isLive: true, success: true };
      }
    } catch {
      // Fallback
    }
    return { isLive: false, success: true };
  },

  // -------------------------------------------------------------
  // Environmental Conditions (GET /api/environment)
  // -------------------------------------------------------------
  async getEnvironment() {
    try {
      const res = await fetchWithTimeout(`${BACKEND_API_BASE}/environment`);
      if (res.ok) {
        const data = await res.json();
        return { isLive: true, data };
      }
    } catch {
      // Fallback
    }
    return {
      isLive: false,
      data: {
        windSpeedMs: 5.4,
        windSpeedKmh: 19.44,
        windDirection: "NW",
        windDirectionDeg: 315,
        temperatureC: 28.5,
        humidityPercent: 45,
        ambientPressurePa: 101325,
        airDensityKgM3: 1.225,
        atmosphere: "Stable",
        visibility: "Good"
      }
    };
  },

  // -------------------------------------------------------------
  // Simulation Engine (POST /api/simulations, /api/simulation/blast, etc.)
  // -------------------------------------------------------------
  async runSimulation(payload) {
    // 1. Try Spring Boot canonical endpoint POST /api/simulations
    try {
      const res = await fetchWithTimeout(`${BACKEND_API_BASE}/simulations`, {
        method: "POST",
        body: JSON.stringify(payload)
      }, 8000);

      if (res.ok) {
        const data = await res.json();
        return {
          isLive: true,
          engine: "Spring Boot SafeZone Core Engine",
          data
        };
      }
    } catch (err) {
      console.warn("Spring Boot backend simulation unreachable, trying Python Physics service:", err.message);
    }

    // 2. Try FastAPI Python physics simulation endpoint POST /api/physics/simulate
    try {
      const physicsPayload = {
        energyJ: payload.energyJ || 2.5e9,
        durationSeconds: payload.durationSeconds || 1.5,
        airDensityKgM3: payload.airDensityKgM3 || 1.225,
        ambientPressurePa: payload.ambientPressurePa || 101325,
        gamma: 1.4,
        xi: 1.033,
        windSpeedKmh: payload.windSpeedKmh || 19.44,
        windDirectionDeg: payload.windDirectionDeg || 315,
        sourcePosition: payload.sourcePosition || { x: 22, y: 28 },
        assetPositions: (payload.assets || INITIAL_FACILITY_ASSETS).map((a) => ({
          assetId: a.id,
          x: a.x,
          y: a.y
        }))
      };

      const res = await fetchWithTimeout(`${PHYSICS_API_BASE}/simulate`, {
        method: "POST",
        body: JSON.stringify(physicsPayload)
      }, 8000);

      if (res.ok) {
        const pyData = await res.json();
        // Convert Python physics response to canonical frontend format
        return {
          isLive: true,
          engine: "FastAPI Python Sedov-Taylor Engine",
          data: {
            simulationId: `sim-py-${Date.now()}`,
            requestId: payload.requestId || "req-direct-py",
            timestamp: new Date().toISOString(),
            executionTimeMs: 110.0,
            overallSeverity: pyData.blast.overpressurePa > 50000 ? "CRITICAL" : "HIGH",
            overallRiskScore: Math.min(100, Math.round(pyData.blast.overpressurePa / 1000 * 0.8)),
            summary: `Direct Python Sedov-Taylor output: Radius ${pyData.blast.radiusMeters}m, Velocity ${pyData.blast.shockSpeedMps}m/s, Overpressure ${(pyData.blast.overpressurePa / 1000).toFixed(1)} kPa.`,
            blastMetrics: {
              peakOverpressureKPa: +(pyData.blast.overpressurePa / 1000).toFixed(1),
              shockSpeedMps: pyData.blast.shockSpeedMps,
              finalRadiusMeters: pyData.blast.radiusMeters,
              blastCenter: pyData.blast.center,
              windAsymmetryFactor: pyData.blast.windAsymmetry
            },
            hazardZones: pyData.hazardZones.map((z, idx) => ({
              zoneId: `ZONE-${z.thresholdKpa}KPA`,
              zoneType: "BLAST",
              thresholdValue: z.thresholdKpa,
              thresholdUnit: "kPa",
              severityLevel: z.thresholdKpa >= 70 ? "CRITICAL" : z.thresholdKpa >= 20 ? "HIGH" : "MODERATE",
              radiusMeters: z.radiusMeters,
              polygonCoordinates: z.polygonCoordinates,
              color: z.thresholdKpa >= 70 ? "#ff2a4b" : z.thresholdKpa >= 20 ? "#ff7b1a" : "#ffd000",
              description: `Shock wave contour exceeding ${z.thresholdKpa} kPa threshold.`
            })),
            affectedAssets: pyData.assetExposures.map((ae) => ({
              assetId: ae.assetId,
              name: (payload.assets || INITIAL_FACILITY_ASSETS).find((a) => a.id === ae.assetId)?.name || ae.assetId,
              distanceMeters: ae.distanceMeters,
              peakThermalRadiationKwM2: +(ae.overpressureKpa * 0.45).toFixed(1),
              peakOverpressureKPa: ae.overpressureKpa,
              damageState: ae.overpressureKpa > 60 ? "TOTAL_LOSS" : ae.overpressureKpa > 20 ? "STRUCTURAL_DAMAGE" : ae.overpressureKpa > 5 ? "MINOR_DAMAGE" : "INTACT",
              failureProbabilityEstimate: ae.overpressureKpa > 60 ? 0.95 : ae.overpressureKpa > 20 ? 0.65 : 0.05,
              damageSummary: `Calculated overpressure: ${ae.overpressureKpa} kPa at ${ae.distanceMeters}m.`
            })),
            dominoPropagation: MOCK_SIMULATION_RESULT.dominoPropagation,
            escapeRoutesAssessment: MOCK_SIMULATION_RESULT.escapeRoutesAssessment,
            recommendedApproachDirection: MOCK_SIMULATION_RESULT.recommendedApproachDirection
          }
        };
      }
    } catch (pyErr) {
      console.warn("Python physics service unreachable:", pyErr.message);
    }

    // 3. Fallback to calibrated canonical simulation result with user parameters applied
    const sourceId = payload.sourceAssetId || "T-101";
    const srcAsset = (payload.assets || INITIAL_FACILITY_ASSETS).find((a) => a.id === sourceId) || INITIAL_FACILITY_ASSETS[0];

    return {
      isLive: false,
      engine: "Calibrated Analytical Demonstrator (Offline Mode)",
      data: {
        ...MOCK_SIMULATION_RESULT,
        timestamp: new Date().toISOString(),
        parameters: {
          ...MOCK_SIMULATION_RESULT.parameters,
          sourceAssetId: sourceId,
          energyJ: payload.energyJ || 2.5e9,
          durationSeconds: payload.durationSeconds || 1.5,
          windSpeedKmh: payload.windSpeedKmh || 19.44,
          windDirectionDeg: payload.windDirectionDeg || 315
        },
        blastMetrics: {
          ...MOCK_SIMULATION_RESULT.blastMetrics,
          blastCenter: { x: srcAsset.x + 1.8, y: srcAsset.y - 1.5 }
        }
      }
    };
  },

  // -------------------------------------------------------------
  // Specific Scenario Simulations
  // -------------------------------------------------------------
  async runBlastSimulation(params) {
    return this.runSimulation({ ...params, scenarioType: "BLAST" });
  },

  async runThermalSimulation(params) {
    return this.runSimulation({ ...params, scenarioType: "THERMAL" });
  },

  async runDispersionSimulation(params) {
    return this.runSimulation({ ...params, scenarioType: "DISPERSION" });
  },

  async runSedovTaylorSimulation(params) {
    return this.runSimulation({ ...params, scenarioType: "SEDOV_TAYLOR" });
  },

  // -------------------------------------------------------------
  // Risk & Domino Analysis (GET /api/risk, GET /api/domino)
  // -------------------------------------------------------------
  async getRiskField() {
    try {
      const res = await fetchWithTimeout(`${BACKEND_API_BASE}/risk`);
      if (res.ok) {
        const data = await res.json();
        return { isLive: true, data };
      }
    } catch {
      // Fallback
    }
    return {
      isLive: false,
      data: {
        overallRiskScore: MOCK_SIMULATION_RESULT.overallRiskScore,
        severity: MOCK_SIMULATION_RESULT.overallSeverity,
        hazardZones: MOCK_SIMULATION_RESULT.hazardZones,
        affectedAssets: MOCK_SIMULATION_RESULT.affectedAssets
      }
    };
  },

  async getDominoAnalysis() {
    try {
      const res = await fetchWithTimeout(`${BACKEND_API_BASE}/domino`);
      if (res.ok) {
        const data = await res.json();
        return { isLive: true, data };
      }
    } catch {
      // Fallback
    }
    return {
      isLive: false,
      data: {
        escalationChains: MOCK_SIMULATION_RESULT.dominoPropagation,
        summary: {
          hazardousSourcesCount: 2,
          escalationChainsCount: MOCK_SIMULATION_RESULT.dominoPropagation.length,
          protectedAssetsCount: 4,
          criticalPathsCount: 1
        }
      }
    };
  },

  // -------------------------------------------------------------
  // Evacuation Planning (GET /api/evacuation)
  // -------------------------------------------------------------
  async getEvacuationPlan() {
    try {
      const res = await fetchWithTimeout(`${BACKEND_API_BASE}/evacuation`);
      if (res.ok) {
        const data = await res.json();
        return { isLive: true, data };
      }
    } catch {
      // Fallback
    }
    return {
      isLive: false,
      data: {
        routes: MOCK_SIMULATION_RESULT.escapeRoutesAssessment,
        recommendedApproach: MOCK_SIMULATION_RESULT.recommendedApproachDirection
      }
    };
  },

  // -------------------------------------------------------------
  // Reports (GET /api/reports)
  // -------------------------------------------------------------
  async getReports() {
    try {
      const res = await fetchWithTimeout(`${BACKEND_API_BASE}/reports`);
      if (res.ok) {
        const data = await res.json();
        return { isLive: true, data };
      }
    } catch {
      // Fallback
    }
    return { isLive: false, data: MOCK_REPORTS };
  }
};
