package com.safezone.repository;

import com.safezone.dto.SimulationResponseDto;

import java.util.List;
import java.util.Optional;

/**
 * Repository interface for storing and retrieving simulation run outputs.
 */
public interface SimulationRepository {

    /**
     * Saves a simulation response output.
     *
     * @param response the simulation response DTO to store
     * @return the saved simulation response DTO
     */
    SimulationResponseDto save(SimulationResponseDto response);

    /**
     * Finds a simulation run output by its unique simulation ID.
     *
     * @param simulationId the unique simulation identifier
     * @return an Optional containing the simulation response if found, or empty
     */
    Optional<SimulationResponseDto> findBySimulationId(String simulationId);

    /**
     * Retrieves all stored simulation responses.
     *
     * @return a list of all simulation responses
     */
    List<SimulationResponseDto> findAll();

    /**
     * Clears all stored simulation responses (useful for test resets).
     */
    void clear();
}
