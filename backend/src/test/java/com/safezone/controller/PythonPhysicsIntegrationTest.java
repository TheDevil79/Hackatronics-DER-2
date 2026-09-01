package com.safezone.controller;

import com.jayway.jsonpath.JsonPath;
import com.safezone.repository.SimulationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "simulation.engine=python-sedov",
        "simulation.python.fallback-to-java=true"
})
class PythonPhysicsIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private SimulationRepository simulationRepository;

    @BeforeEach
    void setUp() {
        simulationRepository.clear();
    }

    private static final String TWO_TANK_REQUEST_JSON = """
            {
              "requestId": "req-python-integration-001",
              "facility": {
                "facilityId": "FAC-PETRO-09",
                "name": "Apex Petrochemical Storage Yard",
                "location": {
                  "latitude": 19.0760,
                  "longitude": 72.8777,
                  "elevationMeters": 12.0
                },
                "boundary": {
                  "widthMeters": 300.0,
                  "lengthMeters": 200.0,
                  "polygon": [
                    { "x": -50.0, "y": -50.0 },
                    { "x": 250.0, "y": -50.0 },
                    { "x": 250.0, "y": 150.0 },
                    { "x": -50.0, "y": 150.0 }
                  ]
                },
                "assets": [
                  {
                    "assetId": "T-101",
                    "name": "LPG Storage Sphere 1",
                    "type": "TANK",
                    "position": { "x": 40.0, "y": 50.0, "z": 0.0 },
                    "dimensions": { "diameter": 14.0, "height": 16.0 },
                    "tankProperties": {
                      "material": "LPG",
                      "capacityM3": 1500.0,
                      "fillLevelPercentage": 75.0,
                      "operatingPressureBar": 8.5,
                      "operatingTemperatureC": 28.0,
                      "containmentDike": true
                    }
                  },
                  {
                    "assetId": "T-102",
                    "name": "Propane Storage Sphere 2",
                    "type": "TANK",
                    "position": { "x": 95.0, "y": 50.0, "z": 0.0 },
                    "dimensions": { "diameter": 14.0, "height": 16.0 },
                    "tankProperties": {
                      "material": "PROPANE",
                      "capacityM3": 1500.0,
                      "fillLevelPercentage": 60.0,
                      "operatingPressureBar": 9.2,
                      "operatingTemperatureC": 28.0,
                      "containmentDike": true
                    }
                  }
                ],
                "escapeRoutes": [
                  {
                    "routeId": "ROUTE-WEST",
                    "name": "West Perimeter Evacuation Path",
                    "points": [
                      { "x": 50.0, "y": 20.0 },
                      { "x": 10.0, "y": 20.0 },
                      { "x": -40.0, "y": 20.0 }
                    ]
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
            """;

    @Test
    @DisplayName("POST /api/simulations with simulation.engine=python-sedov executes and persists response")
    void testPythonSedovEndToEndSimulation() throws Exception {
        MvcResult postResult = mockMvc.perform(post("/api/simulations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(TWO_TANK_REQUEST_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.simulationId", notNullValue()))
                .andExpect(jsonPath("$.requestId").value("req-python-integration-001"))
                .andExpect(jsonPath("$.overallSeverity").value("CRITICAL"))
                .andExpect(jsonPath("$.summary", notNullValue()))
                .andExpect(jsonPath("$.hazardZones", hasSize(3)))
                .andExpect(jsonPath("$.hazardZones[0].zoneId").value("ZONE-BLAST-70KPA"))
                .andExpect(jsonPath("$.hazardZones[0].thresholdValue").value(70.0))
                .andExpect(jsonPath("$.affectedAssets", hasSize(2)))
                .andExpect(jsonPath("$.affectedAssets[0].assetId").value("T-101"))
                .andExpect(jsonPath("$.affectedAssets[0].damageState").value("TOTAL_LOSS"))
                .andExpect(jsonPath("$.affectedAssets[1].assetId").value("T-102"))
                .andExpect(jsonPath("$.affectedAssets[1].distanceMeters").value(55.0))
                .andReturn();

        String responseJson = postResult.getResponse().getContentAsString();
        String simulationId = JsonPath.read(responseJson, "$.simulationId");

        // Verify retrieval via GET /api/simulations/{id}
        mockMvc.perform(get("/api/simulations/" + simulationId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.simulationId").value(simulationId))
                .andExpect(jsonPath("$.requestId").value("req-python-integration-001"))
                .andExpect(jsonPath("$.hazardZones", hasSize(3)))
                .andExpect(jsonPath("$.hazardZones[0].zoneId").value("ZONE-BLAST-70KPA"));
    }
}
