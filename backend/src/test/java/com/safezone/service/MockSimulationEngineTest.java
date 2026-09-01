package com.safezone.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.safezone.dto.SimulationRequestDto;
import com.safezone.dto.SimulationResponseDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MockSimulationEngineTest {

    private MockSimulationEngine mockSimulationEngine;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        mockSimulationEngine = new MockSimulationEngine(objectMapper);
    }

    @Test
    @DisplayName("simulate returns canonical two-tank explosion demo response")
    void testSimulateReturnsDemoResponse() {
        SimulationRequestDto request = new SimulationRequestDto(
                "req-test-123",
                null,
                null,
                null,
                null,
                null
        );

        SimulationResponseDto response = mockSimulationEngine.simulate(request);

        assertNotNull(response);
        assertEquals("req-test-123", response.requestId());
        assertNotNull(response.simulationId());
        assertTrue(response.simulationId().startsWith("sim-"));
        assertNotNull(response.timestamp());
        assertEquals("CRITICAL", response.overallSeverity());
        assertEquals(84.5, response.overallRiskScore());
        assertNotNull(response.summary());

        // Hazard zones verification
        assertNotNull(response.hazardZones());
        assertEquals(4, response.hazardZones().size());
        assertTrue(response.hazardZones().stream().anyMatch(z -> "ZONE-BLAST-70KPA".equals(z.zoneId())));
        assertTrue(response.hazardZones().stream().anyMatch(z -> "ZONE-THERMAL-37_5KW".equals(z.zoneId())));

        // Affected assets verification
        assertNotNull(response.affectedAssets());
        assertEquals(4, response.affectedAssets().size());
        assertTrue(response.affectedAssets().stream().anyMatch(a -> "T-101".equals(a.assetId()) && "TOTAL_LOSS".equals(a.damageState())));
        assertTrue(response.affectedAssets().stream().anyMatch(a -> "T-102".equals(a.assetId()) && a.failureProbabilityEstimate() > 0.5));

        // Domino chain verification
        assertNotNull(response.dominoPropagation());
        assertEquals(1, response.dominoPropagation().size());
        assertEquals("T-101", response.dominoPropagation().get(0).triggerAssetId());
        assertEquals("T-102", response.dominoPropagation().get(0).targetAssetId());

        // Escape routes verification
        assertNotNull(response.escapeRoutesAssessment());
        assertEquals(2, response.escapeRoutesAssessment().size());
        assertTrue(response.escapeRoutesAssessment().stream().anyMatch(r -> "ROUTE-WEST".equals(r.routeId()) && "UNSAFE".equals(r.safetyStatus())));
        assertTrue(response.escapeRoutesAssessment().stream().anyMatch(r -> "ROUTE-NORTH".equals(r.routeId()) && "SAFE".equals(r.safetyStatus())));

        // Recommended approach direction
        assertNotNull(response.recommendedApproachDirection());
        assertEquals("WNW", response.recommendedApproachDirection().compassSector());
        assertEquals("OPTIMAL", response.recommendedApproachDirection().safetyRating());
    }

    @Test
    @DisplayName("simulate handles null request by falling back gracefully")
    void testSimulateNullRequestFallback() {
        SimulationResponseDto response = mockSimulationEngine.simulate(null);

        assertNotNull(response);
        assertNotNull(response.requestId());
        assertFalse(response.requestId().isBlank());
        assertEquals("CRITICAL", response.overallSeverity());
    }
}
