package com.safezone.dto.python;

import com.safezone.dto.Point2D;

public record PythonBlastMetricsDto(
    double radiusMeters,
    double shockSpeedMps,
    double overpressurePa,
    Point2D center,
    double windAsymmetry
) {}
