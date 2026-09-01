package com.safezone.dto;

public record ApproachDirectionDto(
    double bearingDegrees,
    String compassSector,
    String safetyRating,
    Double upwindOffsetDegrees,
    String rationale
) {}
