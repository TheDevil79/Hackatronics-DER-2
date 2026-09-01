package com.safezone.service;

import com.safezone.dto.AffectedAssetDto;
import com.safezone.dto.DominoStepDto;
import com.safezone.dto.EscapeRouteAssessmentDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RiskAssessmentServiceTest {

    private RiskAssessmentService riskAssessmentService;

    @BeforeEach
    void setUp() {
        riskAssessmentService = new RiskAssessmentService(
                0.45, // assets weight
                0.35, // domino weight
                0.20, // routes weight
                75.0, // critical threshold
                50.0, // high threshold
                25.0  // moderate threshold
        );
    }

    @Test
    @DisplayName("Risk: High asset failure, domino escalation, and unsafe routes yield CRITICAL overall risk")
    void testCriticalOverallRisk() {
        AffectedAssetDto t101 = new AffectedAssetDto("T-101", "Tank 1", 0.0, 100.0, 500.0, "TOTAL_LOSS", 1.0, 0.0, "Source");
        AffectedAssetDto t102 = new AffectedAssetDto("T-102", "Tank 2", 55.0, 30.0, 2.5, "STRUCTURAL_DAMAGE", 0.62, 300.0, "Damaged");

        DominoStepDto step = new DominoStepDto(1, "T-101", "T-102", "THERMAL_RADIATION_RUPTURE", 0.62, 300.0, "Domino risk");
        EscapeRouteAssessmentDto route = new EscapeRouteAssessmentDto("R-1", "West Route", "UNSAFE", 90.0, 14.0, 0.0, "Unsafe");

        RiskAssessmentService.RiskEvaluation eval = riskAssessmentService.evaluateRisk(
                List.of(t101, t102),
                List.of(step),
                List.of(route)
        );

        assertTrue(eval.overallRiskScore() >= 70.0 && eval.overallRiskScore() <= 100.0);
        assertEquals("CRITICAL", eval.overallSeverity());
    }

    @Test
    @DisplayName("Risk: Low exposure and safe routes yield LOW overall risk")
    void testLowOverallRisk() {
        AffectedAssetDto asset = new AffectedAssetDto("T-101", "Tank 1", 300.0, 1.0, 0.5, "INTACT", 0.0, null, "Safe");
        EscapeRouteAssessmentDto route = new EscapeRouteAssessmentDto("R-1", "Perimeter", "SAFE", 0.5, 0.2, null, "Safe");

        RiskAssessmentService.RiskEvaluation eval = riskAssessmentService.evaluateRisk(
                List.of(asset),
                List.of(),
                List.of(route)
        );

        assertTrue(eval.overallRiskScore() >= 0.0 && eval.overallRiskScore() <= 25.0);
        assertEquals("LOW", eval.overallSeverity());
    }

    @Test
    @DisplayName("Risk: Risk score is always strictly bounded in [0.0, 100.0]")
    void testRiskScoreBounded() {
        RiskAssessmentService.RiskEvaluation minEval = riskAssessmentService.evaluateRisk(List.of(), List.of(), List.of());
        assertTrue(minEval.overallRiskScore() >= 0.0 && minEval.overallRiskScore() <= 100.0);
    }
}
