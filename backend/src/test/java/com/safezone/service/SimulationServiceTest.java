package com.safezone.service;

import com.safezone.dto.ApproachDirectionDto;
import com.safezone.dto.AssetDimensionsDto;
import com.safezone.dto.AssetDto;
import com.safezone.dto.AssetType;
import com.safezone.dto.FacilityBoundaryDto;
import com.safezone.dto.FacilityDto;
import com.safezone.dto.IncidentDto;
import com.safezone.dto.IncidentParametersDto;
import com.safezone.dto.IncidentType;
import com.safezone.dto.LocationDto;
import com.safezone.dto.Point2D;
import com.safezone.dto.Position3DDto;
import com.safezone.dto.SimulationConfigDto;
import com.safezone.dto.SimulationRequestDto;
import com.safezone.dto.SimulationResponseDto;
import com.safezone.dto.TankPropertiesDto;
import com.safezone.dto.WindDto;
import com.safezone.exception.InvalidSimulationRequestException;
import com.safezone.exception.SimulationNotFoundException;
import com.safezone.repository.SimulationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SimulationServiceTest {

    @Mock
    private SimulationEngine simulationEngine;

    @Mock
    private SimulationRepository simulationRepository;

    private SimulationService simulationService;

    @BeforeEach
    void setUp() {
        simulationService = new SimulationService(simulationEngine, simulationRepository);
    }

    private SimulationRequestDto createValidRequestDto(String requestId, String sourceAssetId) {
        LocationDto location = new LocationDto(19.0760, 72.8777, 12.0);
        FacilityBoundaryDto boundary = new FacilityBoundaryDto(300.0, 200.0, List.of(
                new Point2D(-50.0, -50.0),
                new Point2D(250.0, -50.0),
                new Point2D(250.0, 150.0),
                new Point2D(-50.0, 150.0)
        ));

        AssetDto tank1 = new AssetDto(
                "T-101",
                "LPG Storage Sphere 1",
                AssetType.TANK,
                new Position3DDto(40.0, 50.0, 0.0),
                new AssetDimensionsDto(null, null, 16.0, 14.0),
                new TankPropertiesDto("LPG", 1500.0, 75.0, 8.5, 28.0, true)
        );

        AssetDto tank2 = new AssetDto(
                "T-102",
                "Propane Storage Sphere 2",
                AssetType.TANK,
                new Position3DDto(95.0, 50.0, 0.0),
                new AssetDimensionsDto(null, null, 16.0, 14.0),
                new TankPropertiesDto("PROPANE", 1500.0, 60.0, 9.2, 28.0, true)
        );

        FacilityDto facility = new FacilityDto(
                "FAC-PETRO-09",
                "Apex Petrochemical Storage Yard",
                location,
                boundary,
                List.of(tank1, tank2),
                List.of(),
                List.of()
        );

        IncidentDto incident = new IncidentDto(
                sourceAssetId,
                IncidentType.VAPOR_CLOUD_EXPLOSION,
                new IncidentParametersDto(4500.0, 675.0, 22.0, 45.0, null)
        );

        WindDto wind = new WindDto(6.5, 112.5, "ESE", "METRIC");

        return new SimulationRequestDto(
                requestId,
                facility,
                incident,
                wind,
                null,
                new SimulationConfigDto()
        );
    }

    @Test
    @DisplayName("runSimulation validates, executes via engine, stores in repository, and returns response")
    void testRunSimulationSuccess() {
        SimulationRequestDto request = createValidRequestDto("req-custom-001", "T-101");

        SimulationResponseDto expectedResponse = new SimulationResponseDto(
                "sim-100",
                "req-custom-001",
                "2026-09-01T12:00:00Z",
                120.0,
                "CRITICAL",
                85.0,
                "Summary",
                List.of(),
                List.of(),
                List.of(),
                List.of(),
                new ApproachDirectionDto(292.5, "WNW", "OPTIMAL", 180.0, "Upwind approach")
        );

        when(simulationEngine.simulate(any(SimulationRequestDto.class))).thenReturn(expectedResponse);
        when(simulationRepository.save(any(SimulationResponseDto.class))).thenReturn(expectedResponse);

        SimulationResponseDto actualResponse = simulationService.runSimulation(request);

        assertNotNull(actualResponse);
        assertEquals("sim-100", actualResponse.simulationId());
        assertEquals("req-custom-001", actualResponse.requestId());

        ArgumentCaptor<SimulationRequestDto> captor = ArgumentCaptor.forClass(SimulationRequestDto.class);
        verify(simulationEngine).simulate(captor.capture());
        assertEquals("req-custom-001", captor.getValue().requestId());

        verify(simulationRepository).save(expectedResponse);
    }

    @Test
    @DisplayName("runSimulation generates safe requestId when missing or blank")
    void testRunSimulationGeneratesRequestIdWhenMissing() {
        SimulationRequestDto request = createValidRequestDto(null, "T-101");

        SimulationResponseDto mockResponse = new SimulationResponseDto(
                "sim-101",
                "generated-id",
                "2026-09-01T12:00:00Z",
                120.0,
                "HIGH",
                70.0,
                "Summary",
                List.of(),
                List.of(),
                List.of(),
                List.of(),
                null
        );

        when(simulationEngine.simulate(any(SimulationRequestDto.class))).thenReturn(mockResponse);
        when(simulationRepository.save(any(SimulationResponseDto.class))).thenReturn(mockResponse);

        simulationService.runSimulation(request);

        ArgumentCaptor<SimulationRequestDto> captor = ArgumentCaptor.forClass(SimulationRequestDto.class);
        verify(simulationEngine).simulate(captor.capture());
        assertNotNull(captor.getValue().requestId());
        assertTrue(captor.getValue().requestId().startsWith("req-"));

        verify(simulationRepository).save(mockResponse);
    }

    @Test
    @DisplayName("runSimulation throws exception when request payload is null")
    void testNullRequestThrowsException() {
        InvalidSimulationRequestException ex = assertThrows(
                InvalidSimulationRequestException.class,
                () -> simulationService.runSimulation(null)
        );
        assertTrue(ex.getMessage().contains("must not be null"));
    }

    @Test
    @DisplayName("runSimulation throws exception when facility is missing")
    void testMissingFacilityThrowsException() {
        SimulationRequestDto request = new SimulationRequestDto(
                "req-1",
                null,
                new IncidentDto("T-101", IncidentType.VAPOR_CLOUD_EXPLOSION, new IncidentParametersDto(100.0, 10.0, 5.0, 10.0, null)),
                null,
                null,
                null
        );

        InvalidSimulationRequestException ex = assertThrows(
                InvalidSimulationRequestException.class,
                () -> simulationService.runSimulation(request)
        );
        assertTrue(ex.getMessage().contains("facility must not be null"));
    }

    @Test
    @DisplayName("runSimulation throws exception when incident is missing")
    void testMissingIncidentThrowsException() {
        LocationDto location = new LocationDto(19.0760, 72.8777, 12.0);
        FacilityBoundaryDto boundary = new FacilityBoundaryDto(300.0, 200.0, List.of(new Point2D(0, 0)));
        FacilityDto facility = new FacilityDto("F1", "Facility 1", location, boundary, List.of(), List.of(), List.of());

        SimulationRequestDto request = new SimulationRequestDto(
                "req-1",
                facility,
                null,
                null,
                null,
                null
        );

        InvalidSimulationRequestException ex = assertThrows(
                InvalidSimulationRequestException.class,
                () -> simulationService.runSimulation(request)
        );
        assertTrue(ex.getMessage().contains("incident must not be null"));
    }

    @Test
    @DisplayName("runSimulation throws exception when sourceAssetId does not exist in facility assets")
    void testSourceAssetIdNotInFacilityThrowsException() {
        SimulationRequestDto request = createValidRequestDto("req-002", "NON-EXISTENT-TANK");

        InvalidSimulationRequestException ex = assertThrows(
                InvalidSimulationRequestException.class,
                () -> simulationService.runSimulation(request)
        );
        assertTrue(ex.getMessage().contains("NON-EXISTENT-TANK"));
    }

    @Test
    @DisplayName("getSimulation returns simulation response when found in repository")
    void testGetSimulationFound() {
        SimulationResponseDto expectedResponse = new SimulationResponseDto(
                "sim-200",
                "req-200",
                "2026-09-01T12:00:00Z",
                140.0,
                "HIGH",
                65.0,
                "Summary",
                List.of(),
                List.of(),
                List.of(),
                List.of(),
                null
        );

        when(simulationRepository.findBySimulationId("sim-200")).thenReturn(Optional.of(expectedResponse));

        SimulationResponseDto actualResponse = simulationService.getSimulation("sim-200");
        assertNotNull(actualResponse);
        assertEquals("sim-200", actualResponse.simulationId());
    }

    @Test
    @DisplayName("getSimulation throws SimulationNotFoundException when ID is not found or blank")
    void testGetSimulationNotFound() {
        when(simulationRepository.findBySimulationId("unknown-id")).thenReturn(Optional.empty());

        assertThrows(SimulationNotFoundException.class, () -> simulationService.getSimulation("unknown-id"));
        assertThrows(SimulationNotFoundException.class, () -> simulationService.getSimulation(null));
        assertThrows(SimulationNotFoundException.class, () -> simulationService.getSimulation("   "));
    }

    @Test
    @DisplayName("getAllSimulations returns all simulation responses from repository")
    void testGetAllSimulationsReturnsList() {
        SimulationResponseDto sim1 = new SimulationResponseDto("sim-1", "req-1", "2026-09-01T12:00:00Z", 100.0, "LOW", 10.0, "Summary 1", List.of(), List.of(), List.of(), List.of(), null);
        SimulationResponseDto sim2 = new SimulationResponseDto("sim-2", "req-2", "2026-09-01T12:00:00Z", 110.0, "HIGH", 70.0, "Summary 2", List.of(), List.of(), List.of(), List.of(), null);

        when(simulationRepository.findAll()).thenReturn(List.of(sim1, sim2));

        List<SimulationResponseDto> results = simulationService.getAllSimulations();
        assertNotNull(results);
        assertEquals(2, results.size());
        assertEquals("sim-1", results.get(0).simulationId());
        assertEquals("sim-2", results.get(1).simulationId());
        verify(simulationRepository).findAll();
    }
}
