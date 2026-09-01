package com.safezone.dto;

/**
 * Single escalation hop in the model-derived domino chain.
 */
public record DominoStepDto(
    int stepOrder,
    String triggerAssetId,
    String targetAssetId,
    String mechanism,
    double escalationProbabilityEstimate,
    double estimatedDelaySeconds,
    String riskContribution
) {}
