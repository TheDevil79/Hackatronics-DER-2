package com.safezone.dto;

public record EnvironmentDto(
    Double ambientTemperatureC,
    Double relativeHumidityPercentage,
    Double atmosphericPressureKPa,
    String stabilityClass,
    Double solarRadiationWm2
) {}
