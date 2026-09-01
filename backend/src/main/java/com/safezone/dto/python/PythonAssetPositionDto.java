package com.safezone.dto.python;

public record PythonAssetPositionDto(
    String assetId,
    double x,
    double y,
    Double z
) {}
