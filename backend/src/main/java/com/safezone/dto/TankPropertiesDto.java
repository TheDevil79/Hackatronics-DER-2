package com.safezone.dto;

public record TankPropertiesDto(
    String material,
    Double capacityM3,
    Double fillLevelPercentage,
    Double operatingPressureBar,
    Double operatingTemperatureC,
    Boolean containmentDike
) {}
