package com.safezone.service;

import com.safezone.client.PythonPhysicsClient;
import com.safezone.dto.AffectedAssetDto;
import com.safezone.dto.AssetDimensionsDto;
import com.safezone.dto.AssetDto;
import com.safezone.dto.AssetType;
import com.safezone.dto.EnvironmentDto;
import com.safezone.dto.FacilityBoundaryDto;
import com.safezone.dto.FacilityDto;
import com.safezone.dto.HazardZoneDto;
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
import com.safezone.dto.python.PythonAssetExposureDto;
import com.safezone.dto.python.PythonBlastMetricsDto;
import com.safezone.dto.python.PythonHazardZoneDto;
import com.safezone.dto.python.PythonMetadataDto;
import com.safezone.dto.python.PythonPhysicsRequestDto;
import com.safezone.dto.python.PythonPhysicsResponseDto;
import com.safezone.exception.PhysicsEngineException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PythonSedovSimulationEngineTest {

    private PythonPhysicsClient mockPythonClient;
    private SedovTaylorSimulationEngine fallbackJavaEngine;
    private DamageAssessmentService damageAssessmentService;
    private DominoAnalysisService dominoAnalysisService;
    private RouteAssessmentService routeAssessmentService;
    private RiskAssessmentService riskAssessmentService;
    private WindEffectModel windEffectModel;

    private PythonSedovSimulationEngine engine;

    @BeforeEach
    void setUp() {
        mockPythonClient = Mockito.mock(PythonPhysicsClient.class);
        damageAssessmentService = new DamageAssessmentService(70.0, 20.0, 5.0, 37.5, 12.5, 4.0);
        dominoAnalysisService = new DominoAnalysisService(0.25);
        routeAssessmentService = new RouteAssessmentService(20.0, 5.0, 12.5, 4.0);
        riskAssessmentService = new RiskAssessmentService(0.45, 0.35, 0.20, 75.0, 50.0, 25.0);
        windEffectModel = new WindEffectModel(true, 0.25, 10.0, 1.50, 0.75);

        fallbackJavaEngine = new SedovTaylorSimulationEngine(
                1.4, 1.033, 36, 70.0, 20.0, 5.0,
                damageAssessmentService, dominoAnalysisService, routeAssessmentService,
                riskAssessmentService, windEffectModel
        );

        engine = new PythonSedovSimulationEngine(
                mockPythonClient, fallbackJavaEngine, damageAssessmentService,
                dominoAnalysisService, routeAssessmentService, riskAssessmentService,
                windEffectModel, 1.4, 1.033
        );
    }

    private SimulationRequestDto buildBenchmarkRequest(double windSpeedMps, double windDirDeg) {
        AssetDto tSrc = new AssetDto(
                "T-SRC", "Initiating Source Tank", AssetType.TANK,
                new Position3DDto(40.0, 50.0, 0.0),
                new AssetDimensionsDto(14.0, 16.0, null),
                new TankPropertiesDto("LPG", 1500.0, 75.0, 8.5, 28.0, true)
        );

        AssetDto tWest = new AssetDto(
                "T-WEST", "Downwind West Tank", AssetType.TANK,
                new Position3DDto(-15.0, 50.0, 0.0),
                new AssetDimensionsDto(14.0, 16.0, null),
                new TankPropertiesDto("PROPANE", 1500.0, 60.0, 9.2, 28.0, true)
        );

        AssetDto tEast = new AssetDto(
                "T-EAST", "Upwind East Tank", AssetType.TANK,
                new Position3DDto(95.0, 50.0, 0.0),
                new AssetDimensionsDto(14.0, 16.0, null),
                new TankPropertiesDto("PROPANE", 1500.0, 60.0, 9.2, 28.0, true)
        );

        FacilityDto facility = new FacilityDto(
                "FAC-TEST", "Benchmark Test Facility",
                new LocationDto(19.0, 72.0, 10.0),
                new FacilityBoundaryDto(300.0, 200.0, List.of(new Point2D(-100.0, -100.0), new Point2D(200.0, -100.0))),
                List.of(tSrc, tWest, tEast),
                List.of(),
                List.of(),
                List.of()
        );

        IncidentDto incident = new IncidentDto(
                "T-SRC", IncidentType.VAPOR_CLOUD_EXPLOSION,
                new IncidentParametersDto(4500.0, 675.0, 22.0, 45.0, null)
        );

        WindDto wind = new WindDto(windSpeedMps, windDirDeg, "E", "METRIC");
        EnvironmentDto env = new EnvironmentDto(25.0, 60.0, 101.325, "D", 500.0);
        SimulationConfigDto cfg = new SimulationConfigDto();

        return new SimulationRequestDto("req-benchmark-001", facility, incident, wind, env, cfg);
    }

    @Test
    @DisplayName("Unit: Verify TNT mass to Joules and Wind m/s to km/h conversion")
    void testRequestConversionParameters() {
        SimulationRequestDto request = buildBenchmarkRequest(3.0, 90.0);

        ArgumentCaptor<PythonPhysicsRequestDto> captor = ArgumentCaptor.forClass(PythonPhysicsRequestDto.class);

        PythonPhysicsResponseDto mockResponse = new PythonPhysicsResponseDto(
                675.0 * 4.184e6, 10.8, 90.0,
                new PythonBlastMetricsDto(50.0, 100.0, 250000.0, new Point2D(35.0, 50.0), 0.3),
                List.of(new PythonHazardZoneDto(70.0, 30.0, List.of(new Point2D(35.0, 60.0)))),
                List.of(
                        new PythonAssetExposureDto("T-WEST", 55.0, 85.0, 1.3),
                        new PythonAssetExposureDto("T-EAST", 55.0, 35.0, 0.7)
                ),
                new PythonMetadataDto("Sedov-Taylor", true, "Educational demonstrator only")
        );

        when(mockPythonClient.simulate(any())).thenReturn(mockResponse);

        engine.simulate(request);

        verify(mockPythonClient).simulate(captor.capture());
        PythonPhysicsRequestDto pyReq = captor.getValue();

        // 675 kg TNT * 4.184e6 J/kg = 2.8242e9 Joules
        assertEquals(675.0 * 4.184e6, pyReq.energyJ(), 1.0);
        // 3.0 m/s * 3.6 = 10.8 km/h
        assertEquals(10.8, pyReq.windSpeedKmh(), 0.01);
        assertEquals(90.0, pyReq.windDirectionDeg(), 0.01);
        assertEquals(40.0, pyReq.sourcePosition().x());
        assertEquals(50.0, pyReq.sourcePosition().y());
    }

    @Test
    @DisplayName("Wind Validation: Downwind asset (T-WEST) receives higher overpressure and failure probability than upwind asset (T-EAST)")
    void testWindValidationEqualDistanceAssets() {
        SimulationRequestDto request = buildBenchmarkRequest(3.0, 90.0);

        PythonPhysicsResponseDto mockResponse = new PythonPhysicsResponseDto(
                675.0 * 4.184e6, 10.8, 90.0,
                new PythonBlastMetricsDto(50.0, 100.0, 250000.0, new Point2D(35.0, 50.0), 0.3),
                List.of(
                        new PythonHazardZoneDto(70.0, 35.0, List.of(new Point2D(35.0, 70.0))),
                        new PythonHazardZoneDto(20.0, 65.0, List.of(new Point2D(35.0, 100.0))),
                        new PythonHazardZoneDto(5.0, 120.0, List.of(new Point2D(35.0, 155.0)))
                ),
                List.of(
                        new PythonAssetExposureDto("T-SRC", 0.0, 500.0, 1.0),
                        new PythonAssetExposureDto("T-WEST", 55.0, 68.0, 1.25),
                        new PythonAssetExposureDto("T-EAST", 55.0, 22.0, 0.75)
                ),
                new PythonMetadataDto("Sedov-Taylor", true, "Educational demonstrator only")
        );

        when(mockPythonClient.simulate(any())).thenReturn(mockResponse);

        SimulationResponseDto response = engine.simulate(request);

        assertNotNull(response);
        assertEquals("CRITICAL", response.overallSeverity());
        assertEquals(3, response.hazardZones().size());

        AffectedAssetDto westAsset = response.affectedAssets().stream()
                .filter(a -> "T-WEST".equals(a.assetId()))
                .findFirst().orElseThrow();

        AffectedAssetDto eastAsset = response.affectedAssets().stream()
                .filter(a -> "T-EAST".equals(a.assetId()))
                .findFirst().orElseThrow();

        // Both are exactly 55m from epicenter
        assertEquals(55.0, westAsset.distanceMeters(), 0.01);
        assertEquals(55.0, eastAsset.distanceMeters(), 0.01);

        // T-WEST is downwind: higher overpressure, higher failure probability
        assertTrue(westAsset.peakOverpressureKPa() > eastAsset.peakOverpressureKPa(),
                "Downwind asset overpressure should exceed upwind asset overpressure");
        assertTrue(westAsset.failureProbabilityEstimate() >= eastAsset.failureProbabilityEstimate(),
                "Downwind failure probability should be >= upwind failure probability");
    }

    @Test
    @DisplayName("Fallback: Falls back to Java Sedov engine when Python service is unavailable and fallback is enabled")
    void testFallbackToJavaWhenPythonUnavailable() {
        SimulationRequestDto request = buildBenchmarkRequest(3.0, 90.0);

        when(mockPythonClient.simulate(any())).thenThrow(new PhysicsEngineException("Connection refused"));
        when(mockPythonClient.isFallbackToJava()).thenReturn(true);

        SimulationResponseDto response = engine.simulate(request);

        assertNotNull(response);
        assertTrue(response.simulationId().startsWith("sim-sedov-"), "Should have used Java fallback engine");
        assertEquals("CRITICAL", response.overallSeverity());
    }

    @Test
    @DisplayName("Fallback: Throws PhysicsEngineException when Python service is unavailable and fallback is disabled")
    void testThrowsExceptionWhenFallbackDisabled() {
        SimulationRequestDto request = buildBenchmarkRequest(3.0, 90.0);

        when(mockPythonClient.simulate(any())).thenThrow(new PhysicsEngineException("Connection refused"));
        when(mockPythonClient.isFallbackToJava()).thenReturn(false);

        assertThrows(PhysicsEngineException.class, () -> engine.simulate(request));
    }
}
