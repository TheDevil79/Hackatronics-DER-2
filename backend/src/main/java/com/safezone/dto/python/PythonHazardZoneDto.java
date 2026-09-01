package com.safezone.dto.python;

import com.safezone.dto.Point2D;
import java.util.List;

public record PythonHazardZoneDto(
    double thresholdKpa,
    Double radiusMeters,
    List<Point2D> polygonCoordinates
) {}
