package com.safezone.service;

import com.safezone.dto.EscapeRouteAssessmentDto;
import com.safezone.dto.EscapeRouteDto;
import com.safezone.dto.Point2D;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * =========================================================================================
 * CONSEQUENCE LAYER: RouteAssessmentService
 * =========================================================================================
 * <p>
 * Evaluates designated plant escape and evacuation routes against physical hazard contours
 * (blast overpressures and thermal radiation fluxes) to determine safety status and cutoff points.
 * Supports directional, wind-modulated hazard fields.
 * </p>
 */
@Service
public class RouteAssessmentService {

    private static final Logger log = LoggerFactory.getLogger(RouteAssessmentService.class);

    private final double unsafeOverpressureKPa;
    private final double cautionOverpressureKPa;
    private final double unsafeThermalKwM2;
    private final double cautionThermalKwM2;

    public RouteAssessmentService(
            @Value("${simulation.route.unsafe-overpressure-kpa:20.0}") double unsafeOverpressureKPa,
            @Value("${simulation.route.caution-overpressure-kpa:5.0}") double cautionOverpressureKPa,
            @Value("${simulation.route.unsafe-thermal-kw-m2:12.5}") double unsafeThermalKwM2,
            @Value("${simulation.route.caution-thermal-kw-m2:4.0}") double cautionThermalKwM2
    ) {
        this.unsafeOverpressureKPa = unsafeOverpressureKPa;
        this.cautionOverpressureKPa = cautionOverpressureKPa;
        this.unsafeThermalKwM2 = unsafeThermalKwM2;
        this.cautionThermalKwM2 = cautionThermalKwM2;

        log.info("Initialized RouteAssessmentService (Unsafe: [{} kPa, {} kW/m²], Caution: [{} kPa, {} kW/m²])",
                unsafeOverpressureKPa, unsafeThermalKwM2, cautionOverpressureKPa, cautionThermalKwM2);
    }

    /**
     * Assesses a list of escape routes against the incident epicenter and calculated physical hazard fields.
     */
    public List<EscapeRouteAssessmentDto> assessRoutes(
            List<EscapeRouteDto> escapeRoutes,
            double epicenterX,
            double epicenterY,
            DamageAssessmentService.PhysicalExposureProvider exposureProvider
    ) {
        List<EscapeRouteAssessmentDto> assessments = new ArrayList<>();
        if (escapeRoutes == null) return assessments;

        for (EscapeRouteDto route : escapeRoutes) {
            if (route == null) continue;

            String routeId = route.routeId();
            String routeName = route.name() != null ? route.name() : routeId;

            double maxOverpressure = 0.0;
            double maxThermal = 0.0;
            Double cutoffDistanceAlongRoute = null;

            double accumulatedPathLength = 0.0;
            Point2D previousPoint = null;

            if (route.points() != null) {
                for (Point2D point : route.points()) {
                    if (point == null) continue;

                    if (previousPoint != null) {
                        accumulatedPathLength += Math.hypot(point.x() - previousPoint.x(), point.y() - previousPoint.y());
                    }
                    previousPoint = point;

                    double dx = point.x() - epicenterX;
                    double dy = point.y() - epicenterY;
                    double distanceToEpicenter = Math.hypot(dx, dy);
                    double bearingDegrees = (Math.toDegrees(Math.atan2(dx, dy)) + 360.0) % 360.0;

                    double overpressure = exposureProvider.getPeakOverpressureKPa(distanceToEpicenter, bearingDegrees);
                    double thermal = exposureProvider.getPeakThermalRadiationKwM2(distanceToEpicenter, bearingDegrees);

                    if (overpressure > maxOverpressure) maxOverpressure = overpressure;
                    if (thermal > maxThermal) maxThermal = thermal;

                    // First point where route crosses the unsafe hazard perimeter
                    if (cutoffDistanceAlongRoute == null && (overpressure >= unsafeOverpressureKPa || thermal >= unsafeThermalKwM2)) {
                        cutoffDistanceAlongRoute = accumulatedPathLength;
                    }
                }
            }

            // Determine safety classification
            String safetyStatus;
            String recommendation;

            if (maxOverpressure >= unsafeOverpressureKPa || maxThermal >= unsafeThermalKwM2) {
                safetyStatus = "UNSAFE";
                recommendation = String.format(
                        "DO NOT USE. Route intersects critical hazard perimeter (peak overpressure: %.1f kPa, thermal: %.1f kW/m²). Compromised near %.1fm along path.",
                        maxOverpressure, maxThermal, cutoffDistanceAlongRoute != null ? cutoffDistanceAlongRoute : 0.0
                );
            } else if (maxOverpressure >= cautionOverpressureKPa || maxThermal >= cautionThermalKwM2) {
                safetyStatus = "CAUTION";
                recommendation = String.format(
                        "USE WITH CAUTION. Route passes near moderate exposure zone (peak overpressure: %.1f kPa, thermal: %.1f kW/m²). Direct personnel toward alternate routes if available.",
                        maxOverpressure, maxThermal
                );
            } else {
                safetyStatus = "SAFE";
                recommendation = String.format(
                        "RECOMMENDED EVACUATION ROUTE. Protected by distance from blast and thermal hazard zones (max exposure: %.2f kPa, %.2f kW/m²).",
                        maxOverpressure, maxThermal
                );
            }

            assessments.add(new EscapeRouteAssessmentDto(
                    routeId,
                    routeName,
                    safetyStatus,
                    roundToTwoDecimals(maxThermal),
                    roundToTwoDecimals(maxOverpressure),
                    cutoffDistanceAlongRoute != null ? roundToTwoDecimals(cutoffDistanceAlongRoute) : null,
                    recommendation
            ));
        }

        return assessments;
    }

    private double roundToTwoDecimals(double val) {
        if (Double.isNaN(val) || Double.isInfinite(val)) return 0.0;
        return Math.round(val * 100.0) / 100.0;
    }
}
