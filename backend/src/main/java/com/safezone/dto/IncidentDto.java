package com.safezone.dto;

public record IncidentDto(
    String sourceAssetId,
    IncidentType incidentType,
    IncidentParametersDto parameters
) {}
