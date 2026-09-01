package com.safezone.service;

import com.safezone.dto.AffectedAssetDto;
import com.safezone.dto.DominoStepDto;
import com.safezone.dto.EscapeRouteAssessmentDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * =========================================================================================
 * CONSEQUENCE LAYER: RiskAssessmentService
 * =========================================================================================
 * <p>
 * Aggregates multi-hazard consequences across:
 * <ul>
 *   <li>Asset Vulnerability & Failure Probabilities</li>
 *   <li>Cascading Domino Escalation Risks</li>
 *   <li>Evacuation Route Impairments</li>
 * </ul>
 * Produces a normalized, deterministic Overall Risk Score in [0.0, 100.0] and
 * a consistent Severity Level (LOW, MODERATE, HIGH, CRITICAL).
 * </p>
 */
@Service
public class RiskAssessmentService {

    private static final Logger log = LoggerFactory.getLogger(RiskAssessmentService.class);

    private final double weightAssets;
    private final double weightDomino;
    private final double weightRoutes;

    private final double thresholdCritical;
    private final double thresholdHigh;
    private final double thresholdModerate;

    public RiskAssessmentService(
            @Value("${simulation.risk.weight.assets:0.45}") double weightAssets,
            @Value("${simulation.risk.weight.domino:0.35}") double weightDomino,
            @Value("${simulation.risk.weight.routes:0.20}") double weightRoutes,
            @Value("${simulation.risk.threshold.critical:75.0}") double thresholdCritical,
            @Value("${simulation.risk.threshold.high:50.0}") double thresholdHigh,
            @Value("${simulation.risk.threshold.moderate:25.0}") double thresholdModerate
    ) {
        this.weightAssets = weightAssets;
        this.weightDomino = weightDomino;
        this.weightRoutes = weightRoutes;
        this.thresholdCritical = thresholdCritical;
        this.thresholdHigh = thresholdHigh;
        this.thresholdModerate = thresholdModerate;

        log.info("Initialized RiskAssessmentService (Weights: [assets={}, domino={}, routes={}], Severity thresholds: [critical={}, high={}, moderate={}])",
                weightAssets, weightDomino, weightRoutes, thresholdCritical, thresholdHigh, thresholdModerate);
    }

    public record RiskEvaluation(double overallRiskScore, String overallSeverity) {}

    /**
     * Evaluates comprehensive overall plant risk and overall severity classification.
     *
     * @param affectedAssets  evaluated assets
     * @param dominoSteps     cascading domino steps
     * @param routeAssessments evacuation route assessments
     * @return RiskEvaluation record with overallRiskScore [0-100] and overallSeverity
     */
    public RiskEvaluation evaluateRisk(
            List<AffectedAssetDto> affectedAssets,
            List<DominoStepDto> dominoSteps,
            List<EscapeRouteAssessmentDto> routeAssessments
    ) {
        double assetScore = calculateAssetRiskScore(affectedAssets);
        double dominoScore = calculateDominoRiskScore(dominoSteps);
        double routeScore = calculateRouteRiskScore(routeAssessments);

        double totalWeight = weightAssets + weightDomino + weightRoutes;
        if (totalWeight <= 0) totalWeight = 1.0;

        double combinedRisk = (weightAssets * assetScore + weightDomino * dominoScore + weightRoutes * routeScore) / totalWeight;
        double boundedRiskScore = roundToTwoDecimals(Math.max(0.0, Math.min(100.0, combinedRisk)));

        String severity = classifySeverity(boundedRiskScore, affectedAssets, dominoSteps);

        return new RiskEvaluation(boundedRiskScore, severity);
    }

    public double calculateAssetRiskScore(List<AffectedAssetDto> affectedAssets) {
        if (affectedAssets == null || affectedAssets.isEmpty()) {
            return 0.0;
        }

        double maxFailureProb = 0.0;
        double sumFailureProb = 0.0;
        int nonSourceCount = 0;

        for (AffectedAssetDto asset : affectedAssets) {
            if (asset == null) continue;
            double p = asset.failureProbabilityEstimate();
            if (p > maxFailureProb) {
                maxFailureProb = p;
            }
            if (asset.distanceMeters() > 0.0) {
                sumFailureProb += p;
                nonSourceCount++;
            }
        }

        double avgSurroundingProb = nonSourceCount > 0 ? (sumFailureProb / nonSourceCount) : 0.0;

        // Weighted blend of worst asset and surrounding average
        double score = (maxFailureProb * 0.70 + avgSurroundingProb * 0.30) * 100.0;
        return Math.max(0.0, Math.min(100.0, score));
    }

    public double calculateDominoRiskScore(List<DominoStepDto> dominoSteps) {
        if (dominoSteps == null || dominoSteps.isEmpty()) {
            return 0.0;
        }

        double maxHopProbability = 0.0;
        for (DominoStepDto step : dominoSteps) {
            if (step != null && step.escalationProbabilityEstimate() > maxHopProbability) {
                maxHopProbability = step.escalationProbabilityEstimate();
            }
        }

        // Domino score scales with maximum hop probability and step count
        double countMultiplier = Math.min(1.3, 1.0 + (dominoSteps.size() - 1) * 0.15);
        double score = maxHopProbability * 100.0 * countMultiplier;
        return Math.max(0.0, Math.min(100.0, score));
    }

    public double calculateRouteRiskScore(List<EscapeRouteAssessmentDto> routeAssessments) {
        if (routeAssessments == null || routeAssessments.isEmpty()) {
            return 0.0;
        }

        double penaltySum = 0.0;
        for (EscapeRouteAssessmentDto route : routeAssessments) {
            if (route == null) continue;
            if ("UNSAFE".equalsIgnoreCase(route.safetyStatus())) {
                penaltySum += 100.0;
            } else if ("CAUTION".equalsIgnoreCase(route.safetyStatus())) {
                penaltySum += 40.0;
            }
        }

        double averageImpairment = penaltySum / routeAssessments.size();
        return Math.max(0.0, Math.min(100.0, averageImpairment));
    }

    public String classifySeverity(double riskScore, List<AffectedAssetDto> affectedAssets, List<DominoStepDto> dominoSteps) {
        // Any catastrophic primary detonation triggering secondary domino escalation guarantees CRITICAL
        boolean hasTotalLoss = affectedAssets != null && affectedAssets.stream()
                .anyMatch(a -> "TOTAL_LOSS".equals(a.damageState()));
        boolean hasDomino = dominoSteps != null && !dominoSteps.isEmpty();

        if (riskScore >= thresholdCritical || (hasTotalLoss && hasDomino)) {
            return "CRITICAL";
        }
        if (riskScore >= thresholdHigh) {
            return "HIGH";
        }
        if (riskScore >= thresholdModerate) {
            return "MODERATE";
        }
        return "LOW";
    }

    private double roundToTwoDecimals(double val) {
        if (Double.isNaN(val) || Double.isInfinite(val)) return 0.0;
        return Math.round(val * 100.0) / 100.0;
    }
}
