package com.safezone.service;

import com.safezone.dto.SimulationRequestDto;
import com.safezone.dto.SimulationResponseDto;

/**
 * Interface contract for industrial hazard simulation engines.
 * Implementations execute thermal radiation, blast overpressure, domino propagation,
 * and evacuation route evaluations based on facility layout and initiating incident parameters.
 */
public interface SimulationEngine {

    /**
     * Executes a hazard and domino-effect simulation.
     *
     * @param request the validated simulation request payload
     * @return canonical simulation response output
     */
    SimulationResponseDto simulate(SimulationRequestDto request);
}
