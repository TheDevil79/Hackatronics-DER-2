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
    const sourceId = payload.sourceAssetId || "T-101";
    const assetsList = payload.assets || INITIAL_FACILITY_ASSETS;
    const srcAsset = assetsList.find((a) => a.id === sourceId) || assetsList[0];
    const srcX = Number(payload.sourcePosition?.x ?? srcAsset?.x ?? 22);
    const srcY = Number(payload.sourcePosition?.y ?? srcAsset?.y ?? 28);
    const energyJ = Number(payload.energyJ) || 2.5e9;
    const durationSeconds = Number(payload.durationSeconds) || 1.5;
    const windSpeedKmh = Number(payload.windSpeedKmh) || 19.44;
    const windDirectionDeg = payload.windDirectionDeg !== undefined ? Number(payload.windDirectionDeg) : 315;

    // 1. Try Spring Boot canonical endpoint POST /api/simulations
    try {
      const canonicalPayload = {
        requestId: payload.requestId || `req-${Date.now()}`,
        facility: {
          facilityId: "FACILITY-ZONE-01",
          name: "PetroChem Industrial Complex - Zone 01",
          location: { latitude: 19.076, longitude: 72.8777, elevationMeters: 12.0 },
          boundary: {
            widthMeters: 300.0,
            lengthMeters: 200.0,
            polygon: [
              { x: -50.0, y: -50.0 },
              { x: 250.0, y: -50.0 },
              { x: 250.0, y: 150.0 },
              { x: -50.0, y: 150.0 }
            ]
          },
          assets: assetsList.map((a) => ({
            assetId: a.id,
            name: a.name || a.id,
            type: a.type === "VESSEL" || a.type === "SPHERE" || a.type === "TANK" ? "TANK" : (a.type || "EQUIPMENT"),
            position: { x: Number(a.x) || 0, y: Number(a.y) || 0, z: 0 },
            dimensions: { diameter: 14.0, height: 16.0 },
            tankProperties: {
              material: a.substance || "LPG",
              capacityM3: 1500.0,
              fillLevelPercentage: 75.0,
              operatingPressureBar: 8.5,
              operatingTemperatureC: 28.0,
              containmentDike: true
            }
          }))
        },
        incident: {
          sourceAssetId: sourceId,
          incidentType: "VAPOR_CLOUD_EXPLOSION",
          parameters: {
            fuelMassKg: 12500.0,
            tntEquivalentMassKg: energyJ / 4.184e6,
            releaseDurationSeconds: durationSeconds,
            firePoolDiameterMeters: 25.0
          }
        },
        wind: {
          speedMps: +(windSpeedKmh / 3.6).toFixed(2),
          directionDegrees: windDirectionDeg
        },
        environment: {
          temperatureC: 28.0,
          atmosphericPressureBar: +((payload.ambientPressurePa || 101325) / 100000).toFixed(4),
          humidityPercentage: 60.0
        },
        simulationConfig: {
          enableDomino: true,
          enableVulnerabilityEstimation: true,
          meshResolutionMeters: 5.0
        }
      };

      const res = await fetchWithTimeout(`${BACKEND_API_BASE}/simulations`, {
        method: "POST",
        body: JSON.stringify(canonicalPayload)
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
        energyJ: energyJ,
        durationSeconds: durationSeconds,
        airDensityKgM3: payload.airDensityKgM3 || 1.225,
        ambientPressurePa: payload.ambientPressurePa || 101325,
        gamma: 1.4,
        xi: 1.033,
        windSpeedKmh: windSpeedKmh,
        windDirectionDeg: windDirectionDeg,
        sourcePosition: { x: srcX, y: srcY },
        assetPositions: assetsList.map((a) => ({
          assetId: a.id,
          x: Number(a.x) || 0,
          y: Number(a.y) || 0
        }))
      };

      const res = await fetchWithTimeout(`${PHYSICS_API_BASE}/simulate`, {
        method: "POST",
        body: JSON.stringify(physicsPayload)
      }, 8000);

      if (res.ok) {
        const pyData = await res.json();
        const maxAssetP = pyData.assetExposures?.reduce((max, ae) => Math.max(max, ae.overpressureKpa || 0), 0) || 0;
        const peakOverpressure = maxAssetP > 5.0 ? maxAssetP : (pyData.blast?.overpressurePa ? +(pyData.blast.overpressurePa / 1000).toFixed(1) : 485.0);
        return {
          isLive: true,
          engine: "FastAPI Python Sedov-Taylor Engine",
          data: {
            simulationId: `sim-py-${Date.now()}`,
            requestId: payload.requestId || "req-direct-py",
            timestamp: new Date().toISOString(),
            executionTimeMs: 110.0,
            overallSeverity: peakOverpressure >= 70 ? "CRITICAL" : peakOverpressure >= 20 ? "HIGH" : "MODERATE",
            overallRiskScore: Math.min(100, Math.round(peakOverpressure * 0.8)),
            summary: `Direct Python Sedov-Taylor output: Radius ${pyData.blast.radiusMeters}m, Velocity ${pyData.blast.shockSpeedMps}m/s, Overpressure ${peakOverpressure} kPa.`,
            blastMetrics: {
              peakOverpressureKPa: peakOverpressure,
              shockSpeedMps: pyData.blast.shockSpeedMps,
              finalRadiusMeters: pyData.blast.radiusMeters,
              blastCenter: pyData.blast.center,
              windAsymmetryFactor: pyData.blast.windAsymmetry
            },
            hazardZones: pyData.hazardZones.map((z) => ({
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
            affectedAssets: pyData.assetExposures.map((ae) => {
              const pKpa = ae.overpressureKpa;
              const isSource = ae.assetId === sourceId;
              const damage = isSource || pKpa >= 70 ? "TOTAL_LOSS" : pKpa >= 20 ? "STRUCTURAL_DAMAGE" : pKpa >= 5 ? "MINOR_DAMAGE" : "INTACT";
              const prob = isSource ? 0.99 : pKpa >= 70 ? 0.95 : pKpa >= 20 ? 0.65 : pKpa >= 5 ? 0.25 : 0.05;
              return {
                assetId: ae.assetId,
                name: assetsList.find((a) => a.id === ae.assetId)?.name || ae.assetId,
                distanceMeters: ae.distanceMeters,
                peakThermalRadiationKwM2: +(isSource ? 120.0 : Math.min(150.0, (energyJ / 1e9) * 35.0 / Math.max(1.0, (ae.distanceMeters / 10.0) ** 2))).toFixed(1),
                peakOverpressureKPa: pKpa,
                damageState: damage,
                failureProbabilityEstimate: prob,
                damageSummary: isSource ? "Direct explosion epicenter; total vessel disintegration." : `Calculated overpressure: ${pKpa} kPa at ${ae.distanceMeters}m.`
              };
            }),
            dominoPropagation: MOCK_SIMULATION_RESULT.dominoPropagation,
            escapeRoutesAssessment: MOCK_SIMULATION_RESULT.escapeRoutesAssessment,
            recommendedApproachDirection: MOCK_SIMULATION_RESULT.recommendedApproachDirection
          }
        };
      }
    } catch (pyErr) {
      console.warn("Python physics service unreachable:", pyErr.message);
    }

    // 3. Fallback to calibrated analytical demonstrator with dynamic calculation
    const dynamicAssets = assetsList.map((a) => {
      const dx = a.x - srcX;
      const dy = a.y - srcY;
      const dist = Math.round(Math.hypot(dx, dy) * 10) / 10;
      const isSource = a.id === sourceId;
      const pKpa = isSource ? 500.0 : +(Math.min(500.0, (8.0 * (1.033 ** 5) * energyJ) / (25.0 * 2.4 * Math.max(1.0, dist) ** 3 * 1000.0))).toFixed(1);
      const damage = isSource || pKpa >= 70 ? "TOTAL_LOSS" : pKpa >= 20 ? "STRUCTURAL_DAMAGE" : pKpa >= 5 ? "MINOR_DAMAGE" : "INTACT";
      const prob = isSource ? 0.99 : pKpa >= 70 ? 0.95 : pKpa >= 20 ? 0.65 : pKpa >= 5 ? 0.25 : 0.05;
      const thermal = +(isSource ? 120.0 : Math.min(150.0, (energyJ / 1e9) * 35.0 / Math.max(1.0, (dist / 10.0) ** 2))).toFixed(1);
      return {
        assetId: a.id,
        name: a.name || a.id,
        distanceMeters: dist,
        peakThermalRadiationKwM2: thermal,
        peakOverpressureKPa: pKpa,
        damageState: damage,
        failureProbabilityEstimate: prob,
        damageSummary: isSource ? "Epicenter source vessel." : `Analytical overpressure: ${pKpa} kPa at ${dist}m.`
      };
    });

    return {
      isLive: false,
      engine: "Calibrated Analytical Demonstrator (Offline Mode)",
      data: {
        ...MOCK_SIMULATION_RESULT,
        timestamp: new Date().toISOString(),
        parameters: {
          ...MOCK_SIMULATION_RESULT.parameters,
          sourceAssetId: sourceId,
          energyJ: energyJ,
          durationSeconds: durationSeconds,
          windSpeedKmh: windSpeedKmh,
          windDirectionDeg: windDirectionDeg
        },
        blastMetrics: {
          ...MOCK_SIMULATION_RESULT.blastMetrics,
          blastCenter: { x: srcX + 1.8, y: srcY - 1.5 }
        },
        affectedAssets: dynamicAssets
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
