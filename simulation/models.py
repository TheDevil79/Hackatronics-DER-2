"""
Pydantic data models for the SafeZone AI Python Physics Service API.
"""

from typing import Any, List, Optional
from pydantic import BaseModel, Field, model_validator


class Position3D(BaseModel):
    x: float = 0.0
    y: float = 0.0
    z: Optional[float] = 0.0


class Point2D(BaseModel):
    x: float
    y: float


class AssetPosition(BaseModel):
    assetId: str
    x: float
    y: float
    z: Optional[float] = 0.0


class PhysicsSimulationRequest(BaseModel):
    energyJ: float = Field(default=2.82e9, description="Explosion energy in Joules")
    windSpeedKmh: float = Field(default=0.0, description="Wind speed in km/h")
    windDirectionDeg: float = Field(default=0.0, description="Meteorological wind direction in degrees FROM north (0=N, 90=E)")
    sourcePosition: Position3D = Field(default_factory=Position3D, description="Coordinates of the blast epicenter")
    durationSeconds: float = Field(default=10.0, description="Simulation duration in seconds")
    timeStepSeconds: float = Field(default=0.1, description="Time step in seconds")
    airDensityKgM3: float = Field(default=1.225, description="Ambient air density in kg/m^3")
    ambientPressurePa: float = Field(default=101325.0, description="Ambient atmospheric pressure in Pa")
    gamma: float = Field(default=1.4, description="Specific heat ratio")
    xi: float = Field(default=1.0, description="Sedov similarity constant")
    temperatureCelsius: float = Field(default=25.0, description="Ambient temperature in Celsius")
    assetPositions: List[AssetPosition] = Field(default_factory=list, description="Target asset positions for exposure analysis")

    @model_validator(mode="before")
    @classmethod
    def normalize_fields(cls, values: Any) -> Any:
        if isinstance(values, dict):
            # energy alias
            if "energy" in values and "energyJ" not in values:
                values["energyJ"] = values["energy"]
            elif "energy_j" in values and "energyJ" not in values:
                values["energyJ"] = values["energy_j"]

            # wind speed alias
            if "wind" in values and "windSpeedKmh" not in values:
                values["windSpeedKmh"] = values["wind"]
            elif "wind_kmh" in values and "windSpeedKmh" not in values:
                values["windSpeedKmh"] = values["wind_kmh"]

            # wind direction alias
            if "windDirection" in values and "windDirectionDeg" not in values:
                values["windDirectionDeg"] = values["windDirection"]
            elif "wind_dir" in values and "windDirectionDeg" not in values:
                values["windDirectionDeg"] = values["wind_dir"]
            elif "windDirDeg" in values and "windDirectionDeg" not in values:
                values["windDirectionDeg"] = values["windDirDeg"]

            # duration alias
            if "duration" in values and "durationSeconds" not in values:
                values["durationSeconds"] = values["duration"]

            # timeStep alias
            if "timeStep" in values and "timeStepSeconds" not in values:
                values["timeStepSeconds"] = values["timeStep"]
            elif "time_step" in values and "timeStepSeconds" not in values:
                values["timeStepSeconds"] = values["time_step"]

            # airDensity alias
            if "airDensity" in values and "airDensityKgM3" not in values:
                values["airDensityKgM3"] = values["airDensity"]
            elif "air_density" in values and "airDensityKgM3" not in values:
                values["airDensityKgM3"] = values["air_density"]

            # pressure alias
            if "pressure" in values and "ambientPressurePa" not in values:
                values["ambientPressurePa"] = values["pressure"]
            elif "ambientPressure" in values and "ambientPressurePa" not in values:
                values["ambientPressurePa"] = values["ambientPressure"]

            # temperature alias
            if "temperature" in values and "temperatureCelsius" not in values:
                values["temperatureCelsius"] = values["temperature"]

        return values


class BlastMetrics(BaseModel):
    radiusMeters: float
    shockSpeedMps: float
    overpressurePa: float
    center: Point2D
    windAsymmetry: float


class HazardZoneContour(BaseModel):
    thresholdKpa: float
    radiusMeters: Optional[float] = None
    polygonCoordinates: List[Point2D]


class AssetExposureResult(BaseModel):
    assetId: str
    distanceMeters: float
    overpressureKpa: float
    windFactor: float


class SimulationMetadata(BaseModel):
    model: str = "Sedov-Taylor"
    windAware: bool = True
    educationalDisclaimer: str = "Educational demonstrator only - not an engineering safety calculator"


class PhysicsSimulationResponse(BaseModel):
    energyJ: float
    windSpeedKmh: float
    windDirectionDeg: float
    blast: BlastMetrics
    hazardZones: List[HazardZoneContour]
    assetExposures: List[AssetExposureResult]
    metadata: SimulationMetadata = Field(default_factory=SimulationMetadata)


class HealthResponse(BaseModel):
    status: str = "UP"
    model: str = "Sedov-Taylor"
    windAware: bool = True
    educationalDisclaimer: str = "Educational demonstrator only - not an engineering safety calculator"
