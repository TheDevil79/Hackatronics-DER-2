package com.safezone.dto;

import java.util.List;

public record FacilityDto(
    String facilityId,
    String name,
    LocationDto location,
    FacilityBoundaryDto boundary,
    List<AssetDto> assets,
    List<EscapeRouteDto> escapeRoutes,
    List<BlockageDto> blockages
) {}
