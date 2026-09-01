package com.safezone.dto;

public record Position3DDto(
    double x,
    double y,
    double z
) {
    public Position3DDto(double x, double y) {
        this(x, y, 0.0);
    }
}
