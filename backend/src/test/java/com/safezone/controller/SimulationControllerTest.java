package com.safezone.controller;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class SimulationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private static final String TWO_TANK_REQUEST_JSON = """
            {
              "requestId": "req-safezone-demo-001",
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
                  },
                  {
                    "assetId": "BLD-CTRL",
                    "name": "Main Control Room",
                    "type": "BUILDING",
                    "position": { "x": 180.0, "y": 110.0, "z": 0.0 },
                    "dimensions": { "length": 30.0, "width": 20.0, "height": 8.0 }
                  },
                  {
                    "assetId": "EXIT-MAIN-GATE",
                    "name": "North Perimeter Main Gate",
                    "type": "EXIT",
                    "position": { "x": 220.0, "y": 140.0, "z": 0.0 }
                  }
                ],
                "escapeRoutes": [
                  {
                    "routeId": "ROUTE-NORTH",
                    "name": "North Gate Evacuation Corridor",
                    "points": [
                      { "x": 180.0, "y": 100.0 },
                      { "x": 180.0, "y": 140.0 },
                      { "x": 220.0, "y": 140.0 }
                    ]
                  },
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
                "blockages": [
                  {
                    "blockageId": "WALL-BLAST-01",
                    "type": "BLAST_WALL",
                    "attenuationFactor": 0.65,
                    "heightMeters": 4.5,
                    "points": [
                      { "x": 68.0, "y": 30.0 },
                      { "x": 68.0, "y": 70.0 }
                    ]
                  }
                ]
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
    @DisplayName("POST /api/simulations with valid two-tank example returns 200 OK and expected demo output")
    void testPostSimulationSuccess() throws Exception {
        mockMvc.perform(post("/api/simulations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(TWO_TANK_REQUEST_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.simulationId", startsWith("sim-")))
                .andExpect(jsonPath("$.requestId").value("req-safezone-demo-001"))
                .andExpect(jsonPath("$.timestamp", notNullValue()))
                .andExpect(jsonPath("$.executionTimeMs", notNullValue()))
                .andExpect(jsonPath("$.overallSeverity").value("CRITICAL"))
                .andExpect(jsonPath("$.overallRiskScore").value(84.5))
                .andExpect(jsonPath("$.summary", notNullValue()))
                .andExpect(jsonPath("$.hazardZones", hasSize(4)))
                .andExpect(jsonPath("$.hazardZones[0].zoneId").value("ZONE-BLAST-70KPA"))
                .andExpect(jsonPath("$.affectedAssets", hasSize(4)))
                .andExpect(jsonPath("$.affectedAssets[0].assetId").value("T-101"))
                .andExpect(jsonPath("$.dominoPropagation", hasSize(1)))
                .andExpect(jsonPath("$.dominoPropagation[0].triggerAssetId").value("T-101"))
                .andExpect(jsonPath("$.dominoPropagation[0].targetAssetId").value("T-102"))
                .andExpect(jsonPath("$.escapeRoutesAssessment", hasSize(2)))
                .andExpect(jsonPath("$.recommendedApproachDirection.compassSector").value("WNW"))
                .andExpect(jsonPath("$.recommendedApproachDirection.safetyRating").value("OPTIMAL"));
    }

    @Test
    @DisplayName("POST /api/simulations with non-existent sourceAssetId returns 400 Bad Request")
    void testPostSimulationInvalidSourceAssetId() throws Exception {
        String invalidRequestJson = """
                {
                  "requestId": "req-invalid-001",
                  "facility": {
                    "facilityId": "FAC-1",
                    "name": "Test Facility",
                    "location": { "latitude": 19.0, "longitude": 72.0, "elevationMeters": 10.0 },
                    "boundary": { "widthMeters": 100.0, "lengthMeters": 100.0, "polygon": [] },
                    "assets": [
                      {
                        "assetId": "T-101",
                        "name": "Tank 1",
                        "type": "TANK",
                        "position": { "x": 0.0, "y": 0.0, "z": 0.0 }
                      }
                    ]
                  },
                  "incident": {
                    "sourceAssetId": "UNKNOWN-TANK-999",
                    "incidentType": "VAPOR_CLOUD_EXPLOSION",
                    "parameters": { "fuelMassKg": 1000.0 }
                  }
                }
                """;

        mockMvc.perform(post("/api/simulations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidRequestJson))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message", notNullValue()))
                .andExpect(jsonPath("$.details", hasSize(1)))
                .andExpect(jsonPath("$.details[0]").value("incident.sourceAssetId 'UNKNOWN-TANK-999' does not exist in facility.assets"));
    }

    @Test
    @DisplayName("POST /api/simulations with missing facility returns 400 Bad Request")
    void testPostSimulationMissingFacility() throws Exception {
        String invalidJson = """
                {
                  "requestId": "req-invalid-002",
                  "incident": {
                    "sourceAssetId": "T-101",
                    "incidentType": "VAPOR_CLOUD_EXPLOSION",
                    "parameters": { "fuelMassKg": 1000.0 }
                  }
                }
                """;

        mockMvc.perform(post("/api/simulations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidJson))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"));
    }

    @Test
    @DisplayName("POST /api/simulations with malformed JSON returns 400 Bad Request")
    void testPostSimulationMalformedJson() throws Exception {
        String badJson = "{ invalidJson: ";

        mockMvc.perform(post("/api/simulations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(badJson))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"));
    }
}
