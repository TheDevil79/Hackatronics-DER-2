package com.safezone.dto.python;

public record PythonAssetExposureDto(
    String assetId,
    double distanceMeters,
    double overpressureKpa,
    double windFactor
) {}
