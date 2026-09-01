package com.safezone.dto;

import java.util.List;

public record EscapeRouteDto(
    String routeId,
    String name,
    List<Point2D> points
) {}
