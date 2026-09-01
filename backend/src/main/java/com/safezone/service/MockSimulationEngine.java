package com.safezone.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.safezone.dto.SimulationRequestDto;
import com.safezone.dto.SimulationResponseDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.time.Instant;
import java.util.UUID;

/**
 * =========================================================================================
 * TEMPORARY FIXTURE IMPLEMENTATION: MockSimulationEngine
 * =========================================================================================
 * <p>
 * This class serves strictly as a temporary mock/demo fixture for development, testing, and
 * frontend-backend API integration before the physics engine integration is completed.
 * </p>
 * <p>
 * <b>IMPORTANT DISCLAIMER:</b>
 * The returned simulation output values (including thermal radiation fluxes, blast wave overpressures,
 * domino escalation probabilities, escape route safety ratings, and overall risk scores) are STATIC
 * DEMO FIXTURES based on the canonical two-tank explosion example scenario. They are NOT physically
 * calculated and must NOT be used for actual plant safety operations.
 * </p>
 * <p>
 * <b>FUTURE REPLACEMENT:</b>
 * This temporary mock engine will later be replaced by Deep's actual simulation engine
 * (implementing point-source/solid flame thermal radiation, Sedov-Taylor blast wave equations,
 * Gaussian/atmospheric wind vectoring, and cascading domino vulnerability graph analysis).
 * </p>
 */
@Component
public class MockSimulationEngine implements SimulationEngine {

    private static final Logger log = LoggerFactory.getLogger(MockSimulationEngine.class);
    private static final String MOCK_RESPONSE_RESOURCE = "mock/two-tank-explosion-response.json";

    private final ObjectMapper objectMapper;
    private final SimulationResponseDto cachedTemplate;

    public MockSimulationEngine(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.cachedTemplate = loadMockTemplate();
    }

    /**
     * Executes the mock simulation by returning the canonical two-tank scenario fixture data,
     * binding the incoming request's ID and generating a new simulation run ID and timestamp.
     *
     * @param request the incoming simulation request
     * @return a realistic mock SimulationResponseDto
     */
    @Override
    public SimulationResponseDto simulate(SimulationRequestDto request) {
        log.info("[TEMPORARY FIXTURE] Running mock simulation for request: {}", 
                request != null ? request.requestId() : "null");

        String effectiveRequestId = (request != null && request.requestId() != null && !request.requestId().isBlank())
                ? request.requestId()
                : (cachedTemplate != null ? cachedTemplate.requestId() : "req-" + UUID.randomUUID());

        String simulationId = "sim-" + Instant.now().toEpochMilli() + "-" + UUID.randomUUID().toString().substring(0, 8);
        String currentTimestamp = Instant.now().toString();

        if (cachedTemplate == null) {
            throw new IllegalStateException("Mock simulation fixture data could not be loaded.");
        }

        return new SimulationResponseDto(
                simulationId,
                effectiveRequestId,
                currentTimestamp,
                cachedTemplate.executionTimeMs() != null ? cachedTemplate.executionTimeMs() : 142.5,
                cachedTemplate.overallSeverity(),
                cachedTemplate.overallRiskScore(),
                cachedTemplate.summary(),
                cachedTemplate.hazardZones(),
                cachedTemplate.affectedAssets(),
                cachedTemplate.dominoPropagation(),
                cachedTemplate.escapeRoutesAssessment(),
                cachedTemplate.recommendedApproachDirection()
        );
    }

    private SimulationResponseDto loadMockTemplate() {
        try {
            ClassPathResource resource = new ClassPathResource(MOCK_RESPONSE_RESOURCE);
            try (InputStream is = resource.getInputStream()) {
                SimulationResponseDto template = objectMapper.readValue(is, SimulationResponseDto.class);
                log.info("[TEMPORARY FIXTURE] Successfully loaded two-tank explosion demo fixture from {}", MOCK_RESPONSE_RESOURCE);
                return template;
            }
        } catch (Exception e) {
            log.error("[TEMPORARY FIXTURE] Failed to load mock fixture from classpath resource {}: {}", 
                    MOCK_RESPONSE_RESOURCE, e.getMessage(), e);
            throw new IllegalStateException("Unable to load mock simulation fixture resource: " + MOCK_RESPONSE_RESOURCE, e);
        }
    }
}
