package com.safezone.dto;

public record SimulationRequestDto(
    String requestId,
    FacilityDto facility,
    IncidentDto incident,
    WindDto wind,
    EnvironmentDto environment,
    SimulationConfigDto simulationConfig
) {}
