package com.safezone;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.safezone.dto.AffectedAssetDto;
import com.safezone.dto.DominoStepDto;
import com.safezone.dto.EscapeRouteAssessmentDto;
import com.safezone.dto.HazardZoneDto;
import com.safezone.dto.SimulationRequestDto;
import com.safezone.dto.SimulationResponseDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ContractConsistencyAuditTest {

    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
    }

    @Test
    @DisplayName("Audit: Verify shared two-tank-explosion-response.json deserializes into SimulationResponseDto cleanly")
    void testTwoTankResponseFixtureDeserialization() throws Exception {
        ClassPathResource resource = new ClassPathResource("mock/two-tank-explosion-response.json");
        SimulationResponseDto response;
        try (InputStream is = resource.getInputStream()) {
            response = objectMapper.readValue(is, SimulationResponseDto.class);
        }

        assertNotNull(response, "SimulationResponseDto should not be null");
        assertEquals("sim-20260901-09412-safezone", response.simulationId());
        assertEquals("req-safezone-demo-001", response.requestId());
        assertEquals("2026-09-01T11:27:00Z", response.timestamp());
        assertEquals(142.5, response.executionTimeMs());
        assertEquals("CRITICAL", response.overallSeverity());
        assertEquals(84.5, response.overallRiskScore());
        assertTrue(response.summary().contains("Critical Vapor Cloud Explosion"));

        // Hazard Zones Audit
        assertNotNull(response.hazardZones());
        assertEquals(4, response.hazardZones().size());
        HazardZoneDto blast70 = response.hazardZones().stream()
                .filter(z -> "ZONE-BLAST-70KPA".equals(z.zoneId()))
                .findFirst().orElseThrow();
        assertEquals("BLAST", blast70.zoneType());
        assertEquals(70.0, blast70.thresholdValue());
        assertEquals("kPa", blast70.thresholdUnit());
        assertEquals("CRITICAL", blast70.severityLevel());
        assertEquals(42.0, blast70.radiusMeters());
        assertEquals(8, blast70.polygonCoordinates().size());

        // Affected Assets Audit (Field name verification)
        assertNotNull(response.affectedAssets());
        assertEquals(4, response.affectedAssets().size());

        AffectedAssetDto t101 = response.affectedAssets().stream()
                .filter(a -> "T-101".equals(a.assetId()))
                .findFirst().orElseThrow();
        assertEquals("LPG Storage Sphere 1", t101.name());
        assertEquals(0.0, t101.distanceMeters());
        assertEquals(150.0, t101.peakThermalRadiationKwM2());
        assertEquals(320.0, t101.peakOverpressureKPa());
        assertEquals("TOTAL_LOSS", t101.damageState());
        assertEquals(1.0, t101.failureProbabilityEstimate());
        assertEquals(0.0, t101.estimatedTimeToRuptureSeconds());

        AffectedAssetDto bldCtrl = response.affectedAssets().stream()
                .filter(a -> "BLD-CTRL".equals(a.assetId()))
                .findFirst().orElseThrow();
        assertEquals(0.05, bldCtrl.failureProbabilityEstimate());
        assertNull(bldCtrl.estimatedTimeToRuptureSeconds(), "estimatedTimeToRuptureSeconds should be null for BLD-CTRL");

        // Domino Propagation Audit
        assertNotNull(response.dominoPropagation());
        assertEquals(1, response.dominoPropagation().size());
        DominoStepDto step1 = response.dominoPropagation().get(0);
        assertEquals(1, step1.stepOrder());
        assertEquals("T-101", step1.triggerAssetId());
        assertEquals("T-102", step1.targetAssetId());
        assertEquals("THERMAL_RADIATION_RUPTURE", step1.mechanism());
        assertEquals(0.72, step1.escalationProbabilityEstimate());
        assertEquals(165.0, step1.estimatedDelaySeconds());

        // Escape Routes Assessment Audit
        assertNotNull(response.escapeRoutesAssessment());
        assertEquals(2, response.escapeRoutesAssessment().size());
        EscapeRouteAssessmentDto routeWest = response.escapeRoutesAssessment().stream()
                .filter(r -> "ROUTE-WEST".equals(r.routeId()))
                .findFirst().orElseThrow();
        assertEquals("UNSAFE", routeWest.safetyStatus());
        assertEquals(18.6, routeWest.maxThermalExposureKwM2());
        assertEquals(34.2, routeWest.maxOverpressureKPa());
        assertEquals(12.5, routeWest.cutoffDistanceAlongRouteMeters());

        EscapeRouteAssessmentDto routeNorth = response.escapeRoutesAssessment().stream()
                .filter(r -> "ROUTE-NORTH".equals(r.routeId()))
                .findFirst().orElseThrow();
        assertEquals("SAFE", routeNorth.safetyStatus());
        assertNull(routeNorth.cutoffDistanceAlongRouteMeters());

        // Recommended Approach Direction Audit
        assertNotNull(response.recommendedApproachDirection());
        assertEquals(292.5, response.recommendedApproachDirection().bearingDegrees());
        assertEquals("WNW", response.recommendedApproachDirection().compassSector());
        assertEquals("OPTIMAL", response.recommendedApproachDirection().safetyRating());
        assertEquals(180.0, response.recommendedApproachDirection().upwindOffsetDegrees());
    }

    @Test
    @DisplayName("Audit: Verify round-trip serialization maintains schema field names")
    void testSerializationRoundTrip() throws Exception {
        ClassPathResource resource = new ClassPathResource("mock/two-tank-explosion-response.json");
        SimulationResponseDto response;
        try (InputStream is = resource.getInputStream()) {
            response = objectMapper.readValue(is, SimulationResponseDto.class);
        }

        String jsonOut = objectMapper.writeValueAsString(response);
        JsonNode rootNode = objectMapper.readTree(jsonOut);

        // Assert exact property names exist in serialized JSON
        assertTrue(rootNode.has("simulationId"));
        assertTrue(rootNode.has("requestId"));
        assertTrue(rootNode.has("timestamp"));
        assertTrue(rootNode.has("executionTimeMs"));
        assertTrue(rootNode.has("overallSeverity"));
        assertTrue(rootNode.has("overallRiskScore"));
        assertTrue(rootNode.has("summary"));
        assertTrue(rootNode.has("hazardZones"));
        assertTrue(rootNode.has("affectedAssets"));
        assertTrue(rootNode.has("dominoPropagation"));
        assertTrue(rootNode.has("escapeRoutesAssessment"));
        assertTrue(rootNode.has("recommendedApproachDirection"));

        JsonNode firstAsset = rootNode.get("affectedAssets").get(0);
        assertTrue(firstAsset.has("assetId"));
        assertTrue(firstAsset.has("peakThermalRadiationKwM2"));
        assertTrue(firstAsset.has("peakOverpressureKPa"));
        assertTrue(firstAsset.has("failureProbabilityEstimate"));
        assertTrue(firstAsset.has("estimatedTimeToRuptureSeconds"));
        assertFalse(firstAsset.has("failureProbability"), "Must NOT have legacy failureProbability");
        assertFalse(firstAsset.has("timeToRuptureSeconds"), "Must NOT have legacy timeToRuptureSeconds");

        JsonNode firstDomino = rootNode.get("dominoPropagation").get(0);
        assertTrue(firstDomino.has("escalationProbabilityEstimate"));
        assertTrue(firstDomino.has("estimatedDelaySeconds"));
    }
}
