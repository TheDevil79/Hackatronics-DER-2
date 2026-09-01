package com.safezone.dto;

public record LocationDto(
    double latitude,
    double longitude,
    Double elevationMeters
) {}
