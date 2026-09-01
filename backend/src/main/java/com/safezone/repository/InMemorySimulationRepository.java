package com.safezone.repository;

import com.safezone.dto.SimulationResponseDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * =========================================================================================
 * TEMPORARY HACKATHON IN-MEMORY STORAGE: InMemorySimulationRepository
 * =========================================================================================
 * <p>
 * Thread-safe in-memory repository implementation utilizing ConcurrentHashMap.
 * Suitable for rapid prototyping and demo testing without requiring external database setup.
 * </p>
 */
@Repository
public class InMemorySimulationRepository implements SimulationRepository {

    private static final Logger log = LoggerFactory.getLogger(InMemorySimulationRepository.class);

    private final Map<String, SimulationResponseDto> storage = new ConcurrentHashMap<>();

    @Override
    public SimulationResponseDto save(SimulationResponseDto response) {
        if (response == null || response.simulationId() == null || response.simulationId().isBlank()) {
            throw new IllegalArgumentException("Cannot save simulation response with null or blank simulationId");
        }
        storage.put(response.simulationId(), response);
        log.debug("Saved simulation result [{}] in memory (total stored: {})", response.simulationId(), storage.size());
        return response;
    }

    @Override
    public Optional<SimulationResponseDto> findBySimulationId(String simulationId) {
        if (simulationId == null || simulationId.isBlank()) {
            return Optional.empty();
        }
        return Optional.ofNullable(storage.get(simulationId));
    }

    @Override
    public List<SimulationResponseDto> findAll() {
        return new ArrayList<>(storage.values());
    }

    @Override
    public void clear() {
        storage.clear();
        log.debug("Cleared in-memory simulation repository");
    }
}
