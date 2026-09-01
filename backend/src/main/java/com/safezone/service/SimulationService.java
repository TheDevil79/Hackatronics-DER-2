package com.safezone.service;

import com.safezone.dto.AssetDto;
import com.safezone.dto.FacilityDto;
import com.safezone.dto.IncidentDto;
import com.safezone.dto.SimulationRequestDto;
import com.safezone.dto.SimulationResponseDto;
import com.safezone.exception.InvalidSimulationRequestException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class SimulationService {

    private static final Logger log = LoggerFactory.getLogger(SimulationService.class);

    private final SimulationEngine simulationEngine;

    public SimulationService(SimulationEngine simulationEngine) {
        this.simulationEngine = simulationEngine;
    }

    /**
     * Validates the simulation request and runs the simulation via the injected engine.
     *
     * @param request the simulation request parameters
     * @return canonical simulation response
     * @throws InvalidSimulationRequestException if validation fails
     */
    public SimulationResponseDto runSimulation(SimulationRequestDto request) {
        SimulationRequestDto validatedRequest = validateAndNormalizeRequest(request);
        log.info("Dispatching validated simulation request [{}] to simulation engine", validatedRequest.requestId());
        return simulationEngine.simulate(validatedRequest);
    }

    private SimulationRequestDto validateAndNormalizeRequest(SimulationRequestDto request) {
        if (request == null) {
            throw new InvalidSimulationRequestException("Simulation request payload must not be null");
        }

        List<String> errors = new ArrayList<>();

        // 1. Validate facility existence and required nested objects
        FacilityDto facility = request.facility();
        if (facility == null) {
            errors.add("facility must not be null");
        } else {
            if (facility.facilityId() == null || facility.facilityId().isBlank()) {
                errors.add("facility.facilityId must not be null or blank");
            }
            if (facility.name() == null || facility.name().isBlank()) {
                errors.add("facility.name must not be null or blank");
            }
            if (facility.boundary() == null) {
                errors.add("facility.boundary must not be null");
            }
            if (facility.location() == null) {
                errors.add("facility.location must not be null");
            }
            if (facility.assets() == null || facility.assets().isEmpty()) {
                errors.add("facility.assets must not be null or empty");
            }
        }

        // 2. Validate incident existence and required nested objects
        IncidentDto incident = request.incident();
        if (incident == null) {
            errors.add("incident must not be null");
        } else {
            if (incident.sourceAssetId() == null || incident.sourceAssetId().isBlank()) {
                errors.add("incident.sourceAssetId must not be null or blank");
            }
            if (incident.incidentType() == null) {
                errors.add("incident.incidentType must not be null");
            }
            if (incident.parameters() == null) {
                errors.add("incident.parameters must not be null");
            }
        }

        // 3. Cross-reference sourceAssetId against facility.assets
        if (facility != null && facility.assets() != null && incident != null && incident.sourceAssetId() != null) {
            String sourceId = incident.sourceAssetId();
            boolean assetExists = facility.assets().stream()
                    .anyMatch(asset -> asset != null && sourceId.equals(asset.assetId()));
            if (!assetExists) {
                errors.add(String.format("incident.sourceAssetId '%s' does not exist in facility.assets", sourceId));
            }
        }

        if (!errors.isEmpty()) {
            log.warn("Simulation request validation failed: {}", errors);
            throw new InvalidSimulationRequestException("Simulation request validation failed: " + String.join("; ", errors), errors);
        }

        // 4. Ensure requestId is present or safely generated
        String requestId = request.requestId();
        if (requestId == null || requestId.isBlank()) {
            requestId = "req-" + UUID.randomUUID();
            log.debug("No requestId provided; generated: {}", requestId);
        }

        return new SimulationRequestDto(
                requestId,
                request.facility(),
                request.incident(),
                request.wind(),
                request.environment(),
                request.simulationConfig()
        );
    }
}
