package com.safezone.dto.python;

import java.util.List;

public record PythonPhysicsResponseDto(
    double energyJ,
    double windSpeedKmh,
    double windDirectionDeg,
    PythonBlastMetricsDto blast,
    List<PythonHazardZoneDto> hazardZones,
    List<PythonAssetExposureDto> assetExposures,
    PythonMetadataDto metadata
) {}
