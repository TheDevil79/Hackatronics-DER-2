package com.safezone.dto;

/**
 * Categorization of physical plant assets.
 * Note: Barriers, blast walls, and firewalls are modeled separately in BlockageDto.
 */
public enum AssetType {
    TANK,
    MACHINERY,
    BUILDING,
    STORAGE_AREA,
    SHELTER,
    EXIT
}
