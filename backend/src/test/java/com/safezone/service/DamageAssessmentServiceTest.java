package com.safezone.service;

import com.safezone.dto.AffectedAssetDto;
import com.safezone.dto.AssetDimensionsDto;
import com.safezone.dto.AssetDto;
import com.safezone.dto.AssetType;
import com.safezone.dto.Position3DDto;
import com.safezone.dto.TankPropertiesDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class DamageAssessmentServiceTest {

    private DamageAssessmentService damageAssessmentService;

    @BeforeEach
    void setUp() {
        damageAssessmentService = new DamageAssessmentService(
                70.0,  // overpressure Total Loss
                20.0,  // overpressure Structural Damage
                5.0,   // overpressure Minor Damage
                37.5,  // thermal Total Loss
                12.5,  // thermal Structural Damage
                4.0    // thermal Minor Damage
        );
    }

    private AssetDto createTestTank(String assetId, String name, double x, double y) {
        return new AssetDto(
                assetId,
                name,
                AssetType.TANK,
                new Position3DDto(x, y, 0.0),
                new AssetDimensionsDto(null, null, 16.0, 14.0),
                new TankPropertiesDto("PROPANE", 1500.0, 60.0, 9.2, 28.0, true)
        );
    }

    @Test
    @DisplayName("Damage Classification: High exposure classifies as TOTAL_LOSS")
    void testTotalLossClassification() {
        AssetDto asset = createTestTank("T-102", "Propane Sphere", 50.0, 0.0);
        AffectedAssetDto result = damageAssessmentService.assessAsset(asset, false, 50.0, 85.0, 40.0);

        assertEquals("TOTAL_LOSS", result.damageState());
        assertTrue(result.failureProbabilityEstimate() >= 0.75);
        assertTrue(result.failureProbabilityEstimate() <= 1.0);
        assertNotNull(result.estimatedTimeToRuptureSeconds());
        assertTrue(result.estimatedTimeToRuptureSeconds() > 0.0);
    }

    @Test
    @DisplayName("Damage Classification: Moderate-to-high exposure classifies as STRUCTURAL_DAMAGE")
    void testStructuralDamageClassification() {
        AssetDto asset = createTestTank("T-102", "Propane Sphere", 60.0, 0.0);
        AffectedAssetDto result = damageAssessmentService.assessAsset(asset, false, 60.0, 35.0, 15.0);

        assertEquals("STRUCTURAL_DAMAGE", result.damageState());
        assertTrue(result.failureProbabilityEstimate() >= 0.30 && result.failureProbabilityEstimate() < 0.75);
        assertNotNull(result.estimatedTimeToRuptureSeconds());
    }

    @Test
    @DisplayName("Damage Classification: Low exposure classifies as MINOR_DAMAGE")
    void testMinorDamageClassification() {
        AssetDto asset = createTestTank("T-102", "Propane Sphere", 120.0, 0.0);
        AffectedAssetDto result = damageAssessmentService.assessAsset(asset, false, 120.0, 8.0, 5.0);

        assertEquals("MINOR_DAMAGE", result.damageState());
        assertTrue(result.failureProbabilityEstimate() >= 0.03 && result.failureProbabilityEstimate() < 0.30);
    }

    @Test
    @DisplayName("Damage Classification: Very low exposure classifies as INTACT")
    void testIntactClassification() {
        AssetDto asset = createTestTank("T-102", "Propane Sphere", 250.0, 0.0);
        AffectedAssetDto result = damageAssessmentService.assessAsset(asset, false, 250.0, 2.0, 1.0);

        assertEquals("INTACT", result.damageState());
        assertEquals(0.0, result.failureProbabilityEstimate());
        assertNull(result.estimatedTimeToRuptureSeconds(), "Intact assets should not have estimated rupture time");
    }

    @Test
    @DisplayName("Failure Probability is always bounded in [0.0, 1.0] and strictly monotonic")
    void testFailureProbabilityMonotonicAndBounded() {
        AssetDto asset = createTestTank("T-102", "Propane Sphere", 50.0, 0.0);

        double p1 = damageAssessmentService.assessAsset(asset, false, 200.0, 1.0, 0.5).failureProbabilityEstimate();
        double p2 = damageAssessmentService.assessAsset(asset, false, 120.0, 10.0, 6.0).failureProbabilityEstimate();
        double p3 = damageAssessmentService.assessAsset(asset, false, 70.0, 40.0, 20.0).failureProbabilityEstimate();
        double p4 = damageAssessmentService.assessAsset(asset, false, 30.0, 100.0, 50.0).failureProbabilityEstimate();

        assertTrue(p1 >= 0.0 && p1 <= 1.0);
        assertTrue(p2 >= 0.0 && p2 <= 1.0);
        assertTrue(p3 >= 0.0 && p3 <= 1.0);
        assertTrue(p4 >= 0.0 && p4 <= 1.0);

        assertTrue(p1 <= p2, "Failure probability must increase with exposure");
        assertTrue(p2 <= p3, "Failure probability must increase with exposure");
        assertTrue(p3 <= p4, "Failure probability must increase with exposure");
    }

    @Test
    @DisplayName("Estimated Rupture Time decreases as physical exposure severity increases")
    void testEstimatedRuptureTimeDecreasesWithExposure() {
        AssetDto asset = createTestTank("T-102", "Propane Sphere", 50.0, 0.0);

        AffectedAssetDto mod = damageAssessmentService.assessAsset(asset, false, 70.0, 30.0, 15.0);
        AffectedAssetDto high = damageAssessmentService.assessAsset(asset, false, 30.0, 120.0, 60.0);

        assertNotNull(mod.estimatedTimeToRuptureSeconds());
        assertNotNull(high.estimatedTimeToRuptureSeconds());
        assertTrue(high.estimatedTimeToRuptureSeconds() < mod.estimatedTimeToRuptureSeconds(),
                "Higher exposure must produce shorter estimated time to rupture");
    }
}
