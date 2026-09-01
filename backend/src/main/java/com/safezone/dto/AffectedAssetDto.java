package com.safezone.dto;

/**
 * Impact evaluation on individual plant assets.
 * failureProbabilityEstimate and estimatedTimeToRuptureSeconds are model-derived theoretical estimates.
 */
public record AffectedAssetDto(
    String assetId,
    String name,
    double distanceMeters,
    double peakThermalRadiationKwM2,
    double peakOverpressureKPa,
    String damageState,
    double failureProbabilityEstimate,
    Double estimatedTimeToRuptureSeconds,
    String damageSummary
) {}
