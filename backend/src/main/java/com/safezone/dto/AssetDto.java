package com.safezone.dto;

public record AssetDto(
    String assetId,
    String name,
    AssetType type,
    Position3DDto position,
    AssetDimensionsDto dimensions,
    TankPropertiesDto tankProperties
) {}
