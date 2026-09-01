/**
 * Canonical mock dataset for SafeZone AI when backend is offline.
 * Conforms to shared schemas (simulation-request.schema.json & simulation-response.schema.json)
 */

export const INITIAL_FACILITY_ASSETS = [
  {
    id: "T-101",
    type: "tank",
    name: "LPG Storage Sphere 1",
    icon: "◎",
    x: 22,
    y: 28,
    lat: 21.1654,
    lng: 79.0872,
    capacity: 500,
    fuel: "LPG",
    material: "Carbon Steel (ASTM A516)",
    pressure: 17,
    temperature: 30,
    diameter: 12,
    height: 12,
    status: "Normal",
    riskLevel: "Critical"
  },
  {
    id: "T-102",
    type: "tank",
    name: "Propane Storage Sphere 2",
    icon: "◎",
    x: 35,
    y: 29,
    lat: 21.1662,
    lng: 79.0895,
    capacity: 750,
    fuel: "Propane",
    material: "Low Alloy Steel",
    pressure: 12,
    temperature: 27,
    diameter: 14,
    height: 14,
    status: "Normal",
    riskLevel: "High"
  },
  {
    id: "R-01",
    type: "reactor",
    name: "Polymerization Reactor R-1",
    icon: "◉",
    x: 48,
    y: 42,
    lat: 21.1648,
    lng: 79.0915,
    capacity: 120,
    fuel: "Ethylene",
    material: "Stainless Steel 316L",
    pressure: 25,
    temperature: 180,
    status: "Normal",
    riskLevel: "Moderate"
  },
  {
    id: "BLR-01",
    type: "boiler",
    name: "High Pressure Steam Boiler",
    icon: "▣",
    x: 54,
    y: 58,
    lat: 21.1635,
    lng: 79.0928,
    capacity: 300,
    fuel: "Natural Gas",
    material: "Alloy Steel",
    pressure: 40,
    temperature: 350,
    status: "Normal",
    riskLevel: "Moderate"
  },
  {
    id: "BLDG-01",
    type: "building",
    name: "Main Control Room",
    icon: "□",
    x: 68,
    y: 22,
    lat: 21.1678,
    lng: 79.0945,
    capacity: 50,
    occupancy: 18,
    material: "Blast Resistant Concrete",
    status: "Safe",
    riskLevel: "Low"
  },
  {
    id: "ST-01",
    type: "chemical-storage",
    name: "Solvent Chemical Storage",
    icon: "◇",
    x: 65,
    y: 55,
    lat: 21.1625,
    lng: 79.0940,
    capacity: 250,
    material: "Volatile Organic Solvents",
    status: "Normal",
    riskLevel: "High"
  },
  {
    id: "P-01",
    type: "pump",
    name: "Feedstock Transfer Pump House",
    icon: "◉",
    x: 28,
    y: 48,
    lat: 21.1640,
    lng: 79.0880,
    flowRate: 350,
    power: 75,
    status: "Normal",
    riskLevel: "Low"
  },
  {
    id: "FLR-01",
    type: "flare-stack",
    name: "Emergency Flare Stack #1",
    icon: "♢",
    x: 15,
    y: 75,
    lat: 21.1605,
    lng: 79.0850,
    height: 45,
    status: "Normal",
    riskLevel: "Low"
  },
  {
    id: "FWT-01",
    type: "fire-water-tank",
    name: "Primary Fire Water Reservoir",
    icon: "◍",
    x: 82,
    y: 70,
    lat: 21.1610,
    lng: 79.0965,
    capacity: 2500,
    fluid: "Water + AFFF Foam",
    status: "Safe",
    riskLevel: "Low"
  },
  {
    id: "PIPE-01",
    type: "pipeline",
    name: "LPG Interconnection Header",
    icon: "━",
    x: 27,
    y: 38,
    lat: 21.1650,
    lng: 79.0885,
    pressure: 18,
    diameter: 0.35,
    status: "Normal",
    riskLevel: "Moderate"
  },
  {
    id: "SAFE-01",
    type: "shelter",
    name: "Primary Emergency Bunker",
    icon: "⌂",
    x: 78,
    y: 28,
    lat: 21.1670,
    lng: 79.0960,
    occupancy: 60,
    status: "Safe",
    riskLevel: "Low"
  },
  {
    id: "EXIT-01",
    type: "exit",
    name: "North Evacuation Gate A",
    icon: "↗",
    x: 72,
    y: 10,
    lat: 21.1695,
    lng: 79.0950,
    status: "Safe",
    riskLevel: "Low"
  },
  {
    id: "EXIT-02",
    type: "exit",
    name: "West Perimeter Exit B",
    icon: "↗",
    x: 10,
    y: 40,
    lat: 21.1650,
    lng: 79.0835,
    status: "Safe",
    riskLevel: "Low"
  }
];

export const MOCK_SIMULATION_RESULT = {
  simulationId: "sim-20260901-09412-safezone",
  requestId: "req-safezone-demo-001",
  timestamp: new Date().toISOString(),
  executionTimeMs: 142.5,
  overallSeverity: "CRITICAL",
  overallRiskScore: 84.5,
  isMock: true,
  engineType: "Wind-Aware Sedov-Taylor Blast + Thermal Flux Engine",
  summary: "Critical Vapor Cloud Explosion modeled at T-101 (LPG). Severe blast overpressure and thermal flux threaten adjacent Propane sphere T-102 (estimated 72% escalation probability within 165s). West evacuation route is compromised.",
  parameters: {
    sourceAssetId: "T-101",
    scenario: "BLEVE / Vapor Cloud Explosion",
    energyJ: 2.5e9,
    durationSeconds: 1.5,
    airDensityKgM3: 1.225,
    ambientPressurePa: 101325,
    windSpeedKmh: 19.44, // 5.4 m/s
    windDirectionDeg: 315, // NW
  },
  blastMetrics: {
    peakOverpressureKPa: 320.0,
    shockSpeedMps: 645.2,
    finalRadiusMeters: 92.4,
    blastCenter: { x: 23.8, y: 26.5 },
    windAsymmetryFactor: 1.24
  },
  hazardZones: [
    {
      zoneId: "ZONE-BLAST-70KPA",
      zoneType: "BLAST",
      thresholdValue: 70.0,
      thresholdUnit: "kPa",
      severityLevel: "CRITICAL",
      radiusMeters: 42.0,
      color: "#ff2a4b",
      description: "Total structural destruction, heavy equipment displacement, 100% human lethality."
    },
    {
      zoneId: "ZONE-BLAST-20KPA",
      zoneType: "BLAST",
      thresholdValue: 20.0,
      thresholdUnit: "kPa",
      severityLevel: "HIGH",
      radiusMeters: 88.0,
      color: "#ff7b1a",
      description: "Moderate building damage, steel frame distortion, ruptured unreinforced walls."
    },
    {
      zoneId: "ZONE-THERMAL-37_5KW",
      zoneType: "THERMAL",
      thresholdValue: 37.5,
      thresholdUnit: "kW/m²",
      severityLevel: "CRITICAL",
      radiusMeters: 35.0,
      color: "#ff4040",
      description: "100% lethality in 1 min, severe process equipment damage and instantaneous secondary ignition."
    },
    {
      zoneId: "ZONE-THERMAL-12_5KW",
      zoneType: "THERMAL",
      thresholdValue: 12.5,
      thresholdUnit: "kW/m²",
      severityLevel: "HIGH",
      radiusMeters: 68.0,
      color: "#ffaa00",
      description: "1% lethality in 10s, 1st degree burns in 10s, wood & insulation ignition."
    },
    {
      zoneId: "ZONE-BLAST-5KPA",
      zoneType: "BLAST",
      thresholdValue: 5.0,
      thresholdUnit: "kPa",
      severityLevel: "MODERATE",
      radiusMeters: 145.0,
      color: "#ffd000",
      description: "Glass window shatter, minor structural skin deformation, safe for sheltered personnel."
    }
  ],
  affectedAssets: [
    {
      assetId: "T-101",
      name: "LPG Storage Sphere 1",
      distanceMeters: 0.0,
      peakThermalRadiationKwM2: 150.0,
      peakOverpressureKPa: 320.0,
      damageState: "TOTAL_LOSS",
      failureProbabilityEstimate: 1.0,
      estimatedTimeToRuptureSeconds: 0.0,
      damageSummary: "Primary incident epicenter; total tank breach and vapor ignition."
    },
    {
      assetId: "T-102",
      name: "Propane Storage Sphere 2",
      distanceMeters: 55.0,
      peakThermalRadiationKwM2: 24.8,
      peakOverpressureKPa: 48.5,
      damageState: "STRUCTURAL_DAMAGE",
      failureProbabilityEstimate: 0.72,
      estimatedTimeToRuptureSeconds: 165.0,
      damageSummary: "High thermal flux and overpressure on sphere shell; blast wall provides estimated 35% shielding."
    },
    {
      assetId: "PIPE-01",
      name: "LPG Interconnection Header",
      distanceMeters: 28.5,
      peakThermalRadiationKwM2: 42.0,
      peakOverpressureKPa: 78.0,
      damageState: "RUPTURED",
      failureProbabilityEstimate: 0.95,
      estimatedTimeToRuptureSeconds: 12.0,
      damageSummary: "Flange shear and pipeline rupture creating secondary pressurized jet fire."
    },
    {
      assetId: "P-01",
      name: "Feedstock Transfer Pump House",
      distanceMeters: 62.0,
      peakThermalRadiationKwM2: 18.5,
      peakOverpressureKPa: 34.0,
      damageState: "HEAVY_DAMAGE",
      failureProbabilityEstimate: 0.58,
      estimatedTimeToRuptureSeconds: 240.0,
      damageSummary: "Pump seals degraded by thermal load, electrical supply trip."
    },
    {
      assetId: "BLDG-01",
      name: "Main Control Room",
      distanceMeters: 152.3,
      peakThermalRadiationKwM2: 4.2,
      peakOverpressureKPa: 8.9,
      damageState: "MINOR_DAMAGE",
      failureProbabilityEstimate: 0.05,
      estimatedTimeToRuptureSeconds: null,
      damageSummary: "Window glass breakage and minor ceiling tile dislodgement; structural integrity preserved."
    },
    {
      assetId: "SAFE-01",
      name: "Primary Emergency Bunker",
      distanceMeters: 185.0,
      peakThermalRadiationKwM2: 2.1,
      peakOverpressureKPa: 5.2,
      damageState: "INTACT",
      failureProbabilityEstimate: 0.0,
      estimatedTimeToRuptureSeconds: null,
      damageSummary: "Fully protected. Reinforced air filtration and overpressure blast dampers engaged."
    }
  ],
  dominoPropagation: [
    {
      stepOrder: 1,
      triggerAssetId: "T-101",
      targetAssetId: "PIPE-01",
      mechanism: "OVERPRESSURE_SHEAR",
      escalationProbabilityEstimate: 0.95,
      estimatedDelaySeconds: 12.0,
      riskContribution: "Blast wave snaps header flange, releasing 15 kg/s pressurized LPG vapor."
    },
    {
      stepOrder: 2,
      triggerAssetId: "T-101",
      targetAssetId: "T-102",
      mechanism: "THERMAL_RADIATION_RUPTURE",
      escalationProbabilityEstimate: 0.72,
      estimatedDelaySeconds: 165.0,
      riskContribution: "Thermal radiation heats unwetted shell plates of T-102 leading to secondary BLEVE."
    },
    {
      stepOrder: 3,
      triggerAssetId: "PIPE-01",
      targetAssetId: "P-01",
      mechanism: "JET_FIRE_IMPINGEMENT",
      escalationProbabilityEstimate: 0.58,
      estimatedDelaySeconds: 240.0,
      riskContribution: "Ignited gas jet directly impinges on pump house seals."
    }
  ],
  escapeRoutesAssessment: [
    {
      routeId: "ROUTE-NORTH",
      name: "North Corridor to Gate A",
      safetyStatus: "SAFE",
      maxThermalExposureKwM2: 3.5,
      maxOverpressureKPa: 6.2,
      cutoffDistanceAlongRouteMeters: null,
      recommendation: "PRIMARY EVACUATION CORRIDOR. Route is clear of hazardous thermal radiation and blast cones."
    },
    {
      routeId: "ROUTE-WEST",
      name: "West Perimeter Path to Exit B",
      safetyStatus: "UNSAFE",
      maxThermalExposureKwM2: 38.6,
      maxOverpressureKPa: 44.2,
      cutoffDistanceAlongRouteMeters: 15.0,
      recommendation: "DO NOT USE. Route passes directly through the 20 kPa blast zone and downwind flame radiation cone."
    },
    {
      routeId: "ROUTE-EAST-BUNKER",
      name: "East Protected Path to Bunker",
      safetyStatus: "SAFE",
      maxThermalExposureKwM2: 2.1,
      maxOverpressureKPa: 4.8,
      cutoffDistanceAlongRouteMeters: null,
      recommendation: "RECOMMENDED SHELTER-IN-PLACE PATH. Fully shielded by secondary blast deflectors."
    }
  ],
  recommendedApproachDirection: {
    direction: "SOUTHEAST",
    headingDegrees: 135,
    rationale: "Upwind approach angle avoids vapor plume drift (plume drifts South-East at 5.4 m/s) and provides unobstructed hydrants access."
  }
};

export const MOCK_REPORTS = [
  {
    id: "REP-2026-001",
    title: "Facility Comprehensive Risk Assessment",
    type: "Facility Risk Assessment",
    status: "Completed",
    date: "2026-09-01",
    author: "SafeZone AI Automated Engine",
    overallScore: "84.5 / 100 (CRITICAL)",
    summary: "Complete multi-hazard assessment including BLEVE overpressures, structural vulnerability and domino escalation.",
    sections: [
      { title: "Executive Summary", content: "Analysis indicates critical vulnerability at Tank Cluster T-101/T-102. Secondary escalation probability is 72% within 165 seconds." },
      { title: "Asset Vulnerability Matrix", content: "6 assets surveyed; 2 critical loss risks, 1 heavy damage, 2 minor damage, 1 fully preserved." },
      { title: "Engineering Recommendations", content: "Install deluge water-spray system on T-102; reinforce western blast wall by 2.5m." }
    ]
  },
  {
    id: "REP-2026-002",
    title: "Sedov-Taylor Blast Scenario Summary",
    type: "Blast Scenario Summary",
    status: "Completed",
    date: "2026-09-01",
    author: "Physics Simulation Engine v1.0",
    overallScore: "Peak 320.0 kPa",
    summary: "Shock front propagation modeling with atmospheric wind skew. 70 kPa contour extends 42.0m radius.",
    sections: [
      { title: "Blast Physics Model", content: "Wind-corrected Sedov-Taylor blast wave propagation with non-dimensional energy scaling." },
      { title: "Peak Impact Footprint", content: "Overpressure exceeds 70 kPa across 5,540 m²; 20 kPa zone encompasses 24,328 m²." }
    ]
  },
  {
    id: "REP-2026-003",
    title: "Cascading Domino Escalation Report",
    type: "Domino Effect Analysis",
    status: "Completed",
    date: "2026-09-01",
    author: "Domino Analytics Module",
    overallScore: "3 Propagation Steps",
    summary: "Time-to-failure progression and escalation pathway tracking across petrochemical storage and process vessels.",
    sections: [
      { title: "Critical Escalation Path", content: "T-101 (Source) -> PIPE-01 (12s) -> T-102 (165s) -> P-01 (240s)." },
      { title: "Intervention Windows", content: "First responder deluge application must occur before T+90s to arrest T-102 BLEVE transition." }
    ]
  },
  {
    id: "REP-2026-004",
    title: "Tactical Emergency Evacuation Plan",
    type: "Emergency Evacuation Plan",
    status: "Active",
    date: "2026-09-01",
    author: "Emergency Response Coordinator",
    overallScore: "2 Safe Routes / 1 Blocked",
    summary: "Personnel egress directions, safe assembly areas, and exclusion zones based on live wind dispersion.",
    sections: [
      { title: "Egress Protocol", content: "Immediate evacuation of Process Zone via North Corridor Gate A. West Gate B strictly prohibited." },
      { title: "Shelter Staging", content: "Staff in Admin & Control buildings to shelter-in-place at Primary Bunker SAFE-01." }
    ]
  }
];
