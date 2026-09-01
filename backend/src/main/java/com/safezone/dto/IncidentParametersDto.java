package com.safezone.dto;

/**
 * Parameters defining the physical magnitude of the initiating incident.
 * E = tntEquivalentMassKg * 4.184e6 Joules for Sedov-Taylor calculations.
 */
public record IncidentParametersDto(
    Double fuelMassKg,
    Double tntEquivalentMassKg,
    Double firePoolDiameterMeters,
    Double releaseDurationSeconds,
    Double orificeDiameterMm
) {}
