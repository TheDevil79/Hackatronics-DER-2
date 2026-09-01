package com.safezone.service;

import com.safezone.dto.EscapeRouteAssessmentDto;
import com.safezone.dto.EscapeRouteDto;
import com.safezone.dto.Point2D;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RouteAssessmentServiceTest {

    private RouteAssessmentService routeAssessmentService;

    @BeforeEach
    void setUp() {
        routeAssessmentService = new RouteAssessmentService(
                20.0, // Unsafe overpressure
                5.0,  // Caution overpressure
                12.5, // Unsafe thermal
                4.0   // Caution thermal
        );
    }

    @Test
    @DisplayName("Route: Route passing through critical blast zone is classified as UNSAFE with cutoff distance")
    void testUnsafeRouteClassification() {
        // Route passing close to epicenter (40, 50)
        EscapeRouteDto unsafeRoute = new EscapeRouteDto(
                "ROUTE-UNSAFE",
                "Internal Tank Path",
                List.of(
                        new Point2D(40.0, 10.0), // 40m away
                        new Point2D(40.0, 45.0), // 5m away -> huge overpressure
                        new Point2D(40.0, 100.0)
                )
        );

        DamageAssessmentService.PhysicalExposureProvider provider = new DamageAssessmentService.PhysicalExposureProvider() {
            @Override
            public double getPeakOverpressureKPa(double distanceMeters) {
                // High near-field pressure
                return distanceMeters < 30.0 ? 55.0 : 4.0;
            }

            @Override
            public double getPeakThermalRadiationKwM2(double distanceMeters) {
                return distanceMeters < 30.0 ? 25.0 : 2.0;
            }
        };

        List<EscapeRouteAssessmentDto> assessments = routeAssessmentService.assessRoutes(
                List.of(unsafeRoute),
                40.0, 50.0,
                provider
        );

        assertNotNull(assessments);
        assertEquals(1, assessments.size());

        EscapeRouteAssessmentDto result = assessments.get(0);
        assertEquals("UNSAFE", result.safetyStatus());
        assertEquals(55.0, result.maxOverpressureKPa());
        assertEquals(25.0, result.maxThermalExposureKwM2());
        assertNotNull(result.cutoffDistanceAlongRouteMeters());
    }

    @Test
    @DisplayName("Route: Route far away from blast hazard is classified as SAFE")
    void testSafeRouteClassification() {
        // Route far from epicenter (40, 50)
        EscapeRouteDto safeRoute = new EscapeRouteDto(
                "ROUTE-NORTH-PERIMETER",
                "North Perimeter Corridor",
                List.of(
                        new Point2D(200.0, 150.0),
                        new Point2D(250.0, 150.0)
                )
        );

        DamageAssessmentService.PhysicalExposureProvider provider = new DamageAssessmentService.PhysicalExposureProvider() {
            @Override
            public double getPeakOverpressureKPa(double distanceMeters) {
                return 1.5; // Low overpressure
            }

            @Override
            public double getPeakThermalRadiationKwM2(double distanceMeters) {
                return 0.8; // Low thermal
            }
        };

        List<EscapeRouteAssessmentDto> assessments = routeAssessmentService.assessRoutes(
                List.of(safeRoute),
                40.0, 50.0,
                provider
        );

        assertNotNull(assessments);
        assertEquals(1, assessments.size());

        EscapeRouteAssessmentDto result = assessments.get(0);
        assertEquals("SAFE", result.safetyStatus());
        assertEquals(1.5, result.maxOverpressureKPa());
        assertEquals(0.8, result.maxThermalExposureKwM2());
        assertNull(result.cutoffDistanceAlongRouteMeters());
    }
}
