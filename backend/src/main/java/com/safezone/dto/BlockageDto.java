package com.safezone.dto;

import java.util.List;

public record BlockageDto(
    String blockageId,
    String type,
    Double attenuationFactor,
    Double heightMeters,
    List<Point2D> points
) {}
