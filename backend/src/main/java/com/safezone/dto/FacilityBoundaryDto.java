package com.safezone.dto;

import java.util.List;

public record FacilityBoundaryDto(
    Double widthMeters,
    Double lengthMeters,
    List<Point2D> polygon
) {}
