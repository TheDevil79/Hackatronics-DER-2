package com.safezone.service;

import com.safezone.dto.AffectedAssetDto;
import com.safezone.dto.AssetDto;
import com.safezone.dto.TankPropertiesDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * =========================================================================================
 * CONSEQUENCE LAYER: DamageAssessmentService
 * =========================================================================================
 * <p>
 * Consumes physical quantities (blast overpressure in kPa, thermal radiation flux in kW/m^2,
 * asset properties, containment dikes, operating pressures, and fill levels) to deterministically assess:
 * <ul>
 *   <li>Structural Damage State (INTACT, MINOR_DAMAGE, STRUCTURAL_DAMAGE, TOTAL_LOSS)</li>
 *   <li>Failure Probability Estimate in [0.0, 1.0]</li>
 *   <li>Estimated Time to Rupture in seconds (or null if below critical threshold)</li>
 *   <li>Explainable Damage Summary</li>
 * </ul>
 * </p>
 */
@Service
public class DamageAssessmentService {

    private static final Logger log = LoggerFactory.getLogger(DamageAssessmentService.class);

    private final double overpressureTotalLossKPa;
    private final double overpressureStructuralDamageKPa;
    private final double overpressureMinorDamageKPa;

    private final double thermalTotalLossKwM2;
    private final double thermalStructuralDamageKwM2;
    private final double thermalMinorDamageKwM2;

    public DamageAssessmentService(
            @Value("${simulation.damage.overpressure.total-loss-kpa:70.0}") double overpressureTotalLossKPa,
            @Value("${simulation.damage.overpressure.structural-damage-kpa:20.0}") double overpressureStructuralDamageKPa,
            @Value("${simulation.damage.overpressure.minor-damage-kpa:5.0}") double overpressureMinorDamageKPa,
            @Value("${simulation.damage.thermal.total-loss-kw-m2:37.5}") double thermalTotalLossKwM2,
            @Value("${simulation.damage.thermal.structural-damage-kw-m2:12.5}") double thermalStructuralDamageKwM2,
            @Value("${simulation.damage.thermal.minor-damage-kw-m2:4.0}") double thermalMinorDamageKwM2
    ) {
        this.overpressureTotalLossKPa = overpressureTotalLossKPa;
        this.overpressureStructuralDamageKPa = overpressureStructuralDamageKPa;
        this.overpressureMinorDamageKPa = overpressureMinorDamageKPa;
        this.thermalTotalLossKwM2 = thermalTotalLossKwM2;
        this.thermalStructuralDamageKwM2 = thermalStructuralDamageKwM2;
        this.thermalMinorDamageKwM2 = thermalMinorDamageKwM2;

        log.info("Initialized DamageAssessmentService (Overpressure: [{}, {}, {}] kPa, Thermal: [{}, {}, {}] kW/m²)",
                overpressureTotalLossKPa, overpressureStructuralDamageKPa, overpressureMinorDamageKPa,
                thermalTotalLossKwM2, thermalStructuralDamageKwM2, thermalMinorDamageKwM2);
    }

    /**
     * Evaluates damage state, failure probability, and estimated rupture time for a single asset.
     */
    public AffectedAssetDto assessAsset(
            AssetDto asset,
            boolean isSourceAsset,
            double distanceMeters,
            double peakOverpressureKPa,
            double peakThermalFluxKwM2
    ) {
        if (asset == null) {
            throw new IllegalArgumentException("AssetDto must not be null");
        }

        String assetId = asset.assetId();
        String assetName = asset.name() != null ? asset.name() : assetId;

        // Primary epicenter handling
        if (isSourceAsset || distanceMeters < 1.0) {
            return new AffectedAssetDto(
                    assetId,
                    assetName,
                    0.0,
                    roundToTwoDecimals(peakThermalFluxKwM2),
                    roundToTwoDecimals(Math.max(peakOverpressureKPa, 500.0)),
                    "TOTAL_LOSS",
                    1.0,
                    0.0,
                    "Primary explosion epicenter. Catastrophic structural detonation and complete vessel breach."
            );
        }

        // 1. Asset Property Factors (Containment Dike, Fill Level, Operating Pressure)
        double vulnerabilityMultiplier = calculateAssetVulnerabilityFactor(asset.tankProperties());
        double effectiveOverpressure = peakOverpressureKPa * vulnerabilityMultiplier;
        double effectiveThermal = peakThermalFluxKwM2 * vulnerabilityMultiplier;

        // 2. Calculate Normalized Combined Exposure Index
        double normalizedPressure = effectiveOverpressure / overpressureTotalLossKPa;
        double normalizedThermal = effectiveThermal / thermalTotalLossKwM2;
        double combinedExposureIndex = Math.max(normalizedPressure, Math.max(normalizedThermal, Math.hypot(normalizedPressure, normalizedThermal * 0.7)));

        // 3. Classify Damage State
        String damageState = classifyDamageState(effectiveOverpressure, effectiveThermal);

        // 4. Deterministic Failure Probability Model in [0.0, 1.0]
        double failureProbability = calculateFailureProbability(combinedExposureIndex, damageState);

        // 5. Estimate Time to Rupture
        Double estimatedTimeToRupture = estimateTimeToRupture(combinedExposureIndex, failureProbability, effectiveOverpressure, effectiveThermal);

        // 6. Generate Explainable Damage Summary
        String damageSummary = generateDamageSummary(damageState, peakOverpressureKPa, peakThermalFluxKwM2, failureProbability, estimatedTimeToRupture);

        return new AffectedAssetDto(
                assetId,
                assetName,
                roundToTwoDecimals(distanceMeters),
                roundToTwoDecimals(peakThermalFluxKwM2),
                roundToTwoDecimals(peakOverpressureKPa),
                damageState,
                roundToTwoDecimals(failureProbability),
                estimatedTimeToRupture != null ? roundToTwoDecimals(estimatedTimeToRupture) : null,
                damageSummary
        );
    }

    /**
     * Assesses all assets in the facility and orders them by distance from the epicenter.
     * Passes directional bearing from epicenter to the PhysicalExposureProvider to evaluate wind effects.
     */
    public List<AffectedAssetDto> assessAllAssets(
            List<AssetDto> assets,
            String sourceAssetId,
            double epicenterX,
            double epicenterY,
            PhysicalExposureProvider exposureProvider
    ) {
        List<AffectedAssetDto> affectedList = new ArrayList<>();
        if (assets == null) return affectedList;

        for (AssetDto asset : assets) {
            if (asset == null) continue;

            double assetX = (asset.position() != null) ? asset.position().x() : 0.0;
            double assetY = (asset.position() != null) ? asset.position().y() : 0.0;
            double dx = assetX - epicenterX;
            double dy = assetY - epicenterY;
            double distance = Math.hypot(dx, dy);
            double bearingDegrees = (Math.toDegrees(Math.atan2(dx, dy)) + 360.0) % 360.0;

            boolean isSource = asset.assetId() != null && asset.assetId().equals(sourceAssetId);

            double overpressure = exposureProvider.getPeakOverpressureKPa(distance, bearingDegrees);
            double thermalFlux = exposureProvider.getPeakThermalRadiationKwM2(distance, bearingDegrees);

            AffectedAssetDto affected = assessAsset(asset, isSource, distance, overpressure, thermalFlux);
            affectedList.add(affected);
        }

        affectedList.sort(Comparator.comparingDouble(AffectedAssetDto::distanceMeters));
        return affectedList;
    }

    public double calculateAssetVulnerabilityFactor(TankPropertiesDto tankProperties) {
        if (tankProperties == null) {
            return 1.0;
        }
        double factor = 1.0;
        // Dike containment provides ~10% physical mitigation
        if (tankProperties.containmentDike() != null && tankProperties.containmentDike()) {
            factor *= 0.90;
        }
        // High fill level increases hydraulic ram effect and BLEVE liquid mass
        if (tankProperties.fillLevelPercentage() != null && tankProperties.fillLevelPercentage() > 70.0) {
            factor *= 1.08;
        }
        // High operating pressure increases hoop stress
        if (tankProperties.operatingPressureBar() != null && tankProperties.operatingPressureBar() > 8.0) {
            factor *= 1.05;
        }
        return factor;
    }

    public String classifyDamageState(double overpressureKPa, double thermalKwM2) {
        if (overpressureKPa >= overpressureTotalLossKPa || thermalKwM2 >= thermalTotalLossKwM2) {
            return "TOTAL_LOSS";
        }
        if (overpressureKPa >= overpressureStructuralDamageKPa || thermalKwM2 >= thermalStructuralDamageKwM2) {
            return "STRUCTURAL_DAMAGE";
        }
        if (overpressureKPa >= overpressureMinorDamageKPa || thermalKwM2 >= thermalMinorDamageKwM2) {
            return "MINOR_DAMAGE";
        }
        return "INTACT";
    }

    public double calculateFailureProbability(double combinedExposureIndex, String damageState) {
        if ("TOTAL_LOSS".equals(damageState) || combinedExposureIndex >= 1.0) {
            return Math.min(1.0, 0.75 + 0.25 * (1.0 - Math.exp(-(combinedExposureIndex - 1.0) * 1.5)));
        }
        if ("STRUCTURAL_DAMAGE".equals(damageState)) {
            double norm = Math.max(0.0, Math.min(1.0, (combinedExposureIndex - 0.28) / (1.0 - 0.28)));
            return 0.30 + (0.44 * norm);
        }
        if ("MINOR_DAMAGE".equals(damageState)) {
            double norm = Math.max(0.0, Math.min(1.0, (combinedExposureIndex - 0.07) / (0.28 - 0.07)));
            return 0.03 + (0.26 * norm);
        }
        return 0.0;
    }

    public Double estimateTimeToRupture(
            double combinedExposureIndex,
            double failureProbability,
            double overpressureKPa,
            double thermalKwM2
    ) {
        if (failureProbability < 0.25) {
            return null;
        }

        double blastFactor = Math.max(0.1, overpressureKPa / overpressureTotalLossKPa);
        double thermalFactor = Math.max(0.1, thermalKwM2 / thermalTotalLossKwM2);

        double baseTimeSeconds;
        if (blastFactor >= 1.0) {
            baseTimeSeconds = Math.max(2.0, 15.0 / blastFactor);
        } else if (thermalFactor >= 1.0) {
            baseTimeSeconds = Math.max(10.0, 120.0 / Math.pow(thermalFactor, 1.2));
        } else {
            baseTimeSeconds = Math.max(15.0, 240.0 / Math.pow(combinedExposureIndex, 1.5));
        }

        return Math.max(1.0, baseTimeSeconds);
    }

    private String generateDamageSummary(
            String damageState,
            double overpressureKPa,
            double thermalKwM2,
            double failureProbability,
            Double timeToRupture
    ) {
        switch (damageState) {
            case "TOTAL_LOSS":
                return String.format("Catastrophic failure zone (%.1f kPa, %.1f kW/m²). Failure probability: %.0f%%. Severe structural collapse.",
                        overpressureKPa, thermalKwM2, failureProbability * 100);
            case "STRUCTURAL_DAMAGE":
                String ruptureText = (timeToRupture != null) ? String.format(" (est. rupture in %.0fs)", timeToRupture) : "";
                return String.format("Major structural exposure (%.1f kPa, %.1f kW/m²). Failure probability: %.0f%%%s.",
                        overpressureKPa, thermalKwM2, failureProbability * 100, ruptureText);
            case "MINOR_DAMAGE":
                return String.format("Minor impact (%.1f kPa, %.1f kW/m²). Non-structural cladding and instrumentation risk.",
                        overpressureKPa, thermalKwM2);
            default:
                return String.format("Safe exposure level (%.2f kPa, %.2f kW/m²). Asset remains structurally intact.",
                        overpressureKPa, thermalKwM2);
        }
    }

    private double roundToTwoDecimals(double val) {
        if (Double.isNaN(val) || Double.isInfinite(val)) return 0.0;
        return Math.round(val * 100.0) / 100.0;
    }

    @FunctionalInterface
    public interface PhysicalExposureProvider {
        double getPeakOverpressureKPa(double distanceMeters);

        default double getPeakOverpressureKPa(double distanceMeters, double bearingDegrees) {
            return getPeakOverpressureKPa(distanceMeters);
        }

        default double getPeakThermalRadiationKwM2(double distanceMeters) {
            return 0.0;
        }

        default double getPeakThermalRadiationKwM2(double distanceMeters, double bearingDegrees) {
            return getPeakThermalRadiationKwM2(distanceMeters);
        }
    }
}
