package com.safezone.dto;

import java.util.List;

/**
 * Canonical simulation output payload.
 * overallSeverity: LOW, MODERATE, HIGH, CRITICAL.
 */
public record SimulationResponseDto(
    String simulationId,
    String requestId,
    String timestamp,
    Double executionTimeMs,
    String overallSeverity,
    double overallRiskScore,
    String summary,
    List<HazardZoneDto> hazardZones,
    List<AffectedAssetDto> affectedAssets,
    List<DominoStepDto> dominoPropagation,
    List<EscapeRouteAssessmentDto> escapeRoutesAssessment,
    ApproachDirectionDto recommendedApproachDirection
) {}
