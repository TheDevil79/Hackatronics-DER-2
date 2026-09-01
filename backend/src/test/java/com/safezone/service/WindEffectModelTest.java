package com.safezone.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class WindEffectModelTest {

    private WindEffectModel windModel;

    @BeforeEach
    void setUp() {
        windModel = new WindEffectModel(true, 0.25, 10.0, 1.50, 0.75);
    }

    @Test
    @DisplayName("Downwind direction calculation: Meteorological FROM direction reverses by 180°")
    void testDownwindDirection() {
        assertEquals(180.0, windModel.calculateDownwindDirection(0.0), 1e-6);   // Wind from North -> Blows South
        assertEquals(270.0, windModel.calculateDownwindDirection(90.0), 1e-6);  // Wind from East  -> Blows West
        assertEquals(0.0, windModel.calculateDownwindDirection(180.0), 1e-6);   // Wind from South -> Blows North
        assertEquals(90.0, windModel.calculateDownwindDirection(270.0), 1e-6);  // Wind from West  -> Blows East
    }

    @Test
    @DisplayName("Bearing calculation: Cartesian delta x (East) and delta y (North)")
    void testBearingCalculation() {
        // (40,50) to (40, 100) -> North (0°)
        assertEquals(0.0, windModel.calculateBearingDegrees(40.0, 50.0, 40.0, 100.0), 1e-6);
        // (40,50) to (90, 50) -> East (90°)
        assertEquals(90.0, windModel.calculateBearingDegrees(40.0, 50.0, 90.0, 50.0), 1e-6);
        // (40,50) to (40, 0) -> South (180°)
        assertEquals(180.0, windModel.calculateBearingDegrees(40.0, 50.0, 40.0, 0.0), 1e-6);
        // (40,50) to (0, 50) -> West (270°)
        assertEquals(270.0, windModel.calculateBearingDegrees(40.0, 50.0, 0.0, 50.0), 1e-6);
    }

    @Test
    @DisplayName("Zero wind: Directional factor is strictly 1.0 at all bearings")
    void testZeroWind() {
        assertEquals(1.0, windModel.calculateDirectionalWindFactor(0.0, 0.0, 90.0), 1e-6);
        assertEquals(1.0, windModel.calculateDirectionalWindFactor(90.0, 0.0, 90.0), 1e-6);
        assertEquals(1.0, windModel.calculateDirectionalWindFactor(180.0, 0.0, 90.0), 1e-6);
        assertEquals(1.0, windModel.calculateDirectionalWindFactor(270.0, 0.0, 90.0), 1e-6);
    }

    @Test
    @DisplayName("Downwind vs Upwind vs Crosswind: Wind from East (90°) blows towards West (270°)")
    void testDirectionalWindFactorSensitivities() {
        // Wind originates from East (90°).
        // Downwind bearing is West (270°).
        // Upwind bearing is East (90°).
        // Crosswind bearings are North (0°) and South (180°).

        double downwindFactor = windModel.calculateDirectionalWindFactor(270.0, 10.0, 90.0);
        double crosswindFactorNorth = windModel.calculateDirectionalWindFactor(0.0, 10.0, 90.0);
        double crosswindFactorSouth = windModel.calculateDirectionalWindFactor(180.0, 10.0, 90.0);
        double upwindFactor = windModel.calculateDirectionalWindFactor(90.0, 10.0, 90.0);

        // Downwind: 1.0 + 0.25 * 1.0 * cos(0) = 1.25
        assertEquals(1.25, downwindFactor, 1e-6);
        // Crosswind: 1.0 + 0.25 * 1.0 * cos(90°) = 1.00
        assertEquals(1.00, crosswindFactorNorth, 1e-6);
        assertEquals(1.00, crosswindFactorSouth, 1e-6);
        // Upwind: 1.0 + 0.25 * 1.0 * cos(180°) = 0.75
        assertEquals(0.75, upwindFactor, 1e-6);

        assertTrue(downwindFactor > crosswindFactorNorth);
        assertTrue(crosswindFactorNorth > upwindFactor);
    }

    @Test
    @DisplayName("Factor Clamping: Extreme wind speeds do not exceed maxFactor (1.50) or drop below minFactor (0.75)")
    void testFactorClamping() {
        WindEffectModel aggressiveModel = new WindEffectModel(true, 1.0, 10.0, 1.50, 0.75);

        double extremeDownwind = aggressiveModel.calculateDirectionalWindFactor(270.0, 100.0, 90.0);
        double extremeUpwind = aggressiveModel.calculateDirectionalWindFactor(90.0, 100.0, 90.0);

        assertEquals(1.50, extremeDownwind, 1e-6);
        assertEquals(0.75, extremeUpwind, 1e-6);
    }

    @Test
    @DisplayName("Azimuth Wraparound: 359° and 1° calculate minimal angular difference")
    void testAzimuthWraparound() {
        assertEquals(2.0, windModel.calculateAngularDifference(359.0, 1.0), 1e-6);
        assertEquals(2.0, windModel.calculateAngularDifference(1.0, 359.0), 1e-6);
        assertEquals(10.0, windModel.calculateAngularDifference(355.0, 5.0), 1e-6);
    }

    @Test
    @DisplayName("Wind orientation classification: DOWNWIND, UPWIND, and CROSSWIND sectors")
    void testOrientationCategories() {
        // Wind from North (0°) -> blows South (180°)
        assertEquals("DOWNWIND", windModel.getWindOrientationCategory(180.0, 0.0));
        assertEquals("UPWIND", windModel.getWindOrientationCategory(0.0, 0.0));
        assertEquals("CROSSWIND", windModel.getWindOrientationCategory(90.0, 0.0));
        assertEquals("CROSSWIND", windModel.getWindOrientationCategory(270.0, 0.0));
    }
}
