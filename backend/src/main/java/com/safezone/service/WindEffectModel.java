package com.safezone.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * =========================================================================================
 * WIND EFFECT MODEL
 * =========================================================================================
 * <p>
 * Calculates directional atmospheric wind modulation factors for blast waves, thermal radiation,
 * asset exposures, and hazard contour geometries.
 * </p>
 * <p>
 * <b>Meteorological Convention:</b>
 * {@code windOriginDegrees} represents the azimuth <i>FROM</i> which the wind originates:
 * <ul>
 *   <li>0° = Wind from North (blows towards South, downwind = 180°)</li>
 *   <li>90° = Wind from East (blows towards West, downwind = 270°)</li>
 *   <li>180° = Wind from South (blows towards North, downwind = 0°)</li>
 *   <li>270° = Wind from West (blows towards East, downwind = 90°)</li>
 * </ul>
 * </p>
 */
@Component
public class WindEffectModel {

    private static final Logger log = LoggerFactory.getLogger(WindEffectModel.class);

    private final boolean enabled;
    private final double influence;
    private final double referenceSpeedMps;
    private final double maxFactor;
    private final double minFactor;

    public WindEffectModel(
            @Value("${simulation.sedov.wind.enabled:true}") boolean enabled,
            @Value("${simulation.sedov.wind.influence:0.25}") double influence,
            @Value("${simulation.sedov.wind.reference-speed-mps:10.0}") double referenceSpeedMps,
            @Value("${simulation.sedov.wind.max-factor:1.50}") double maxFactor,
            @Value("${simulation.sedov.wind.min-factor:0.75}") double minFactor
    ) {
        this.enabled = enabled;
        this.influence = influence;
        this.referenceSpeedMps = referenceSpeedMps > 0 ? referenceSpeedMps : 10.0;
        this.maxFactor = maxFactor;
        this.minFactor = minFactor;

        log.info("Initialized WindEffectModel (enabled={}, influence={}, refSpeed={} m/s, bounds=[{}, {}])",
                enabled, influence, this.referenceSpeedMps, minFactor, maxFactor);
    }

    /**
     * Calculates the downwind propagation azimuth from wind origin direction.
     *
     * @param windOriginDegrees meteorological direction from which wind blows (0-360)
     * @return downwind bearing (towards which wind blows) in degrees [0, 360)
     */
    public double calculateDownwindDirection(double windOriginDegrees) {
        double normalizedOrigin = ((windOriginDegrees % 360.0) + 360.0) % 360.0;
        return (normalizedOrigin + 180.0) % 360.0;
    }

    /**
     * Calculates the Cartesian azimuth bearing from source (x1, y1) to target (x2, y2).
     * 0° = North (+y), 90° = East (+x), 180° = South (-y), 270° = West (-x).
     */
    public double calculateBearingDegrees(double fromX, double fromY, double toX, double toY) {
        double dx = toX - fromX;
        double dy = toY - fromY;
        if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) {
            return 0.0;
        }
        double bearingRad = Math.atan2(dx, dy);
        return (Math.toDegrees(bearingRad) + 360.0) % 360.0;
    }

    /**
     * Computes the absolute angular difference between two azimuth angles in [0, 180].
     */
    public double calculateAngularDifference(double bearing1, double bearing2) {
        double diff = Math.abs(bearing1 - bearing2) % 360.0;
        return diff > 180.0 ? (360.0 - diff) : diff;
    }

    /**
     * Calculates the directional wind modulation factor along target bearing.
     *
     * @param targetBearingDeg azimuth bearing from source to target point [0, 360)
     * @param windSpeedMps     wind speed in meters per second
     * @param windOriginDeg    direction FROM which the wind blows [0, 360)
     * @return directional factor clamped between [minFactor, maxFactor]
     */
    public double calculateDirectionalWindFactor(double targetBearingDeg, double windSpeedMps, double windOriginDeg) {
        if (!enabled || windSpeedMps <= 0.0 || Double.isNaN(windSpeedMps)) {
            return 1.0;
        }

        double downwindBearing = calculateDownwindDirection(windOriginDeg);
        double thetaDiff = calculateAngularDifference(targetBearingDeg, downwindBearing);
        double thetaRad = Math.toRadians(thetaDiff);

        double normalizedSpeed = Math.min(1.0, Math.max(0.0, windSpeedMps / referenceSpeedMps));
        double alignment = Math.cos(thetaRad); // 1.0 directly downwind, -1.0 directly upwind, 0.0 crosswind

        double factor = 1.0 + (influence * normalizedSpeed * alignment);
        return Math.max(minFactor, Math.min(maxFactor, factor));
    }

    /**
     * Classifies target asset wind orientation relative to incident source.
     */
    public String getWindOrientationCategory(double targetBearingDeg, double windOriginDeg) {
        double downwindBearing = calculateDownwindDirection(windOriginDeg);
        double diff = calculateAngularDifference(targetBearingDeg, downwindBearing);

        if (diff <= 45.0) {
            return "DOWNWIND";
        } else if (diff >= 135.0) {
            return "UPWIND";
        } else {
            return "CROSSWIND";
        }
    }

    public boolean isEnabled() {
        return enabled;
    }

    public double getInfluence() {
        return influence;
    }

    public double getReferenceSpeedMps() {
        return referenceSpeedMps;
    }

    public double getMaxFactor() {
        return maxFactor;
    }

    public double getMinFactor() {
        return minFactor;
    }
}
