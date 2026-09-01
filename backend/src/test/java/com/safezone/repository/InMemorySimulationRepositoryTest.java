package com.safezone.repository;

import com.safezone.dto.SimulationResponseDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class InMemorySimulationRepositoryTest {

    private InMemorySimulationRepository repository;

    @BeforeEach
    void setUp() {
        repository = new InMemorySimulationRepository();
    }

    private SimulationResponseDto createDummyResponse(String simulationId, String requestId) {
        return new SimulationResponseDto(
                simulationId,
                requestId,
                "2026-09-01T12:00:00Z",
                150.0,
                "CRITICAL",
                80.0,
                "Test Summary",
                List.of(),
                List.of(),
                List.of(),
                List.of(),
                null
        );
    }

    @Test
    @DisplayName("save and findBySimulationId successfully stores and retrieves response")
    void testSaveAndFind() {
        SimulationResponseDto response = createDummyResponse("sim-100", "req-100");

        SimulationResponseDto saved = repository.save(response);
        assertEquals("sim-100", saved.simulationId());

        Optional<SimulationResponseDto> found = repository.findBySimulationId("sim-100");
        assertTrue(found.isPresent());
        assertEquals("sim-100", found.get().simulationId());
        assertEquals("req-100", found.get().requestId());
    }

    @Test
    @DisplayName("findBySimulationId returns empty Optional for non-existent or blank ID")
    void testFindNonExistentReturnsEmpty() {
        Optional<SimulationResponseDto> found = repository.findBySimulationId("non-existent-id");
        assertFalse(found.isPresent());

        Optional<SimulationResponseDto> nullFound = repository.findBySimulationId(null);
        assertFalse(nullFound.isPresent());

        Optional<SimulationResponseDto> blankFound = repository.findBySimulationId("   ");
        assertFalse(blankFound.isPresent());
    }

    @Test
    @DisplayName("multiple simulations can coexist in storage independently")
    void testMultipleSimulationsCoexist() {
        SimulationResponseDto sim1 = createDummyResponse("sim-001", "req-001");
        SimulationResponseDto sim2 = createDummyResponse("sim-002", "req-002");
        SimulationResponseDto sim3 = createDummyResponse("sim-003", "req-003");

        repository.save(sim1);
        repository.save(sim2);
        repository.save(sim3);

        assertEquals(3, repository.findAll().size());
        assertEquals("req-001", repository.findBySimulationId("sim-001").orElseThrow().requestId());
        assertEquals("req-002", repository.findBySimulationId("sim-002").orElseThrow().requestId());
        assertEquals("req-003", repository.findBySimulationId("sim-003").orElseThrow().requestId());
    }

    @Test
    @DisplayName("save throws IllegalArgumentException when response or simulationId is null/blank")
    void testSaveInvalidThrowsException() {
        assertThrows(IllegalArgumentException.class, () -> repository.save(null));

        SimulationResponseDto invalid = createDummyResponse(null, "req-1");
        assertThrows(IllegalArgumentException.class, () -> repository.save(invalid));

        SimulationResponseDto blankId = createDummyResponse("   ", "req-1");
        assertThrows(IllegalArgumentException.class, () -> repository.save(blankId));
    }

    @Test
    @DisplayName("clear removes all entries from repository")
    void testClearEmptiesRepository() {
        repository.save(createDummyResponse("sim-1", "req-1"));
        repository.save(createDummyResponse("sim-2", "req-2"));
        assertEquals(2, repository.findAll().size());

        repository.clear();
        assertEquals(0, repository.findAll().size());
        assertFalse(repository.findBySimulationId("sim-1").isPresent());
    }
}
