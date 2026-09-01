package com.safezone.dto;

public record EscapeRouteAssessmentDto(
    String routeId,
    String name,
    String safetyStatus,
    Double maxThermalExposureKwM2,
    Double maxOverpressureKPa,
    Double cutoffDistanceAlongRouteMeters,
    String recommendation
) {}
