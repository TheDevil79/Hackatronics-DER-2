package com.safezone.dto;

/**
 * Atmospheric wind condition vector.
 * directionDegreesFromNorth: Meteorological 'FROM' direction (0=N, 90=E, 112.5=ESE, 180=S, 270=W).
 */
public record WindDto(
    double speedMps,
    double directionDegreesFromNorth,
    String directionCompass,
    String unit
) {
    public WindDto(double speedMps, double directionDegreesFromNorth) {
        this(speedMps, directionDegreesFromNorth, null, "METRIC");
    }
}
