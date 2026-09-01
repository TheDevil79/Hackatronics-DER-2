package com.safezone.service;

import com.safezone.client.PythonPhysicsClient;
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
import com.safezone.dto.python.PythonAssetExposureDto;
import com.safezone.dto.python.PythonAssetPositionDto;
import com.safezone.dto.python.PythonHazardZoneDto;
import com.safezone.dto.python.PythonPhysicsRequestDto;
import com.safezone.dto.python.PythonPhysicsResponseDto;
import com.safezone.exception.PhysicsEngineException;
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
import java.util.stream.Collectors;

/**
 * =========================================================================================
 * PYTHON SEDOV-TAYLOR SIMULATION ENGINE (With Wind-Aware Blast Propagation)
 * =========================================================================================
 * <p>
 * Delegates physical blast wave propagation and directional wind modulation to the
 * external Python FastAPI physics microservice, while preserving Java-side authoritative
 * consequence modeling (damage assessment, domino cascade analysis, escape route ratings,
 * and multi-hazard risk scoring).
 * </p>
 * <p>
 * <b>Fallback Architecture:</b>
 * If the Python service is unavailable and fallback is enabled, gracefully delegates
 * to {@link SedovTaylorSimulationEngine} with explicit warning logging.
 * </p>
 */
@Component
public class PythonSedovSimulationEngine implements SimulationEngine {

    private static final Logger log = LoggerFactory.getLogger(PythonSedovSimulationEngine.class);

    public static final double JOULES_PER_KG_TNT = 4.184e6;
    public static final double SPECIFIC_GAS_CONSTANT_AIR = 287.05;
    public static final double KELVIN_OFFSET = 273.15;
    public static final double HEAT_OF_COMBUSTION_LPG = 46.0e6;
    public static final double RADIATIVE_FRACTION = 0.25;

    private final PythonPhysicsClient pythonClient;
    private final SedovTaylorSimulationEngine fallbackJavaEngine;
    private final DamageAssessmentService damageAssessmentService;
    private final DominoAnalysisService dominoAnalysisService;
    private final RouteAssessmentService routeAssessmentService;
    private final RiskAssessmentService riskAssessmentService;
    private final WindEffectModel windEffectModel;

    private final double gamma;
    private final double xi;

    public PythonSedovSimulationEngine(
            PythonPhysicsClient pythonClient,
            SedovTaylorSimulationEngine fallbackJavaEngine,
            DamageAssessmentService damageAssessmentService,
            DominoAnalysisService dominoAnalysisService,
            RouteAssessmentService routeAssessmentService,
            RiskAssessmentService riskAssessmentService,
            WindEffectModel windEffectModel,
            @Value("${simulation.sedov.gamma:1.4}") double gamma,
            @Value("${simulation.sedov.xi:1.033}") double xi
    ) {
        this.pythonClient = pythonClient;
        this.fallbackJavaEngine = fallbackJavaEngine;
        this.damageAssessmentService = damageAssessmentService;
        this.dominoAnalysisService = dominoAnalysisService;
        this.routeAssessmentService = routeAssessmentService;
        this.riskAssessmentService = riskAssessmentService;
        this.windEffectModel = windEffectModel;
        this.gamma = gamma;
        this.xi = xi;

        log.info("Initialized PythonSedovSimulationEngine (gamma={}, xi={})", gamma, xi);
    }

    @Override
    public SimulationResponseDto simulate(SimulationRequestDto request) {
        long startTime = System.nanoTime();

        String requestId = (request != null && request.requestId() != null && !request.requestId().isBlank())
                ? request.requestId()
                : "req-" + UUID.randomUUID();

        // 1. Calculate Physical Input Parameters
        double energyJoules = calculateExplosionEnergyJoules(request);
        double airDensity = calculateAirDensityKgM3(request);
        double ambientPressurePa = extractAmbientPressurePa(request);
        double tempC = extractTemperatureCelsius(request);

        double windSpeedMps = 0.0;
        double windDirDegrees = 0.0;
        if (request != null && request.wind() != null) {
            windSpeedMps = Math.max(0.0, request.wind().speedMps());
            windDirDegrees = ((request.wind().directionDegreesFromNorth() % 360.0) + 360.0) % 360.0;
        }
        double windSpeedKmh = windSpeedMps * 3.6;

        Position3DDto epicenter = findEpicenter(request);

        List<AssetDto> assets = (request != null && request.facility() != null && request.facility().assets() != null)
                ? request.facility().assets()
                : List.of();

        List<PythonAssetPositionDto> assetPositions = assets.stream()
                .filter(a -> a != null && a.position() != null)
                .map(a -> new PythonAssetPositionDto(
                        a.assetId(),
                        a.position().x(),
                        a.position().y(),
                        a.position().z()
                ))
                .collect(Collectors.toList());

        PythonPhysicsRequestDto pyRequest = new PythonPhysicsRequestDto(
            energyJoules,
            windSpeedKmh,
            windDirDegrees,
            epicenter,
            10.0,
            0.1,
            airDensity,
            ambientPressurePa,
            gamma,
            xi,
            tempC,
            assetPositions
        );

        // 2. Execute Python Physics or Graceful Fallback
        PythonPhysicsResponseDto pyResponse = null;
        try {
            pyResponse = pythonClient.simulate(pyRequest);
        } catch (PhysicsEngineException ex) {
            if (pythonClient.isFallbackToJava()) {
                log.warn("Python Sedov engine unavailable; falling back to Java Sedov engine. Reason: {}", ex.getMessage());
                return fallbackJavaEngine.simulate(request);
            }
            throw ex;
        }

        // 3. Process Python Hazard Zones
        List<HazardZoneDto> hazardZones = mapHazardZones(pyResponse, epicenter, energyJoules, airDensity, windSpeedMps, windDirDegrees);

        // 4. Consequence Layer: Physical Exposure Provider using Python Results
        final Map<String, Double> assetOverpressures = new HashMap<>();
        if (pyResponse != null && pyResponse.assetExposures() != null) {
            for (PythonAssetExposureDto exp : pyResponse.assetExposures()) {
                assetOverpressures.put(exp.assetId(), exp.overpressureKpa());
            }
        }

        double fuelMassKg = (request != null && request.incident() != null && request.incident().parameters() != null && request.incident().parameters().fuelMassKg() != null)
                ? request.incident().parameters().fuelMassKg() : 0.0;
        double releaseDurationSeconds = (request != null && request.incident() != null && request.incident().parameters() != null && request.incident().parameters().releaseDurationSeconds() != null)
                ? request.incident().parameters().releaseDurationSeconds() : 45.0;

        final double finalWindSpeed = windSpeedMps;
        final double finalWindDir = windDirDegrees;

        DamageAssessmentService.PhysicalExposureProvider exposureProvider = new DamageAssessmentService.PhysicalExposureProvider() {
            @Override
            public double getPeakOverpressureKPa(double distanceMeters) {
                return fallbackJavaEngine.calculatePeakOverpressureKPa(distanceMeters, energyJoules, airDensity);
            }

            @Override
            public double getPeakOverpressureKPa(double distanceMeters, double bearingDegrees) {
                double effDist = fallbackJavaEngine.calculateEffectiveDistance(distanceMeters, bearingDegrees, finalWindSpeed, finalWindDir);
                return fallbackJavaEngine.calculatePeakOverpressureKPa(effDist, energyJoules, airDensity);
            }

            @Override
            public double getPeakThermalRadiationKwM2(double distanceMeters) {
                return fallbackJavaEngine.calculatePeakThermalFluxKwM2(distanceMeters, fuelMassKg, releaseDurationSeconds);
            }

            @Override
            public double getPeakThermalRadiationKwM2(double distanceMeters, double bearingDegrees) {
                double effDist = fallbackJavaEngine.calculateEffectiveDistance(distanceMeters, bearingDegrees, finalWindSpeed, finalWindDir);
                return fallbackJavaEngine.calculatePeakThermalFluxKwM2(effDist, fuelMassKg, releaseDurationSeconds);
            }
        };

        // 5. Consequence Layer: Authoritative Java Damage Assessment using Python directional overpressures
        String sourceAssetId = (request != null && request.incident() != null) ? request.incident().sourceAssetId() : null;
        List<AffectedAssetDto> affectedAssets = new ArrayList<>();

        for (AssetDto asset : assets) {
            if (asset == null) continue;

            double assetX = (asset.position() != null) ? asset.position().x() : 0.0;
            double assetY = (asset.position() != null) ? asset.position().y() : 0.0;
            double dx = assetX - epicenter.x();
            double dy = assetY - epicenter.y();
            double distanceMeters = Math.hypot(dx, dy);
            double bearingDegrees = windEffectModel.calculateBearingDegrees(epicenter.x(), epicenter.y(), assetX, assetY);

            boolean isSourceAsset = sourceAssetId != null && sourceAssetId.equals(asset.assetId());

            Double pyOverpressure = assetOverpressures.get(asset.assetId());
            double overpressureKPa = (pyOverpressure != null && pyOverpressure > 0.0)
                    ? pyOverpressure
                    : exposureProvider.getPeakOverpressureKPa(distanceMeters, bearingDegrees);

            double thermalFluxKwM2 = exposureProvider.getPeakThermalRadiationKwM2(distanceMeters, bearingDegrees);

            AffectedAssetDto assessed = damageAssessmentService.assessAsset(
                    asset, isSourceAsset, distanceMeters, overpressureKPa, thermalFluxKwM2
            );
            affectedAssets.add(assessed);
        }

        affectedAssets.sort((a1, a2) -> Double.compare(a1.distanceMeters(), a2.distanceMeters()));

        // 6. Consequence Layer: Domino Propagation
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

        DominoAnalysisService.PropagationTimeSolver timeSolver = distance -> fallbackJavaEngine.calculateArrivalTimeSeconds(distance, energyJoules, airDensity);
        List<DominoStepDto> dominoPropagation = dominoAnalysisService.evaluateDominoChain(
                request != null ? request.incident() : null, affectedAssets, timeSolver, windContext
        );

        // 7. Consequence Layer: Escape Route Assessment
        List<EscapeRouteAssessmentDto> escapeRoutesAssessment = routeAssessmentService.assessRoutes(
                (request != null && request.facility() != null) ? request.facility().escapeRoutes() : List.of(),
                epicenter.x(), epicenter.y(), exposureProvider
        );

        // 8. Recommended Approach Direction
        ApproachDirectionDto recommendedApproachDirection = calculateApproachDirection(request);

        // 9. Multi-Hazard Risk Scoring
        RiskAssessmentService.RiskEvaluation riskEval = riskAssessmentService.evaluateRisk(
                affectedAssets, dominoPropagation, escapeRoutesAssessment
        );

        double executionTimeMs = (System.nanoTime() - startTime) / 1_000_000.0;
        String simulationId = "sim-python-" + Instant.now().toEpochMilli() + "-" + UUID.randomUUID().toString().substring(0, 8);
        String timestamp = Instant.now().toString();

        String summary = generateSummary(request, energyJoules, hazardZones, affectedAssets, windSpeedKmh, windDirDegrees);

        return new SimulationResponseDto(
                simulationId,
                requestId,
                timestamp,
                executionTimeMs,
                riskEval.overallSeverity(),
                riskEval.overallRiskScore(),
                summary,
                hazardZones,
                affectedAssets,
                dominoPropagation,
                escapeRoutesAssessment,
                recommendedApproachDirection
        );
    }

    private List<HazardZoneDto> mapHazardZones(
            PythonPhysicsResponseDto pyResponse,
            Position3DDto epicenter,
            double energyJoules,
            double airDensity,
            double windSpeedMps,
            double windDirDegrees
    ) {
        if (pyResponse != null && pyResponse.hazardZones() != null && !pyResponse.hazardZones().isEmpty()) {
            List<HazardZoneDto> zones = new ArrayList<>();
            for (PythonHazardZoneDto pz : pyResponse.hazardZones()) {
                String severity = pz.thresholdKpa() >= 70.0 ? "CRITICAL"
                        : pz.thresholdKpa() >= 20.0 ? "HIGH" : "MODERATE";

                String zoneId = "ZONE-BLAST-" + (int) pz.thresholdKpa() + "KPA";
                String desc = switch (severity) {
                    case "CRITICAL" -> "Python Wind-Aware Sedov Blast Zone: Total structural destruction, heavy equipment displacement.";
                    case "HIGH" -> "Python Wind-Aware Sedov Blast Zone: Moderate to severe structural damage, steel frame deformation.";
                    default -> "Python Wind-Aware Sedov Blast Zone: Minor damage, window failure, projectile hazard.";
                };

                zones.add(new HazardZoneDto(
                        zoneId,
                        "BLAST",
                        pz.thresholdKpa(),
                        "kPa",
                        severity,
                        pz.radiusMeters(),
                        pz.polygonCoordinates(),
                        desc
                ));
            }
            return zones;
        }

        // Fallback to Java hazard zone generator
        return fallbackJavaEngine.calculateBlastHazardZones(energyJoules, airDensity, epicenter, windSpeedMps, windDirDegrees);
    }

    private double calculateExplosionEnergyJoules(SimulationRequestDto request) {
        if (request != null && request.incident() != null && request.incident().parameters() != null) {
            Double tntMassKg = request.incident().parameters().tntEquivalentMassKg();
            if (tntMassKg != null && tntMassKg > 0) {
                return tntMassKg * JOULES_PER_KG_TNT;
            }
            Double fuelMassKg = request.incident().parameters().fuelMassKg();
            if (fuelMassKg != null && fuelMassKg > 0) {
                return fuelMassKg * HEAT_OF_COMBUSTION_LPG * 0.10;
            }
        }
        return 100.0 * JOULES_PER_KG_TNT;
    }

    private double calculateAirDensityKgM3(SimulationRequestDto request) {
        double tempC = extractTemperatureCelsius(request);
        double pressurePa = extractAmbientPressurePa(request);
        double tempK = tempC + KELVIN_OFFSET;
        return pressurePa / (SPECIFIC_GAS_CONSTANT_AIR * tempK);
    }

    private double extractTemperatureCelsius(SimulationRequestDto request) {
        if (request != null && request.environment() != null && request.environment().ambientTemperatureC() != null) {
            return request.environment().ambientTemperatureC();
        }
        return 25.0;
    }

    private double extractAmbientPressurePa(SimulationRequestDto request) {
        if (request != null && request.environment() != null && request.environment().atmosphericPressureKPa() != null) {
            return request.environment().atmosphericPressureKPa() * 1000.0;
        }
        return 101325.0;
    }

    private Position3DDto findEpicenter(SimulationRequestDto request) {
        if (request != null && request.facility() != null && request.facility().assets() != null && request.incident() != null) {
            String sourceAssetId = request.incident().sourceAssetId();
            for (AssetDto asset : request.facility().assets()) {
                if (asset != null && sourceAssetId != null && sourceAssetId.equals(asset.assetId()) && asset.position() != null) {
                    return asset.position();
                }
            }
        }
        return new Position3DDto(0.0, 0.0, 0.0);
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

    private double roundToTwoDecimals(double value) {
        if (Double.isNaN(value) || Double.isInfinite(value)) return 0.0;
        return Math.round(value * 100.0) / 100.0;
    }

    private String degreesToCompass(double degrees) {
        String[] sectors = {"N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
                            "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"};
        int index = (int) Math.round(((degrees % 360.0) / 22.5)) % 16;
        return sectors[index];
    }

    private String generateSummary(
            SimulationRequestDto request,
            double energyJoules,
            List<HazardZoneDto> hazardZones,
            List<AffectedAssetDto> affectedAssets,
            double windSpeedKmh,
            double windDirDegrees
    ) {
        long impacted = affectedAssets.stream()
                .filter(a -> !"NO_SIGNIFICANT_DAMAGE".equals(a.damageState()))
                .count();

        return String.format(
                "Python Sedov-Taylor wind-aware blast propagation completed. Energy: %.2e J, Wind: %.1f km/h @ %.0f°. " +
                "Generated %d hazard zones, %d assets evaluated (%d compromised). " +
                "Disclaimer: Educational demonstrator only - not an engineering safety calculator.",
                energyJoules, windSpeedKmh, windDirDegrees, hazardZones.size(), affectedAssets.size(), impacted
        );
    }
}
