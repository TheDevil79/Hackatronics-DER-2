package com.safezone.service;

import com.safezone.dto.AffectedAssetDto;
import com.safezone.dto.DominoStepDto;
import com.safezone.dto.IncidentDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * =========================================================================================
 * CONSEQUENCE LAYER: DominoAnalysisService
 * =========================================================================================
 * <p>
 * Evaluates cascading domino propagation from the primary incident source asset to
 * surrounding vulnerable units based on physical exposure, damage state, failure probabilities,
 * and wind-modulated directional propagation.
 * </p>
 */
@Service
public class DominoAnalysisService {

    private static final Logger log = LoggerFactory.getLogger(DominoAnalysisService.class);

    private final double escalationThreshold;

    public DominoAnalysisService(
            @Value("${simulation.domino.escalation-threshold:0.25}") double escalationThreshold
    ) {
        this.escalationThreshold = escalationThreshold;
        log.info("Initialized DominoAnalysisService (Escalation threshold: {})", escalationThreshold);
    }

    /**
     * Identifies potential secondary escalation hops from affected facility assets.
     */
    public List<DominoStepDto> evaluateDominoChain(
            IncidentDto incident,
            List<AffectedAssetDto> affectedAssets,
            PropagationTimeSolver propagationTimeSolver
    ) {
        return evaluateDominoChain(incident, affectedAssets, propagationTimeSolver, null);
    }

    /**
     * Identifies potential secondary escalation hops with wind context awareness.
     */
    public List<DominoStepDto> evaluateDominoChain(
            IncidentDto incident,
            List<AffectedAssetDto> affectedAssets,
            PropagationTimeSolver propagationTimeSolver,
            WindContext windContext
    ) {
        List<DominoStepDto> dominoSteps = new ArrayList<>();
        if (incident == null || affectedAssets == null) {
            return dominoSteps;
        }

        String sourceId = incident.sourceAssetId();
        int stepOrder = 1;

        for (AffectedAssetDto asset : affectedAssets) {
            if (asset == null || asset.assetId() == null) continue;
            // The source asset cannot domino-escalate onto itself
            if (asset.assetId().equals(sourceId)) continue;

            double failureProb = asset.failureProbabilityEstimate();

            if (failureProb >= escalationThreshold) {
                String mechanism = determineDominantMechanism(asset.peakOverpressureKPa(), asset.peakThermalRadiationKwM2());
                double waveArrivalDelay = propagationTimeSolver.getArrivalDelaySeconds(asset.distanceMeters());
                double vesselRuptureDelay = (asset.estimatedTimeToRuptureSeconds() != null)
                        ? asset.estimatedTimeToRuptureSeconds()
                        : 15.0;

                double totalDelaySeconds = roundToTwoDecimals(Math.max(0.1, waveArrivalDelay + vesselRuptureDelay));

                String windInfo = "";
                if (windContext != null && windContext.hasWind()) {
                    String orientation = windContext.assetOrientations().getOrDefault(asset.assetId(), "CROSSWIND");
                    windInfo = String.format(" [Wind: %.1f m/s from %.0f°, %s]", windContext.speedMps(), windContext.originDeg(), orientation);
                }

                String riskContribution = String.format(
                        "Primary blast/thermal flux threatens %s (%s) at %.1fm%s. Overpressure: %.1f kPa, Thermal: %.1f kW/m². Escalation probability: %.0f%% (est. delay: %.0fs).",
                        asset.name(), asset.assetId(), asset.distanceMeters(), windInfo, asset.peakOverpressureKPa(), asset.peakThermalRadiationKwM2(),
                        failureProb * 100, totalDelaySeconds
                );

                dominoSteps.add(new DominoStepDto(
                        stepOrder++,
                        sourceId,
                        asset.assetId(),
                        mechanism,
                        roundToTwoDecimals(failureProb),
                        totalDelaySeconds,
                        riskContribution
                ));
            }
        }

        return dominoSteps;
    }

    public String determineDominantMechanism(double overpressureKPa, double thermalKwM2) {
        double normalizedPressure = overpressureKPa / 70.0;
        double normalizedThermal = thermalKwM2 / 37.5;

        if (normalizedPressure > 1.5 * normalizedThermal) {
            return "OVERPRESSURE_FAILURE";
        } else if (normalizedThermal > 1.5 * normalizedPressure) {
            return "THERMAL_RADIATION_RUPTURE";
        } else {
            return "COMBINED_DAMAGE";
        }
    }

    private double roundToTwoDecimals(double val) {
        if (Double.isNaN(val) || Double.isInfinite(val)) return 0.0;
        return Math.round(val * 100.0) / 100.0;
    }

    @FunctionalInterface
    public interface PropagationTimeSolver {
        double getArrivalDelaySeconds(double distanceMeters);
    }

    public record WindContext(boolean hasWind, double speedMps, double originDeg, Map<String, String> assetOrientations) {}
}
