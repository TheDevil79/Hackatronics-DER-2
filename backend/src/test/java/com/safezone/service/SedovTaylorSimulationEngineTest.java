package com.safezone.service;

import com.safezone.dto.AffectedAssetDto;
import com.safezone.dto.AssetDimensionsDto;
import com.safezone.dto.AssetDto;
import com.safezone.dto.AssetType;
import com.safezone.dto.EnvironmentDto;
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

    @BeforeEach
    void setUp() {
        engine = new SedovTaylorSimulationEngine(
                1.4,    // gamma
                1.033,  // xi
                36,     // polygon points
                70.0,   // critical threshold kPa
                20.0,   // high threshold kPa
                5.0     // moderate threshold kPa
        );
    }

    private SimulationRequestDto createTwoTankRequest() {
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
                new Position3DDto(95.0, 50.0, 0.0), // distance = 55m from T-101
                new AssetDimensionsDto(null, null, 16.0, 14.0),
                new TankPropertiesDto("PROPANE", 1500.0, 60.0, 9.2, 28.0, true)
        );

        AssetDto bldCtrl = new AssetDto(
                "BLD-CTRL",
                "Control Room",
                AssetType.BUILDING,
                new Position3DDto(180.0, 110.0, 0.0), // distance ~ 152.3m
                new AssetDimensionsDto(30.0, 20.0, 8.0, null),
                null
        );

        FacilityDto facility = new FacilityDto(
                "FAC-PETRO-09",
                "Apex Petrochemical Yard",
                location,
                boundary,
                List.of(t101, t102, bldCtrl),
                List.of(new EscapeRouteDto("ROUTE-WEST", "West Route", List.of(new Point2D(50.0, 20.0), new Point2D(-40.0, 20.0)))),
                List.of()
        );

        IncidentDto incident = new IncidentDto(
                "T-101",
                IncidentType.VAPOR_CLOUD_EXPLOSION,
                new IncidentParametersDto(4500.0, 675.0, 22.0, 45.0, null)
        );

        EnvironmentDto environment = new EnvironmentDto(32.0, 65.0, 101.325, "D", 650.0);
        WindDto wind = new WindDto(6.5, 112.5, "ESE", "METRIC");

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
    @DisplayName("Physics: TNT mass converts accurately to Joules (E = m * 4.184e6)")
    void testTntMassToEnergyConversion() {
        SimulationRequestDto request = createTwoTankRequest();
        double energy = engine.calculateExplosionEnergyJoules(request);

        // 675 kg TNT * 4.184e6 J/kg = 2.8242e9 Joules
        assertEquals(675.0 * 4.184e6, energy, 1.0);
    }

    @Test
    @DisplayName("Physics: Ambient air density obeys ideal gas law rho = P / (R_air * T)")
    void testAirDensityCalculation() {
        SimulationRequestDto request = createTwoTankRequest();
        double rho = engine.calculateAirDensityKgM3(request);

        // T = 32 C = 305.15 K, P = 101.325 kPa = 101325 Pa
        // rho = 101325 / (287.05 * 305.15) = 101325 / 87593.3075 = ~ 1.15676 kg/m^3
        double expectedRho = 101325.0 / (287.05 * (32.0 + 273.15));
        assertEquals(expectedRho, rho, 1e-4);
        assertTrue(rho > 1.1 && rho < 1.3);
    }

    @Test
    @DisplayName("Physics: Sedov shock radius increases with time monotonically")
    void testSedovRadiusIncreasesWithTime() {
        double E = 2.8242e9;
        double rho = 1.1568;

        double r1 = engine.calculateSedovRadius(E, rho, 0.01);
        double r2 = engine.calculateSedovRadius(E, rho, 0.05);
        double r3 = engine.calculateSedovRadius(E, rho, 0.20);

        assertTrue(r1 > 0);
        assertTrue(r2 > r1);
        assertTrue(r3 > r2);
    }

    @Test
    @DisplayName("Physics: Sedov radius follows exact t^(2/5) = t^0.4 power law")
    void testSedovRadiusFollowsPowerLaw() {
        double E = 2.8242e9;
        double rho = 1.1568;

        double t1 = 0.02;
        double t2 = 0.04; // 2x time

        double r1 = engine.calculateSedovRadius(E, rho, t1);
        double r2 = engine.calculateSedovRadius(E, rho, t2);

        // r2 / r1 should equal 2^0.4 ~ 1.3195079
        double expectedRatio = Math.pow(2.0, 0.4);
        assertEquals(expectedRatio, r2 / r1, 1e-5);
    }

    @Test
    @DisplayName("Physics: Shock front velocity D(t) decays with time")
    void testShockVelocityDecreasesWithTime() {
        double E = 2.8242e9;
        double rho = 1.1568;

        double v1 = engine.calculateShockVelocity(E, rho, 0.01);
        double v2 = engine.calculateShockVelocity(E, rho, 0.05);
        double v3 = engine.calculateShockVelocity(E, rho, 0.20);

        assertTrue(v1 > v2);
        assertTrue(v2 > v3);
    }

    @Test
    @DisplayName("Physics: Peak overpressure decays inversely with cube of distance (R^-3)")
    void testOverpressureDecreasesWithDistance() {
        double E = 2.8242e9;
        double rho = 1.1568;

        double p10m = engine.calculatePeakOverpressureKPa(10.0, E, rho);
        double p20m = engine.calculatePeakOverpressureKPa(20.0, E, rho);
        double p40m = engine.calculatePeakOverpressureKPa(40.0, E, rho);

        assertTrue(p10m > p20m);
        assertTrue(p20m > p40m);

        // At 2x distance, overpressure should be 1/8 (2^-3 = 0.125)
        assertEquals(0.125, p20m / p10m, 1e-4);
        assertEquals(0.125, p40m / p20m, 1e-4);
    }

    @Test
    @DisplayName("Physics: Higher overpressure threshold corresponds to a smaller blast radius")
    void testHazardRadiusDecreasesWhenThresholdIncreases() {
        double E = 2.8242e9;
        double rho = 1.1568;

        double r70 = engine.calculateRadiusForOverpressureThreshold(70.0, E, rho);
        double r20 = engine.calculateRadiusForOverpressureThreshold(20.0, E, rho);
        double r5 = engine.calculateRadiusForOverpressureThreshold(5.0, E, rho);

        assertTrue(r70 < r20, "70 kPa radius should be strictly smaller than 20 kPa radius");
        assertTrue(r20 < r5, "20 kPa radius should be strictly smaller than 5 kPa radius");

        // Verify consistency: overpressure at r70 should be exactly 70 kPa
        double evaluatedP70 = engine.calculatePeakOverpressureKPa(r70, E, rho);
        assertEquals(70.0, evaluatedP70, 0.01);

        double evaluatedP20 = engine.calculatePeakOverpressureKPa(r20, E, rho);
        assertEquals(20.0, evaluatedP20, 0.01);

        double evaluatedP5 = engine.calculatePeakOverpressureKPa(r5, E, rho);
        assertEquals(5.0, evaluatedP5, 0.01);
    }

    @Test
    @DisplayName("Physics: Asset exposure and distance calculation for facility assets")
    void testAssetExposureCalculation() {
        SimulationRequestDto request = createTwoTankRequest();
        SimulationResponseDto response = engine.simulate(request);

        assertNotNull(response.affectedAssets());
        assertEquals(3, response.affectedAssets().size());

        // T-101 (Epicenter)
        AffectedAssetDto t101 = response.affectedAssets().stream()
                .filter(a -> "T-101".equals(a.assetId())).findFirst().orElseThrow();
        assertEquals(0.0, t101.distanceMeters());
        assertEquals("TOTAL_LOSS", t101.damageState());
        assertEquals(1.0, t101.failureProbabilityEstimate());
        assertNull(t101.estimatedTimeToRuptureSeconds(), "Thermal rupture time is null in blast-only engine");

        // T-102 (55m away)
        AffectedAssetDto t102 = response.affectedAssets().stream()
                .filter(a -> "T-102".equals(a.assetId())).findFirst().orElseThrow();
        assertEquals(55.0, t102.distanceMeters(), 0.1);
        assertTrue(t102.peakOverpressureKPa() > 0.0);
        assertTrue(t102.failureProbabilityEstimate() > 0.0);

        // BLD-CTRL (~152.3m away)
        AffectedAssetDto bldCtrl = response.affectedAssets().stream()
                .filter(a -> "BLD-CTRL".equals(a.assetId())).findFirst().orElseThrow();
        assertEquals(152.32, bldCtrl.distanceMeters(), 0.5);
        assertTrue(bldCtrl.peakOverpressureKPa() < t102.peakOverpressureKPa());
    }

    @Test
    @DisplayName("Robustness: Zero/null/edge-case inputs handled safely")
    void testZeroAndEdgeCaseHandling() {
        assertEquals(0.0, engine.calculateSedovRadius(0, 1.2, 1.0));
        assertEquals(0.0, engine.calculateSedovRadius(1e6, 0, 1.0));
        assertEquals(0.0, engine.calculateSedovRadius(1e6, 1.2, 0));
        assertEquals(0.0, engine.calculateShockVelocity(1e6, 1.2, 0));
        assertEquals(0.0, engine.calculateArrivalTimeSeconds(0, 1e6, 1.2));
        assertEquals(0.0, engine.calculateRadiusForOverpressureThreshold(0, 1e6, 1.2));
        assertEquals(500.0, engine.calculatePeakOverpressureKPa(0, 1e6, 1.2)); // Epicenter bound
    }

    @Test
    @DisplayName("Validation: Simulation output is dynamically computed and does not match static mock fixture")
    void testDynamicOutputDoesNotEqualStaticMock() {
        SimulationRequestDto request = createTwoTankRequest();
        SimulationResponseDto response = engine.simulate(request);

        assertNotNull(response);
        assertEquals("req-test-sedov-001", response.requestId());
        assertTrue(response.simulationId().startsWith("sim-sedov-"));
        assertEquals("CRITICAL", response.overallSeverity());

        // Verify that hazard zones are computed dynamically
        List<HazardZoneDto> zones = response.hazardZones();
        assertEquals(3, zones.size());

        HazardZoneDto z70 = zones.get(0);
        assertEquals("ZONE-BLAST-70KPA", z70.zoneId());
        assertEquals("BLAST", z70.zoneType());
        assertEquals(70.0, z70.thresholdValue());

        // In mock fixture, radius was hardcoded 42.0m. In analytical Sedov calculation with 675kg TNT and rho=1.157,
        // E = 2.8242e9 J, r70 = [ (8 * 1.033^5 * 2.8242e9) / (25 * 2.4 * 70000) ]^(1/3) = ~ 18.27 m.
        // Confirm dynamic value is calculated and distinct from static mock
        assertNotNull(z70.radiusMeters());
        assertNotEquals(42.0, z70.radiusMeters());
        assertEquals(36, z70.polygonCoordinates().size());

        // Check circular polygon geometry around source asset (40, 50)
        Point2D firstPt = z70.polygonCoordinates().get(0);
        assertEquals(40.0 + z70.radiusMeters(), firstPt.x(), 0.05);
        assertEquals(50.0, firstPt.y(), 0.05);
    }
}
