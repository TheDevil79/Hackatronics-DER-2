package com.safezone.service;

import com.safezone.dto.AffectedAssetDto;
import com.safezone.dto.ApproachDirectionDto;
import com.safezone.dto.AssetDto;
import com.safezone.dto.DominoStepDto;
import com.safezone.dto.EscapeRouteAssessmentDto;
import com.safezone.dto.HazardZoneDto;
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * =========================================================================================
 * SEDOV-TAYLOR BLAST SIMULATION ENGINE (With Wind-Aware Hazard Propagation)
 * =========================================================================================
 * <p>
 * Core physics coordinator that computes analytical Sedov-Taylor blast expansion and
 * point-source thermal radiation, coupled with directional wind modulation via {@link WindEffectModel}:
 * <ul>
 *   <li>Base Isotropic Physics: Sedov-Taylor self-similarity & Rankine-Hugoniot pressure jump</li>
 *   <li>Wind Effect: Directional elongation downwind (windOrigin + 180°) and contraction upwind</li>
 *   <li>Consequence Evaluation: {@link DamageAssessmentService}, {@link DominoAnalysisService}, {@link RouteAssessmentService}, {@link RiskAssessmentService}</li>
 * </ul>
 * </p>
 */
@Component
public class SedovTaylorSimulationEngine implements SimulationEngine {

    private static final Logger log = LoggerFactory.getLogger(SedovTaylorSimulationEngine.class);

    // Physics constants
    public static final double JOULES_PER_KG_TNT = 4.184e6;
    public static final double SPECIFIC_GAS_CONSTANT_AIR = 287.05; // J/(kg*K)
    public static final double KELVIN_OFFSET = 273.15;
    public static final double HEAT_OF_COMBUSTION_LPG = 46.0e6; // J/kg
    public static final double RADIATIVE_FRACTION = 0.25;

    private final double gamma;
    private final double xi;
    private final int numPolygonPoints;
    private final double thresholdCriticalKPa;
    private final double thresholdHighKPa;
    private final double thresholdModerateKPa;

    private final DamageAssessmentService damageAssessmentService;
    private final DominoAnalysisService dominoAnalysisService;
    private final RouteAssessmentService routeAssessmentService;
    private final RiskAssessmentService riskAssessmentService;
    private final WindEffectModel windEffectModel;

    public SedovTaylorSimulationEngine(
            @Value("${simulation.sedov.gamma:1.4}") double gamma,
            @Value("${simulation.sedov.xi:1.033}") double xi,
            @Value("${simulation.sedov.polygon-points:36}") int numPolygonPoints,
            @Value("${simulation.sedov.threshold.critical-kpa:70.0}") double thresholdCriticalKPa,
            @Value("${simulation.sedov.threshold.high-kpa:20.0}") double thresholdHighKPa,
            @Value("${simulation.sedov.threshold.moderate-kpa:5.0}") double thresholdModerateKPa,
            DamageAssessmentService damageAssessmentService,
            DominoAnalysisService dominoAnalysisService,
            RouteAssessmentService routeAssessmentService,
            RiskAssessmentService riskAssessmentService,
            WindEffectModel windEffectModel
    ) {
        this.gamma = gamma;
        this.xi = xi;
        this.numPolygonPoints = numPolygonPoints > 2 ? numPolygonPoints : 36;
        this.thresholdCriticalKPa = thresholdCriticalKPa;
        this.thresholdHighKPa = thresholdHighKPa;
        this.thresholdModerateKPa = thresholdModerateKPa;

        this.damageAssessmentService = damageAssessmentService;
        this.dominoAnalysisService = dominoAnalysisService;
        this.routeAssessmentService = routeAssessmentService;
        this.riskAssessmentService = riskAssessmentService;
        this.windEffectModel = windEffectModel;

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

        // 3. Extract Wind Parameters
        double windSpeedMps = 0.0;
        double windDirDegrees = 0.0;
        if (request != null && request.wind() != null) {
            windSpeedMps = Math.max(0.0, request.wind().speedMps());
            windDirDegrees = ((request.wind().directionDegreesFromNorth() % 360.0) + 360.0) % 360.0;
        }

        // 4. Identify Incident Epicenter
        Position3DDto epicenter = findEpicenter(request);

        // 5. Calculate Wind-Modulated Blast Hazard Zones (70 kPa, 20 kPa, 5 kPa)
        List<HazardZoneDto> hazardZones = calculateBlastHazardZones(energyJoules, airDensity, epicenter, windSpeedMps, windDirDegrees);

        // 6. Directional Physics Exposure Provider (Overpressure & Point-Source Thermal Flux)
        double fuelMassKg = (request != null && request.incident() != null && request.incident().parameters() != null && request.incident().parameters().fuelMassKg() != null)
                ? request.incident().parameters().fuelMassKg() : 0.0;
        double releaseDurationSeconds = (request != null && request.incident() != null && request.incident().parameters() != null && request.incident().parameters().releaseDurationSeconds() != null)
                ? request.incident().parameters().releaseDurationSeconds() : 45.0;

        final double finalWindSpeed = windSpeedMps;
        final double finalWindDir = windDirDegrees;

        DamageAssessmentService.PhysicalExposureProvider exposureProvider = new DamageAssessmentService.PhysicalExposureProvider() {
            @Override
            public double getPeakOverpressureKPa(double distanceMeters) {
                return calculatePeakOverpressureKPa(distanceMeters, energyJoules, airDensity);
            }

            @Override
            public double getPeakOverpressureKPa(double distanceMeters, double bearingDegrees) {
                double effDist = calculateEffectiveDistance(distanceMeters, bearingDegrees, finalWindSpeed, finalWindDir);
                return calculatePeakOverpressureKPa(effDist, energyJoules, airDensity);
            }

            @Override
            public double getPeakThermalRadiationKwM2(double distanceMeters) {
                return calculatePeakThermalFluxKwM2(distanceMeters, fuelMassKg, releaseDurationSeconds);
            }

            @Override
            public double getPeakThermalRadiationKwM2(double distanceMeters, double bearingDegrees) {
                double effDist = calculateEffectiveDistance(distanceMeters, bearingDegrees, finalWindSpeed, finalWindDir);
                return calculatePeakThermalFluxKwM2(effDist, fuelMassKg, releaseDurationSeconds);
            }
        };

        // 7. Consequence Layer: Damage Assessment
        String sourceAssetId = (request != null && request.incident() != null) ? request.incident().sourceAssetId() : null;
        List<AssetDto> assets = (request != null && request.facility() != null) ? request.facility().assets() : List.of();
        List<AffectedAssetDto> affectedAssets = damageAssessmentService.assessAllAssets(
                assets, sourceAssetId, epicenter.x(), epicenter.y(), exposureProvider
        );

        // 8. Consequence Layer: Domino Propagation with Wind Context
        Map<String, String> assetOrientations = new HashMap<>();
        for (AssetDto asset : assets) {
            if (asset != null && asset.position() != null) {
                double bearing = windEffectModel.calculateBearingDegrees(epicenter.x(), epicenter.y(), asset.position().x(), asset.position().y());
                String orientation = windEffectModel.getWindOrientationCategory(bearing, finalWindDir);
                assetOrientations.put(asset.assetId(), orientation);
            }
        }
        DominoAnalysisService.WindContext windContext = new DominoAnalysisService.WindContext(
                finalWindSpeed > 0.0, finalWindSpeed, finalWindDir, assetOrientations
        );

        DominoAnalysisService.PropagationTimeSolver timeSolver = distance -> calculateArrivalTimeSeconds(distance, energyJoules, airDensity);
        List<DominoStepDto> dominoPropagation = dominoAnalysisService.evaluateDominoChain(
                request != null ? request.incident() : null, affectedAssets, timeSolver, windContext
        );

        // 9. Consequence Layer: Escape Route Assessment
        List<EscapeRouteAssessmentDto> escapeRoutesAssessment = routeAssessmentService.assessRoutes(
                (request != null && request.facility() != null) ? request.facility().escapeRoutes() : List.of(),
                epicenter.x(), epicenter.y(), exposureProvider
        );

        // 10. Determine Recommended Approach Direction
        ApproachDirectionDto recommendedApproachDirection = calculateApproachDirection(request);

        // 11. Consequence Layer: Comprehensive Risk & Severity Assessment
        RiskAssessmentService.RiskEvaluation riskEval = riskAssessmentService.evaluateRisk(
                affectedAssets, dominoPropagation, escapeRoutesAssessment
        );
        String overallSeverity = riskEval.overallSeverity();
        double overallRiskScore = riskEval.overallRiskScore();
        String summary = generateSummary(request, energyJoules, hazardZones, affectedAssets, windSpeedMps, windDirDegrees);

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
            Double fuelMassKg = request.incident().parameters().fuelMassKg();
            if (fuelMassKg != null && fuelMassKg > 0) {
                double genericYield = 0.10; // 10% blast yield
                return fuelMassKg * HEAT_OF_COMBUSTION_LPG * genericYield;
            }
        }
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
     * Computes the effective isotropic distance experienced by an asset at a given bearing.
     */
    public double calculateEffectiveDistance(double distanceMeters, double bearingDegrees, double windSpeedMps, double windDirDegrees) {
        if (distanceMeters <= 0.0) return 0.0;
        double factor = windEffectModel.calculateDirectionalWindFactor(bearingDegrees, windSpeedMps, windDirDegrees);
        if (factor <= 0.0 || Double.isNaN(factor)) factor = 1.0;
        return distanceMeters / factor;
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
            return 500.0; // Epicenter bound
        }
        double numerator = 8.0 * Math.pow(xi, 5.0) * energyJoules;
        double denominator = 25.0 * (gamma + 1.0) * Math.pow(distanceMeters, 3.0);
        double overpressurePa = numerator / denominator;
        return overpressurePa / 1000.0;
    }

    /**
     * Solves for peak thermal radiation flux in kW/m^2 using point-source radiation.
     */
    public double calculatePeakThermalFluxKwM2(double distanceMeters, double fuelMassKg, double releaseDurationSeconds) {
        if (fuelMassKg <= 0 || distanceMeters <= 0.001) {
            return distanceMeters <= 0.001 ? 120.0 : 0.0;
        }
        double duration = Math.max(1.0, releaseDurationSeconds);
        double burnRateKgS = fuelMassKg / duration;
        double totalThermalPowerWatts = burnRateKgS * HEAT_OF_COMBUSTION_LPG * RADIATIVE_FRACTION;
        double fluxWattsM2 = totalThermalPowerWatts / (4.0 * Math.PI * Math.pow(distanceMeters, 2.0));
        return Math.min(150.0, fluxWattsM2 / 1000.0);
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

    public List<HazardZoneDto> calculateBlastHazardZones(
            double energyJoules,
            double airDensity,
            Position3DDto epicenter,
            double windSpeedMps,
            double windDirDegrees
    ) {
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
                generateWindDependentPolygon(epicenter.x(), epicenter.y(), r70, numPolygonPoints, windSpeedMps, windDirDegrees),
                "Sedov-Taylor Blast Zone: Total structural destruction, heavy equipment displacement, near-100% human lethality."
        ));

        zones.add(new HazardZoneDto(
                "ZONE-BLAST-" + (int) thresholdHighKPa + "KPA",
                "BLAST",
                thresholdHighKPa,
                "kPa",
                "HIGH",
                roundToTwoDecimals(r20),
                generateWindDependentPolygon(epicenter.x(), epicenter.y(), r20, numPolygonPoints, windSpeedMps, windDirDegrees),
                "Sedov-Taylor Blast Zone: Moderate to severe structural damage, distortion of steel equipment frames, wall collapse."
        ));

        zones.add(new HazardZoneDto(
                "ZONE-BLAST-" + (int) thresholdModerateKPa + "KPA",
                "BLAST",
                thresholdModerateKPa,
                "kPa",
                "MODERATE",
                roundToTwoDecimals(r5),
                generateWindDependentPolygon(epicenter.x(), epicenter.y(), r5, numPolygonPoints, windSpeedMps, windDirDegrees),
                "Sedov-Taylor Blast Zone: Minor damage, window and partition failure, glass projectile hazard to personnel."
        ));

        return zones;
    }

    private List<Point2D> generateWindDependentPolygon(
            double centerX,
            double centerY,
            double baseRadiusMeters,
            int numPoints,
            double windSpeedMps,
            double windDirDegrees
    ) {
        List<Point2D> polygon = new ArrayList<>();
        double angleStep = (2.0 * Math.PI) / numPoints;

        for (int i = 0; i < numPoints; i++) {
            double thetaRad = i * angleStep;
            double thetaDeg = (Math.toDegrees(thetaRad) + 360.0) % 360.0;

            double directionalFactor = windEffectModel.calculateDirectionalWindFactor(thetaDeg, windSpeedMps, windDirDegrees);
            double radius = baseRadiusMeters * directionalFactor;

            // In local Cartesian coordinates:
            // 0° = North, 90° = East, 180° = South, 270° = West
            // x (East-West) = centerX + radius * sin(theta)
            // y (North-South) = centerY + radius * cos(theta)
            double x = centerX + radius * Math.sin(thetaRad);
            double y = centerY + radius * Math.cos(thetaRad);

            polygon.add(new Point2D(roundToTwoDecimals(x), roundToTwoDecimals(y)));
        }

        return polygon;
    }

    private ApproachDirectionDto calculateApproachDirection(SimulationRequestDto request) {
        double windFromNorth = 0.0;
        if (request != null && request.wind() != null) {
            windFromNorth = request.wind().directionDegreesFromNorth();
        }

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

    private String generateSummary(
            SimulationRequestDto request,
            double energyJoules,
            List<HazardZoneDto> hazardZones,
            List<AffectedAssetDto> affectedAssets,
            double windSpeedMps,
            double windDirDegrees
    ) {
        double tntEquivalentKg = energyJoules / JOULES_PER_KG_TNT;
        String sourceId = (request != null && request.incident() != null) ? request.incident().sourceAssetId() : "Source";

        double r70 = hazardZones.isEmpty() ? 0.0 : hazardZones.get(0).radiusMeters();
        double r20 = hazardZones.size() > 1 ? hazardZones.get(1).radiusMeters() : 0.0;

        String windText;
        if (windSpeedMps > 0.0) {
            double downwindDir = windEffectModel.calculateDownwindDirection(windDirDegrees);
            double maxAmplification = windEffectModel.calculateDirectionalWindFactor(downwindDir, windSpeedMps, windDirDegrees);
            windText = String.format(" Wind-aware directional propagation active (Wind: %.1f m/s from %.0f° [%s], downwind axis: %.0f°, max amplification: %.2fx).",
                    windSpeedMps, windDirDegrees, degreesToCompass(windDirDegrees), downwindDir, maxAmplification);
        } else {
            windText = " Calm atmospheric conditions (isotropic propagation).";
        }

        return String.format(
                "Sedov-Taylor Blast Simulation at %s (%.0f kg TNT equivalent, Energy: %.2e J). Critical 70 kPa blast radius: %.1f m; 20 kPa radius: %.1f m. Total affected assets: %d.%s",
                sourceId, tntEquivalentKg, energyJoules, r70, r20, affectedAssets.size(), windText
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
