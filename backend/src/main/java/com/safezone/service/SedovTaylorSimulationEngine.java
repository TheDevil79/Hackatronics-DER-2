package com.safezone.service;

import com.safezone.dto.AffectedAssetDto;
import com.safezone.dto.ApproachDirectionDto;
import com.safezone.dto.AssetDto;
import com.safezone.dto.DominoStepDto;
import com.safezone.dto.EscapeRouteAssessmentDto;
import com.safezone.dto.EscapeRouteDto;
import com.safezone.dto.FacilityDto;
import com.safezone.dto.HazardZoneDto;
import com.safezone.dto.IncidentDto;
import com.safezone.dto.Point2D;
import com.safezone.dto.Position3DDto;
import com.safezone.dto.SimulationRequestDto;
import com.safezone.dto.SimulationResponseDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

/**
 * =========================================================================================
 * SEDOV-TAYLOR BLAST SIMULATION ENGINE
 * =========================================================================================
 * <p>
 * Implements an educational/hackathon analytical point-source blast wave simulation based on
 * the self-similar Sedov-Taylor solution and Rankine-Hugoniot strong-shock jump conditions.
 * </p>
 * <p>
 * <b>Governing Equations:</b>
 * <ul>
 *   <li><b>TNT Energy:</b> {@code E = m_TNT * 4.184e6 J}</li>
 *   <li><b>Air Density:</b> {@code rho = P / (R_air * T)} with {@code R_air = 287.05 J/(kg*K)}</li>
 *   <li><b>Shock Radius:</b> {@code R(t) = xi * (E / rho)^(1/5) * t^(2/5)}</li>
 *   <li><b>Shock Velocity:</b> {@code D(t) = (2/5) * R(t) / t}</li>
 *   <li><b>Rankine-Hugoniot Overpressure:</b> {@code deltaP = (2 / (gamma + 1)) * rho * D^2 = (8 * xi^5 * E) / (25 * (gamma + 1) * R^3)}</li>
 * </ul>
 * </p>
 * <p>
 * <b>DISCLAIMER:</b> This is a simplified analytical engineering model for hackathon/educational
 * demonstration and is NOT certified for real industrial safety or life-critical emergency management.
 * </p>
 */
@Component
@ConditionalOnProperty(name = "simulation.engine", havingValue = "sedov")
public class SedovTaylorSimulationEngine implements SimulationEngine {

    private static final Logger log = LoggerFactory.getLogger(SedovTaylorSimulationEngine.class);

    // Physics constants
    public static final double JOULES_PER_KG_TNT = 4.184e6;
    public static final double SPECIFIC_GAS_CONSTANT_AIR = 287.05; // J/(kg*K)
    public static final double KELVIN_OFFSET = 273.15;

    private final double gamma;
    private final double xi;
    private final int numPolygonPoints;
    private final double thresholdCriticalKPa;
    private final double thresholdHighKPa;
    private final double thresholdModerateKPa;

    public SedovTaylorSimulationEngine(
            @Value("${simulation.sedov.gamma:1.4}") double gamma,
            @Value("${simulation.sedov.xi:1.033}") double xi,
            @Value("${simulation.sedov.polygon-points:36}") int numPolygonPoints,
            @Value("${simulation.sedov.threshold.critical-kpa:70.0}") double thresholdCriticalKPa,
            @Value("${simulation.sedov.threshold.high-kpa:20.0}") double thresholdHighKPa,
            @Value("${simulation.sedov.threshold.moderate-kpa:5.0}") double thresholdModerateKPa
    ) {
        this.gamma = gamma;
        this.xi = xi;
        this.numPolygonPoints = numPolygonPoints > 2 ? numPolygonPoints : 36;
        this.thresholdCriticalKPa = thresholdCriticalKPa;
        this.thresholdHighKPa = thresholdHighKPa;
        this.thresholdModerateKPa = thresholdModerateKPa;

        log.info("Initialized SedovTaylorSimulationEngine (gamma={}, xi={}, polygonPoints={}, thresholds=[{}, {}, {}] kPa)",
                gamma, xi, this.numPolygonPoints, thresholdCriticalKPa, thresholdHighKPa, thresholdModerateKPa);
    }

    @Override
    public SimulationResponseDto simulate(SimulationRequestDto request) {
        long startTime = System.nanoTime();

        String requestId = (request != null && request.requestId() != null && !request.requestId().isBlank())
                ? request.requestId()
                : "req-" + UUID.randomUUID();

        String simulationId = "sim-sedov-" + Instant.now().toEpochMilli() + "-" + UUID.randomUUID().toString().substring(0, 8);
        String timestamp = Instant.now().toString();

        // 1. Calculate Explosion Energy (Joules)
        double energyJoules = calculateExplosionEnergyJoules(request);

        // 2. Calculate Ambient Air Density (kg/m^3)
        double airDensity = calculateAirDensityKgM3(request);

        // 3. Identify Incident Epicenter
        Position3DDto epicenter = findEpicenter(request);

        // 4. Calculate Blast Hazard Zones (70 kPa, 20 kPa, 5 kPa)
        List<HazardZoneDto> hazardZones = calculateBlastHazardZones(energyJoules, airDensity, epicenter);

        // 5. Evaluate Asset Exposure (Distance and Overpressure)
        List<AffectedAssetDto> affectedAssets = calculateAffectedAssets(request, energyJoules, airDensity, epicenter);

        // 6. Evaluate Domino Escalation Chain
        List<DominoStepDto> dominoPropagation = evaluateDominoPropagation(request, affectedAssets);

        // 7. Evaluate Escape Route Exposure
        List<EscapeRouteAssessmentDto> escapeRoutesAssessment = evaluateEscapeRoutes(request, hazardZones, epicenter);

        // 8. Determine Recommended Approach Direction
        ApproachDirectionDto recommendedApproachDirection = calculateApproachDirection(request);

        // 9. Overall Severity & Risk Scoring
        String overallSeverity = determineOverallSeverity(affectedAssets, hazardZones);
        double overallRiskScore = calculateOverallRiskScore(affectedAssets, hazardZones);
        String summary = generateSummary(request, energyJoules, hazardZones, affectedAssets);

        double executionTimeMs = (System.nanoTime() - startTime) / 1_000_000.0;

        return new SimulationResponseDto(
                simulationId,
                requestId,
                timestamp,
                executionTimeMs,
                overallSeverity,
                overallRiskScore,
                summary,
                hazardZones,
                affectedAssets,
                dominoPropagation,
                escapeRoutesAssessment,
                recommendedApproachDirection
        );
    }

    /**
     * Calculates total explosion energy in Joules from TNT equivalent mass.
     */
    public double calculateExplosionEnergyJoules(SimulationRequestDto request) {
        if (request != null && request.incident() != null && request.incident().parameters() != null) {
            Double tntMassKg = request.incident().parameters().tntEquivalentMassKg();
            if (tntMassKg != null && tntMassKg > 0) {
                return tntMassKg * JOULES_PER_KG_TNT;
            }
            // Secondary fallback: fuel mass with generic vapor cloud yield if TNT mass missing
            Double fuelMassKg = request.incident().parameters().fuelMassKg();
            if (fuelMassKg != null && fuelMassKg > 0) {
                double genericYield = 0.10; // 10% blast yield
                double heatOfCombustionLpg = 46.0e6; // J/kg
                return fuelMassKg * heatOfCombustionLpg * genericYield;
            }
        }
        // Default minimal fallback for robustness
        return 100.0 * JOULES_PER_KG_TNT;
    }

    /**
     * Calculates air density rho = P / (R_air * T) in kg/m^3.
     */
    public double calculateAirDensityKgM3(SimulationRequestDto request) {
        double tempC = 25.0;
        double pressureKPa = 101.325;

        if (request != null && request.environment() != null) {
            if (request.environment().ambientTemperatureC() != null) {
                tempC = request.environment().ambientTemperatureC();
            }
            if (request.environment().atmosphericPressureKPa() != null) {
                pressureKPa = request.environment().atmosphericPressureKPa();
            }
        }

        double tempK = tempC + KELVIN_OFFSET;
        double pressurePa = pressureKPa * 1000.0;

        if (tempK <= 0) tempK = 298.15;
        if (pressurePa <= 0) pressurePa = 101325.0;

        return pressurePa / (SPECIFIC_GAS_CONSTANT_AIR * tempK);
    }

    /**
     * Solves for shock radius R(t) = xi * (E / rho)^(1/5) * t^(2/5).
     */
    public double calculateSedovRadius(double energyJoules, double airDensity, double timeSeconds) {
        if (timeSeconds <= 0 || energyJoules <= 0 || airDensity <= 0) {
            return 0.0;
        }
        double energyToDensity = energyJoules / airDensity;
        return xi * Math.pow(energyToDensity, 0.2) * Math.pow(timeSeconds, 0.4);
    }

    /**
     * Solves for shock velocity D(t) = (2/5) * R(t) / t.
     */
    public double calculateShockVelocity(double energyJoules, double airDensity, double timeSeconds) {
        if (timeSeconds <= 0 || energyJoules <= 0 || airDensity <= 0) {
            return 0.0;
        }
        double radius = calculateSedovRadius(energyJoules, airDensity, timeSeconds);
        return 0.4 * (radius / timeSeconds);
    }

    /**
     * Solves for arrival time of shock at distance R: t = (R / (xi * (E/rho)^(1/5)))^(5/2).
     */
    public double calculateArrivalTimeSeconds(double distanceMeters, double energyJoules, double airDensity) {
        if (distanceMeters <= 0 || energyJoules <= 0 || airDensity <= 0) {
            return 0.0;
        }
        double characteristicLength = xi * Math.pow(energyJoules / airDensity, 0.2);
        return Math.pow(distanceMeters / characteristicLength, 2.5);
    }

    /**
     * Solves for peak overpressure in kPa at distance R using Rankine-Hugoniot jump condition:
     * deltaP = (8 * xi^5 * E) / (25 * (gamma + 1) * R^3) in Pa.
     */
    public double calculatePeakOverpressureKPa(double distanceMeters, double energyJoules, double airDensity) {
        if (distanceMeters <= 0.001) {
            // Epicenter source point singularity: return maximum bound overpressure
            return 500.0;
        }
        double numerator = 8.0 * Math.pow(xi, 5.0) * energyJoules;
        double denominator = 25.0 * (gamma + 1.0) * Math.pow(distanceMeters, 3.0);
        double overpressurePa = numerator / denominator;
        return overpressurePa / 1000.0; // convert Pa to kPa
    }

    /**
     * Solves analytically for the radius R corresponding to an overpressure threshold in kPa:
     * R = [ (8 * xi^5 * E) / (25 * (gamma + 1) * (thresholdKPa * 1000)) ]^(1/3).
     */
    public double calculateRadiusForOverpressureThreshold(double thresholdKPa, double energyJoules, double airDensity) {
        if (thresholdKPa <= 0 || energyJoules <= 0) {
            return 0.0;
        }
        double thresholdPa = thresholdKPa * 1000.0;
        double numerator = 8.0 * Math.pow(xi, 5.0) * energyJoules;
        double denominator = 25.0 * (gamma + 1.0) * thresholdPa;
        return Math.cbrt(numerator / denominator);
    }

    private Position3DDto findEpicenter(SimulationRequestDto request) {
        if (request != null && request.facility() != null && request.facility().assets() != null && request.incident() != null) {
            String sourceAssetId = request.incident().sourceAssetId();
            for (AssetDto asset : request.facility().assets()) {
                if (asset != null && sourceAssetId != null && sourceAssetId.equals(asset.assetId())) {
                    if (asset.position() != null) {
                        return asset.position();
                    }
                }
            }
        }
        return new Position3DDto(0.0, 0.0, 0.0);
    }

    private List<HazardZoneDto> calculateBlastHazardZones(double energyJoules, double airDensity, Position3DDto epicenter) {
        List<HazardZoneDto> zones = new ArrayList<>();

        double r70 = calculateRadiusForOverpressureThreshold(thresholdCriticalKPa, energyJoules, airDensity);
        double r20 = calculateRadiusForOverpressureThreshold(thresholdHighKPa, energyJoules, airDensity);
        double r5 = calculateRadiusForOverpressureThreshold(thresholdModerateKPa, energyJoules, airDensity);

        zones.add(new HazardZoneDto(
                "ZONE-BLAST-" + (int) thresholdCriticalKPa + "KPA",
                "BLAST",
                thresholdCriticalKPa,
                "kPa",
                "CRITICAL",
                roundToTwoDecimals(r70),
                generateCircularPolygon(epicenter.x(), epicenter.y(), r70, numPolygonPoints),
                "Sedov-Taylor Blast Zone: Total structural destruction, heavy equipment displacement, near-100% human lethality."
        ));

        zones.add(new HazardZoneDto(
                "ZONE-BLAST-" + (int) thresholdHighKPa + "KPA",
                "BLAST",
                thresholdHighKPa,
                "kPa",
                "HIGH",
                roundToTwoDecimals(r20),
                generateCircularPolygon(epicenter.x(), epicenter.y(), r20, numPolygonPoints),
                "Sedov-Taylor Blast Zone: Moderate to severe structural damage, distortion of steel equipment frames, wall collapse."
        ));

        zones.add(new HazardZoneDto(
                "ZONE-BLAST-" + (int) thresholdModerateKPa + "KPA",
                "BLAST",
                thresholdModerateKPa,
                "kPa",
                "MODERATE",
                roundToTwoDecimals(r5),
                generateCircularPolygon(epicenter.x(), epicenter.y(), r5, numPolygonPoints),
                "Sedov-Taylor Blast Zone: Minor damage, window and partition failure, glass projectile hazard to personnel."
        ));

        return zones;
    }

    private List<Point2D> generateCircularPolygon(double centerX, double centerY, double radiusMeters, int points) {
        List<Point2D> polygon = new ArrayList<>();
        double angleStep = (2.0 * Math.PI) / points;
        for (int i = 0; i < points; i++) {
            double angle = i * angleStep;
            double px = centerX + radiusMeters * Math.cos(angle);
            double py = centerY + radiusMeters * Math.sin(angle);
            polygon.add(new Point2D(roundToTwoDecimals(px), roundToTwoDecimals(py)));
        }
        return polygon;
    }

    private List<AffectedAssetDto> calculateAffectedAssets(
            SimulationRequestDto request,
            double energyJoules,
            double airDensity,
            Position3DDto epicenter
    ) {
        List<AffectedAssetDto> affectedList = new ArrayList<>();
        if (request == null || request.facility() == null || request.facility().assets() == null) {
            return affectedList;
        }

        String sourceAssetId = (request.incident() != null) ? request.incident().sourceAssetId() : null;

        for (AssetDto asset : request.facility().assets()) {
            if (asset == null) continue;

            double assetX = (asset.position() != null) ? asset.position().x() : 0.0;
            double assetY = (asset.position() != null) ? asset.position().y() : 0.0;

            double distance = Math.hypot(assetX - epicenter.x(), assetY - epicenter.y());
            boolean isSource = asset.assetId() != null && asset.assetId().equals(sourceAssetId);

            double peakOverpressureKPa;
            String damageState;
            double failureProbability;
            String summary;

            if (isSource || distance < 1.0) {
                distance = 0.0;
                peakOverpressureKPa = 350.0; // Near-field epicenter limit
                damageState = "TOTAL_LOSS";
                failureProbability = 1.0;
                summary = "Primary explosion epicenter. Total catastrophic structural breach.";
            } else {
                peakOverpressureKPa = calculatePeakOverpressureKPa(distance, energyJoules, airDensity);

                if (peakOverpressureKPa >= thresholdCriticalKPa) {
                    damageState = "STRUCTURAL_DAMAGE";
                    failureProbability = Math.min(1.0, 0.70 + (peakOverpressureKPa - thresholdCriticalKPa) / 200.0);
                    summary = String.format("High blast overpressure (%.1f kPa). Major structural deformation and rupture risk.", peakOverpressureKPa);
                } else if (peakOverpressureKPa >= thresholdHighKPa) {
                    damageState = "STRUCTURAL_DAMAGE";
                    failureProbability = 0.40 + (peakOverpressureKPa - thresholdHighKPa) / (thresholdCriticalKPa - thresholdHighKPa) * 0.30;
                    summary = String.format("Significant overpressure (%.1f kPa). Structural distortion and piping stress.", peakOverpressureKPa);
                } else if (peakOverpressureKPa >= thresholdModerateKPa) {
                    damageState = "MINOR_DAMAGE";
                    failureProbability = 0.05 + (peakOverpressureKPa - thresholdModerateKPa) / (thresholdHighKPa - thresholdModerateKPa) * 0.15;
                    summary = String.format("Moderate shock wave (%.1f kPa). Non-structural damage and cladding failure.", peakOverpressureKPa);
                } else {
                    damageState = "INTACT";
                    failureProbability = 0.0;
                    summary = String.format("Low blast exposure (%.2f kPa). Structure intact.", peakOverpressureKPa);
                }
            }

            affectedList.add(new AffectedAssetDto(
                    asset.assetId(),
                    asset.name() != null ? asset.name() : asset.assetId(),
                    roundToTwoDecimals(distance),
                    0.0, // Thermal radiation explicitly marked 0.0 (Sedov blast engine models overpressure)
                    roundToTwoDecimals(peakOverpressureKPa),
                    damageState,
                    roundToTwoDecimals(failureProbability),
                    null, // Thermal vessel rupture time unavailable in blast-only engine
                    summary
            ));
        }

        // Sort affected assets by distance from epicenter
        affectedList.sort(Comparator.comparingDouble(AffectedAssetDto::distanceMeters));
        return affectedList;
    }

    private List<DominoStepDto> evaluateDominoPropagation(SimulationRequestDto request, List<AffectedAssetDto> affectedAssets) {
        List<DominoStepDto> steps = new ArrayList<>();
        if (request == null || request.incident() == null || affectedAssets == null) {
            return steps;
        }

        String sourceId = request.incident().sourceAssetId();
        int stepOrder = 1;

        for (AffectedAssetDto asset : affectedAssets) {
            if (asset.assetId().equals(sourceId)) continue;

            if (asset.failureProbabilityEstimate() >= 0.30) {
                double arrivalDelay = calculateArrivalTimeSeconds(asset.distanceMeters(),
                        calculateExplosionEnergyJoules(request), calculateAirDensityKgM3(request));

                steps.add(new DominoStepDto(
                        stepOrder++,
                        sourceId,
                        asset.assetId(),
                        "OVERPRESSURE_COLLAPSE",
                        roundToTwoDecimals(asset.failureProbabilityEstimate()),
                        roundToTwoDecimals(Math.max(0.1, arrivalDelay)),
                        String.format("Sedov shock wave overpressure (%.1f kPa) threatens adjacent unit integrity.", asset.peakOverpressureKPa())
                ));
            }
        }
        return steps;
    }

    private List<EscapeRouteAssessmentDto> evaluateEscapeRoutes(
            SimulationRequestDto request,
            List<HazardZoneDto> hazardZones,
            Position3DDto epicenter
    ) {
        List<EscapeRouteAssessmentDto> assessments = new ArrayList<>();
        if (request == null || request.facility() == null || request.facility().escapeRoutes() == null) {
            return assessments;
        }

        double r20 = 0.0;
        for (HazardZoneDto zone : hazardZones) {
            if (zone.thresholdValue() == thresholdHighKPa) {
                r20 = zone.radiusMeters();
            }
        }

        for (EscapeRouteDto route : request.facility().escapeRoutes()) {
            if (route == null) continue;

            double minDistanceToEpicenter = Double.MAX_VALUE;
            if (route.points() != null) {
                for (Point2D pt : route.points()) {
                    double dist = Math.hypot(pt.x() - epicenter.x(), pt.y() - epicenter.y());
                    if (dist < minDistanceToEpicenter) {
                        minDistanceToEpicenter = dist;
                    }
                }
            }

            String safetyStatus;
            Double cutoffDistance = null;
            String recommendation;

            if (minDistanceToEpicenter < r20) {
                safetyStatus = "UNSAFE";
                cutoffDistance = roundToTwoDecimals(minDistanceToEpicenter);
                recommendation = "DO NOT USE. Route traverses high overpressure blast contour.";
            } else if (minDistanceToEpicenter < r20 * 1.5) {
                safetyStatus = "CAUTION";
                recommendation = "CAUTION. Route is near moderate overpressure perimeter. Use alternative if possible.";
            } else {
                safetyStatus = "SAFE";
                recommendation = "RECOMMENDED EVACUATION ROUTE. Protected by distance from blast epicenter.";
            }

            assessments.add(new EscapeRouteAssessmentDto(
                    route.routeId(),
                    route.name() != null ? route.name() : route.routeId(),
                    safetyStatus,
                    0.0,
                    roundToTwoDecimals(calculatePeakOverpressureKPa(minDistanceToEpicenter, calculateExplosionEnergyJoules(request), calculateAirDensityKgM3(request))),
                    cutoffDistance,
                    recommendation
            ));
        }
        return assessments;
    }

    private ApproachDirectionDto calculateApproachDirection(SimulationRequestDto request) {
        double windFromNorth = 0.0;
        if (request != null && request.wind() != null) {
            windFromNorth = request.wind().directionDegreesFromNorth();
        }

        // Optimal approach is directly upwind from the incident
        double approachBearing = (windFromNorth + 180.0) % 360.0;
        String compass = degreesToCompass(approachBearing);

        return new ApproachDirectionDto(
                roundToTwoDecimals(approachBearing),
                compass,
                "OPTIMAL",
                180.0,
                String.format("Upwind approach along %.1f° (%s) provides clear air corridor away from hazardous debris and blast trajectory.", approachBearing, compass)
        );
    }

    private String determineOverallSeverity(List<AffectedAssetDto> affectedAssets, List<HazardZoneDto> hazardZones) {
        boolean hasCriticalAsset = affectedAssets.stream()
                .anyMatch(a -> "TOTAL_LOSS".equals(a.damageState()) || a.failureProbabilityEstimate() >= 0.70);
        if (hasCriticalAsset) return "CRITICAL";

        boolean hasHighAsset = affectedAssets.stream()
                .anyMatch(a -> "STRUCTURAL_DAMAGE".equals(a.damageState()) || a.failureProbabilityEstimate() >= 0.30);
        if (hasHighAsset) return "HIGH";

        return "MODERATE";
    }

    private double calculateOverallRiskScore(List<AffectedAssetDto> affectedAssets, List<HazardZoneDto> hazardZones) {
        double maxRisk = 0.0;
        for (AffectedAssetDto asset : affectedAssets) {
            double assetRisk = asset.failureProbabilityEstimate() * 100.0;
            if (assetRisk > maxRisk) {
                maxRisk = assetRisk;
            }
        }
        return roundToTwoDecimals(Math.min(100.0, Math.max(10.0, maxRisk * 0.85 + 15.0)));
    }

    private String generateSummary(SimulationRequestDto request, double energyJoules, List<HazardZoneDto> hazardZones, List<AffectedAssetDto> affectedAssets) {
        double tntEquivalentKg = energyJoules / JOULES_PER_KG_TNT;
        String sourceId = (request != null && request.incident() != null) ? request.incident().sourceAssetId() : "Source";

        double r70 = hazardZones.isEmpty() ? 0.0 : hazardZones.get(0).radiusMeters();
        double r20 = hazardZones.size() > 1 ? hazardZones.get(1).radiusMeters();

        return String.format(
                "Sedov-Taylor Blast Simulation at %s (%.0f kg TNT equivalent, Energy: %.2e J). Critical 70 kPa blast radius: %.1f m; 20 kPa radius: %.1f m. Total affected assets: %d.",
                sourceId, tntEquivalentKg, energyJoules, r70, r20, affectedAssets.size()
        );
    }

    private String degreesToCompass(double degrees) {
        String[] sectors = {"N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"};
        int index = (int) Math.round(((degrees % 360.0) / 22.5)) % 16;
        return sectors[index];
    }

    private double roundToTwoDecimals(double val) {
        if (Double.isNaN(val) || Double.isInfinite(val)) return 0.0;
        return Math.round(val * 100.0) / 100.0;
    }
}
