package com.safezone.service;

import com.safezone.dto.AffectedAssetDto;
import com.safezone.dto.AssetDimensionsDto;
import com.safezone.dto.AssetDto;
import com.safezone.dto.AssetType;
import com.safezone.dto.DominoStepDto;
import com.safezone.dto.EnvironmentDto;
import com.safezone.dto.EscapeRouteAssessmentDto;
import com.safezone.dto.EscapeRouteDto;
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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SedovTaylorSimulationEngineTest {

    private SedovTaylorSimulationEngine engine;
    private DamageAssessmentService damageAssessmentService;
    private DominoAnalysisService dominoAnalysisService;
    private RouteAssessmentService routeAssessmentService;
    private RiskAssessmentService riskAssessmentService;
    private WindEffectModel windEffectModel;

    @BeforeEach
    void setUp() {
        damageAssessmentService = new DamageAssessmentService(
                70.0, 20.0, 5.0,
                37.5, 12.5, 4.0
        );
        dominoAnalysisService = new DominoAnalysisService(0.25);
        routeAssessmentService = new RouteAssessmentService(20.0, 5.0, 12.5, 4.0);
        riskAssessmentService = new RiskAssessmentService(0.45, 0.35, 0.20, 75.0, 50.0, 25.0);
        windEffectModel = new WindEffectModel(true, 0.25, 10.0, 1.50, 0.75);

        engine = new SedovTaylorSimulationEngine(
                1.4,    // gamma
                1.033,  // xi
                36,     // polygon points
                70.0,   // critical threshold kPa
                20.0,   // high threshold kPa
                5.0,    // moderate threshold kPa
                damageAssessmentService,
                dominoAnalysisService,
                routeAssessmentService,
                riskAssessmentService,
                windEffectModel
        );
    }

    private SimulationRequestDto createTwoTankRequest(double tntMassKg, double t102X, double tempC, double pressureKPa) {
        return createCustomWindRequest(tntMassKg, t102X, tempC, pressureKPa, 6.5, 112.5);
    }

    private SimulationRequestDto createCustomWindRequest(double tntMassKg, double t102X, double tempC, double pressureKPa, double windSpeedMps, double windDirDeg) {
        LocationDto location = new LocationDto(19.0760, 72.8777, 12.0);
        FacilityBoundaryDto boundary = new FacilityBoundaryDto(300.0, 200.0, List.of(
                new Point2D(-50.0, -50.0),
                new Point2D(250.0, -50.0),
                new Point2D(250.0, 150.0),
                new Point2D(-50.0, 150.0)
        ));

        AssetDto t101 = new AssetDto(
                "T-101",
                "LPG Storage Sphere 1",
                AssetType.TANK,
                new Position3DDto(40.0, 50.0, 0.0),
                new AssetDimensionsDto(null, null, 16.0, 14.0),
                new TankPropertiesDto("LPG", 1500.0, 75.0, 8.5, 28.0, true)
        );

        AssetDto t102 = new AssetDto(
                "T-102",
                "Propane Storage Sphere 2",
                AssetType.TANK,
                new Position3DDto(t102X, 50.0, 0.0),
                new AssetDimensionsDto(null, null, 16.0, 14.0),
                new TankPropertiesDto("PROPANE", 1500.0, 60.0, 9.2, 28.0, true)
        );

        AssetDto bldCtrl = new AssetDto(
                "BLD-CTRL",
                "Control Room",
                AssetType.BUILDING,
                new Position3DDto(180.0, 110.0, 0.0),
                new AssetDimensionsDto(30.0, 20.0, 8.0, null),
                null
        );

        EscapeRouteDto westRoute = new EscapeRouteDto(
                "ROUTE-WEST",
                "West Perimeter Path",
                List.of(new Point2D(50.0, 20.0), new Point2D(10.0, 20.0), new Point2D(-40.0, 20.0))
        );

        EscapeRouteDto northRoute = new EscapeRouteDto(
                "ROUTE-NORTH",
                "North Gate Evacuation Path",
                List.of(new Point2D(220.0, 150.0), new Point2D(250.0, 150.0))
        );

        FacilityDto facility = new FacilityDto(
                "FAC-PETRO-09",
                "Apex Petrochemical Yard",
                location,
                boundary,
                List.of(t101, t102, bldCtrl),
                List.of(westRoute, northRoute),
                List.of()
        );

        IncidentDto incident = new IncidentDto(
                "T-101",
                IncidentType.VAPOR_CLOUD_EXPLOSION,
                new IncidentParametersDto(4500.0, tntMassKg, 22.0, 45.0, null)
        );

        EnvironmentDto environment = new EnvironmentDto(tempC, 65.0, pressureKPa, "D", 650.0);
        WindDto wind = new WindDto(windSpeedMps, windDirDeg, "TEST", "METRIC");

        return new SimulationRequestDto(
                "req-test-sedov-001",
                facility,
                incident,
                wind,
                environment,
                new SimulationConfigDto()
        );
    }

    @Test
    @DisplayName("Experiment A vs B: Increasing TNT mass increases blast hazard radius and exposure")
    void testIncreasingTntMassIncreasesBlastRadius() {
        SimulationRequestDto baselineReq = createTwoTankRequest(675.0, 95.0, 32.0, 101.325);
        SimulationRequestDto higherTntReq = createTwoTankRequest(2000.0, 95.0, 32.0, 101.325);

        SimulationResponseDto baselineRes = engine.simulate(baselineReq);
        SimulationResponseDto higherTntRes = engine.simulate(higherTntReq);

        double baselineR70 = baselineRes.hazardZones().get(0).radiusMeters();
        double higherTntR70 = higherTntRes.hazardZones().get(0).radiusMeters();

        assertTrue(higherTntR70 > baselineR70, "Hazard radius must increase with higher explosion energy");

        AffectedAssetDto baselineT102 = baselineRes.affectedAssets().stream()
                .filter(a -> "T-102".equals(a.assetId())).findFirst().orElseThrow();
        AffectedAssetDto higherT102 = higherTntRes.affectedAssets().stream()
                .filter(a -> "T-102".equals(a.assetId())).findFirst().orElseThrow();

        assertTrue(higherT102.peakOverpressureKPa() > baselineT102.peakOverpressureKPa());
        assertTrue(higherT102.failureProbabilityEstimate() >= baselineT102.failureProbabilityEstimate());
    }

    @Test
    @DisplayName("Experiment C: Moving secondary asset T-102 farther reduces exposure and domino escalation")
    void testMovingSecondaryAssetFartherReducesRisk() {
        SimulationRequestDto closeReq = createTwoTankRequest(675.0, 95.0, 32.0, 101.325);
        SimulationRequestDto farReq = createTwoTankRequest(675.0, 220.0, 32.0, 101.325);

        SimulationResponseDto closeRes = engine.simulate(closeReq);
        SimulationResponseDto farRes = engine.simulate(farReq);

        AffectedAssetDto closeT102 = closeRes.affectedAssets().stream()
                .filter(a -> "T-102".equals(a.assetId())).findFirst().orElseThrow();
        AffectedAssetDto farT102 = farRes.affectedAssets().stream()
                .filter(a -> "T-102".equals(a.assetId())).findFirst().orElseThrow();

        assertTrue(farT102.peakOverpressureKPa() < closeT102.peakOverpressureKPa(), "Overpressure must decrease with distance");
        assertTrue(farT102.failureProbabilityEstimate() < closeT102.failureProbabilityEstimate(), "Failure probability must decrease with distance");

        List<DominoStepDto> closeDomino = closeRes.dominoPropagation();
        List<DominoStepDto> farDomino = farRes.dominoPropagation();

        boolean closeHasT102 = closeDomino.stream().anyMatch(d -> "T-102".equals(d.targetAssetId()));
        boolean farHasT102 = farDomino.stream().anyMatch(d -> "T-102".equals(d.targetAssetId()));

        assertTrue(closeHasT102, "Close tank (55m) should generate a secondary domino step");
        assertFalse(farHasT102, "Far tank (180m) should NOT generate a secondary domino step");
    }

    @Test
    @DisplayName("Experiment D: Ambient temperature and atmospheric pressure alter air density and Sedov expansion")
    void testEnvironmentAltersAirDensityAndSedovRadius() {
        SimulationRequestDto hotLowPressureReq = createTwoTankRequest(675.0, 95.0, 45.0, 95.0);
        SimulationRequestDto coldHighPressureReq = createTwoTankRequest(675.0, 95.0, -10.0, 105.0);

        double rhoHot = engine.calculateAirDensityKgM3(hotLowPressureReq);
        double rhoCold = engine.calculateAirDensityKgM3(coldHighPressureReq);

        assertTrue(rhoCold > rhoHot, "Cold high-pressure air must have higher density than hot low-pressure air");

        double rHot = engine.calculateSedovRadius(2.82e9, rhoHot, 0.05);
        double rCold = engine.calculateSedovRadius(2.82e9, rhoCold, 0.05);

        assertTrue(rHot > rCold, "Shock wave propagates faster/farther in lower-density air (R ~ (E/rho)^0.2)");
    }

    @Test
    @DisplayName("Wind Test 1: Zero wind produces circular contours with directionalFactor = 1.0")
    void testZeroWindProducesCircularContours() {
        double factorNorth = windEffectModel.calculateDirectionalWindFactor(0.0, 0.0, 90.0);
        double factorEast = windEffectModel.calculateDirectionalWindFactor(90.0, 0.0, 90.0);
        double factorSouth = windEffectModel.calculateDirectionalWindFactor(180.0, 0.0, 90.0);
        double factorWest = windEffectModel.calculateDirectionalWindFactor(270.0, 0.0, 90.0);

        assertEquals(1.0, factorNorth, 1e-6);
        assertEquals(1.0, factorEast, 1e-6);
        assertEquals(1.0, factorSouth, 1e-6);
        assertEquals(1.0, factorWest, 1e-6);

        SimulationRequestDto zeroWindReq = createCustomWindRequest(675.0, 95.0, 25.0, 101.325, 0.0, 90.0);
        SimulationResponseDto response = engine.simulate(zeroWindReq);

        HazardZoneDto zone70 = response.hazardZones().get(0);
        double baseRadius = zone70.radiusMeters();
        for (Point2D pt : zone70.polygonCoordinates()) {
            double distFromEpicenter = Math.hypot(pt.x() - 40.0, pt.y() - 50.0);
            assertEquals(baseRadius, distFromEpicenter, 0.1, "Under calm conditions, all vertices must be equidistant");
        }
    }

    @Test
    @DisplayName("Wind Test 2 & 3: Non-zero wind produces asymmetric contours, and increasing wind speed increases elongation")
    void testWindAsymmetryAndSpeedScaling() {
        // Wind originates from East (90°). Downwind is West (270°), Upwind is East (90°).
        double rCalmWest = 100.0 * windEffectModel.calculateDirectionalWindFactor(270.0, 0.0, 90.0);
        double rModWest = 100.0 * windEffectModel.calculateDirectionalWindFactor(270.0, 3.0, 90.0);
        double rStrongWest = 100.0 * windEffectModel.calculateDirectionalWindFactor(270.0, 10.0, 90.0);

        double rModEast = 100.0 * windEffectModel.calculateDirectionalWindFactor(90.0, 3.0, 90.0);
        double rStrongEast = 100.0 * windEffectModel.calculateDirectionalWindFactor(90.0, 10.0, 90.0);

        // Downwind elongation (West)
        assertTrue(rStrongWest > rModWest && rModWest > rCalmWest, "Downwind hazard radius must expand with wind speed");
        // Upwind contraction (East)
        assertTrue(rStrongEast < rModEast && rModEast < rCalmWest, "Upwind hazard radius must contract with wind speed");
    }

    @Test
    @DisplayName("Wind Test 4 & 5: Downwind asset receives greater exposure than equivalent upwind asset; crosswind is intermediate")
    void testDirectionalAssetExposure() {
        // Source at (40, 50). Wind originates from East (90°), blows towards West (270°).
        // Downwind asset at (-15, 50) [West, 55m]
        // Upwind asset at (95, 50) [East, 55m]
        // Crosswind asset at (40, 105) [North, 55m]
        AssetDto source = new AssetDto("T-SRC", "Source", AssetType.TANK, new Position3DDto(40.0, 50.0, 0.0), null, null);
        AssetDto downwindAsset = new AssetDto("T-DOWN", "West Tank", AssetType.TANK, new Position3DDto(-15.0, 50.0, 0.0), null, null);
        AssetDto upwindAsset = new AssetDto("T-UP", "East Tank", AssetType.TANK, new Position3DDto(95.0, 50.0, 0.0), null, null);
        AssetDto crosswindAsset = new AssetDto("T-CROSS", "North Tank", AssetType.TANK, new Position3DDto(40.0, 105.0, 0.0), null, null);

        FacilityDto facility = new FacilityDto("FAC-WIND", "Test Yard", new LocationDto(0.0, 0.0, 0.0), null,
                List.of(source, downwindAsset, upwindAsset, crosswindAsset), List.of(), List.of());
        IncidentDto incident = new IncidentDto("T-SRC", IncidentType.VAPOR_CLOUD_EXPLOSION, new IncidentParametersDto(4500.0, 675.0, 22.0, 45.0, null));
        WindDto eastWind = new WindDto(6.0, 90.0, "E", "METRIC");

        SimulationRequestDto request = new SimulationRequestDto("req-wind-exp", facility, incident, eastWind, null, new SimulationConfigDto());
        SimulationResponseDto response = engine.simulate(request);

        AffectedAssetDto downwind = response.affectedAssets().stream().filter(a -> "T-DOWN".equals(a.assetId())).findFirst().orElseThrow();
        AffectedAssetDto upwind = response.affectedAssets().stream().filter(a -> "T-UP".equals(a.assetId())).findFirst().orElseThrow();
        AffectedAssetDto crosswind = response.affectedAssets().stream().filter(a -> "T-CROSS".equals(a.assetId())).findFirst().orElseThrow();

        assertTrue(downwind.peakOverpressureKPa() > crosswind.peakOverpressureKPa(), "Downwind asset must have higher exposure than crosswind asset");
        assertTrue(crosswind.peakOverpressureKPa() > upwind.peakOverpressureKPa(), "Crosswind asset must have higher exposure than upwind asset");
        assertTrue(downwind.failureProbabilityEstimate() >= upwind.failureProbabilityEstimate());
    }

    @Test
    @DisplayName("Wind Test 6: Wind direction reversal reverses the asymmetric hazard field")
    void testWindDirectionReversal() {
        AssetDto source = new AssetDto("T-SRC", "Source", AssetType.TANK, new Position3DDto(40.0, 50.0, 0.0), null, null);
        AssetDto eastAsset = new AssetDto("T-EAST", "East Tank", AssetType.TANK, new Position3DDto(95.0, 50.0, 0.0), null, null);
        AssetDto westAsset = new AssetDto("T-WEST", "West Tank", AssetType.TANK, new Position3DDto(-15.0, 50.0, 0.0), null, null);

        FacilityDto facility = new FacilityDto("FAC-WIND", "Yard", null, null, List.of(source, eastAsset, westAsset), List.of(), List.of());
        IncidentDto incident = new IncidentDto("T-SRC", IncidentType.VAPOR_CLOUD_EXPLOSION, new IncidentParametersDto(4500.0, 675.0, 22.0, 45.0, null));

        // 1. Wind from East (90°) -> blows towards West -> T-WEST is downwind, T-EAST is upwind
        SimulationRequestDto eastWindReq = new SimulationRequestDto("req-e", facility, incident, new WindDto(6.0, 90.0, "E", "METRIC"), null, new SimulationConfigDto());
        SimulationResponseDto eastWindRes = engine.simulate(eastWindReq);

        AffectedAssetDto eastInEastWind = eastWindRes.affectedAssets().stream().filter(a -> "T-EAST".equals(a.assetId())).findFirst().orElseThrow();
        AffectedAssetDto westInEastWind = eastWindRes.affectedAssets().stream().filter(a -> "T-WEST".equals(a.assetId())).findFirst().orElseThrow();
        assertTrue(westInEastWind.peakOverpressureKPa() > eastInEastWind.peakOverpressureKPa(), "West tank must be higher when wind is from East");

        // 2. Wind from West (270°) -> blows towards East -> T-EAST is downwind, T-WEST is upwind
        SimulationRequestDto westWindReq = new SimulationRequestDto("req-w", facility, incident, new WindDto(6.0, 270.0, "W", "METRIC"), null, new SimulationConfigDto());
        SimulationResponseDto westWindRes = engine.simulate(westWindReq);

        AffectedAssetDto eastInWestWind = westWindRes.affectedAssets().stream().filter(a -> "T-EAST".equals(a.assetId())).findFirst().orElseThrow();
        AffectedAssetDto westInWestWind = westWindRes.affectedAssets().stream().filter(a -> "T-WEST".equals(a.assetId())).findFirst().orElseThrow();
        assertTrue(eastInWestWind.peakOverpressureKPa() > westInWestWind.peakOverpressureKPa(), "East tank must be higher when wind is from West");
    }

    @Test
    @DisplayName("Wind Test 7 & 8: Extreme wind speeds do not produce NaN, Infinity, negative or unbounded values")
    void testExtremeWindSpeedSafeguards() {
        double extremeFactor = windEffectModel.calculateDirectionalWindFactor(90.0, 500.0, 90.0);
        assertFalse(Double.isNaN(extremeFactor));
        assertFalse(Double.isInfinite(extremeFactor));
        assertTrue(extremeFactor > 0.0 && extremeFactor <= 1.50, "Factor must remain strictly bounded");

        SimulationRequestDto extremeReq = createCustomWindRequest(675.0, 95.0, 25.0, 101.325, 250.0, 180.0);
        SimulationResponseDto response = engine.simulate(extremeReq);

        assertNotNull(response);
        for (HazardZoneDto zone : response.hazardZones()) {
            assertTrue(zone.radiusMeters() > 0.0);
            for (Point2D pt : zone.polygonCoordinates()) {
                assertFalse(Double.isNaN(pt.x()));
                assertFalse(Double.isNaN(pt.y()));
            }
        }
        for (AffectedAssetDto asset : response.affectedAssets()) {
            assertTrue(asset.failureProbabilityEstimate() >= 0.0 && asset.failureProbabilityEstimate() <= 1.0);
        }
    }

    @Test
    @DisplayName("Route: Safe route remains SAFE while route intersecting hazard perimeter is UNSAFE/CAUTION")
    void testRouteAssessmentIntegrity() {
        SimulationRequestDto request = createTwoTankRequest(675.0, 95.0, 32.0, 101.325);
        SimulationResponseDto response = engine.simulate(request);

        assertNotNull(response.escapeRoutesAssessment());
        assertEquals(2, response.escapeRoutesAssessment().size());

        EscapeRouteAssessmentDto northRoute = response.escapeRoutesAssessment().stream()
                .filter(r -> "ROUTE-NORTH".equals(r.routeId())).findFirst().orElseThrow();
        assertEquals("SAFE", northRoute.safetyStatus());
        assertNull(northRoute.cutoffDistanceAlongRouteMeters());

        EscapeRouteAssessmentDto westRoute = response.escapeRoutesAssessment().stream()
                .filter(r -> "ROUTE-WEST".equals(r.routeId())).findFirst().orElseThrow();
        assertNotEquals("SAFE", westRoute.safetyStatus());
    }

    @Test
    @DisplayName("Validation: Simulation output is dynamically calculated and does not equal static mock values")
    void testDynamicCalculationDistinctFromMock() {
        SimulationRequestDto request = createTwoTankRequest(675.0, 95.0, 32.0, 101.325);
        SimulationResponseDto response = engine.simulate(request);

        assertNotNull(response);
        assertEquals("req-test-sedov-001", response.requestId());
        assertTrue(response.simulationId().startsWith("sim-sedov-"));

        HazardZoneDto z70 = response.hazardZones().get(0);
        assertNotEquals(42.0, z70.radiusMeters(), "70 kPa radius must be dynamically computed, not hardcoded mock fixture");
        assertEquals(36, z70.polygonCoordinates().size());
    }
}
