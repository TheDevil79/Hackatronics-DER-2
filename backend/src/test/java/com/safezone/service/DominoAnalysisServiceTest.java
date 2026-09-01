package com.safezone.service;

import com.safezone.dto.AffectedAssetDto;
import com.safezone.dto.DominoStepDto;
import com.safezone.dto.IncidentDto;
import com.safezone.dto.IncidentParametersDto;
import com.safezone.dto.IncidentType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class DominoAnalysisServiceTest {

    private DominoAnalysisService dominoAnalysisService;

    @BeforeEach
    void setUp() {
        dominoAnalysisService = new DominoAnalysisService(0.25);
    }

    @Test
    @DisplayName("Domino: Vulnerable adjacent tank triggers a secondary escalation step")
    void testVulnerableTankGeneratesDominoStep() {
        IncidentDto incident = new IncidentDto("T-101", IncidentType.VAPOR_CLOUD_EXPLOSION, new IncidentParametersDto(4500.0, 675.0, 22.0, 45.0, null));

        AffectedAssetDto t101 = new AffectedAssetDto("T-101", "Source Tank", 0.0, 100.0, 350.0, "TOTAL_LOSS", 1.0, 0.0, "Source");
        AffectedAssetDto t102 = new AffectedAssetDto("T-102", "Propane Sphere", 55.0, 5.0, 45.0, "STRUCTURAL_DAMAGE", 0.65, 45.0, "Vulnerable adjacent unit");
        AffectedAssetDto bldCtrl = new AffectedAssetDto("BLD-CTRL", "Control Room", 150.0, 2.0, 8.0, "MINOR_DAMAGE", 0.08, null, "Minor impact");

        List<DominoStepDto> steps = dominoAnalysisService.evaluateDominoChain(
                incident,
                List.of(t101, t102, bldCtrl),
                distance -> 0.15 * distance // Arrival delay solver
        );

        assertNotNull(steps);
        assertEquals(1, steps.size());

        DominoStepDto step = steps.get(0);
        assertEquals("T-101", step.triggerAssetId());
        assertEquals("T-102", step.targetAssetId());
        assertEquals(0.65, step.escalationProbabilityEstimate());
        assertEquals("OVERPRESSURE_FAILURE", step.mechanism());
        assertTrue(step.estimatedDelaySeconds() > 0.0);
    }

    @Test
    @DisplayName("Domino: Moving secondary asset farther away prevents secondary escalation")
    void testFartherAssetDoesNotTriggerDomino() {
        IncidentDto incident = new IncidentDto("T-101", IncidentType.VAPOR_CLOUD_EXPLOSION, new IncidentParametersDto(4500.0, 675.0, 22.0, 45.0, null));

        AffectedAssetDto t101 = new AffectedAssetDto("T-101", "Source Tank", 0.0, 100.0, 350.0, "TOTAL_LOSS", 1.0, 0.0, "Source");
        // Tank relocated 200m away with failure probability below 0.25 threshold
        AffectedAssetDto t102Far = new AffectedAssetDto("T-102", "Propane Sphere", 200.0, 1.5, 3.0, "INTACT", 0.0, null, "Safe");

        List<DominoStepDto> steps = dominoAnalysisService.evaluateDominoChain(
                incident,
                List.of(t101, t102Far),
                distance -> 0.15 * distance
        );

        assertNotNull(steps);
        assertTrue(steps.isEmpty(), "No domino steps should be generated when asset is out of critical exposure");
    }

    @Test
    @DisplayName("Domino: Mechanism classification derived from dominant exposure type")
    void testMechanismClassification() {
        assertEquals("OVERPRESSURE_FAILURE", dominoAnalysisService.determineDominantMechanism(80.0, 5.0));
        assertEquals("THERMAL_RADIATION_RUPTURE", dominoAnalysisService.determineDominantMechanism(10.0, 40.0));
        assertEquals("COMBINED_DAMAGE", dominoAnalysisService.determineDominantMechanism(65.0, 35.0));
    }
}
