package com.safezone.dto;

public record SimulationConfigDto(
    boolean thermalCalculationEnabled,
    boolean blastCalculationEnabled,
    boolean dominoAnalysisEnabled,
    Double gridResolutionMeters,
    Double timeHorizonSeconds
) {
    public SimulationConfigDto() {
        this(true, true, true, 2.0, 300.0);
    }
}
