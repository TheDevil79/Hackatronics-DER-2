package com.safezone.dto.python;

import com.safezone.dto.Position3DDto;
import java.util.List;

public record PythonPhysicsRequestDto(
    double energyJ,
    double windSpeedKmh,
    double windDirectionDeg,
    Position3DDto sourcePosition,
    double durationSeconds,
    double timeStepSeconds,
    double airDensityKgM3,
    double ambientPressurePa,
    double gamma,
    double xi,
    double temperatureCelsius,
    List<PythonAssetPositionDto> assetPositions
) {}
