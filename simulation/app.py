"""
FastAPI application exposing REST endpoints for SafeZone AI physics simulations.
Educational demonstrator only - not an engineering safety calculator.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import math

from models import (
    PhysicsSimulationRequest,
    PhysicsSimulationResponse,
    BlastMetrics,
    HazardZoneContour,
    AssetExposureResult,
    SimulationMetadata,
    HealthResponse,
    Point2D,
)
from physics_model import (
    sedov_radius,
    shock_speed,
    blast_center,
    wind_asymmetry,
    point_overpressure,
    calculate_hazard_contours,
)

app = FastAPI(
    title="SafeZone AI Python Physics Service",
    description="Wind-aware Sedov-Taylor blast physics simulation microservice (Educational demonstrator only).",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    """
    Root endpoint directing to health check and interactive documentation.
    """
    return {
        "service": "SafeZone AI Python Physics Service",
        "status": "RUNNING",
        "health": "/health",
        "docs": "/docs",
        "simulate": "/api/physics/simulate",
        "disclaimer": "Educational demonstrator only - not an engineering safety calculator"
    }


@app.get("/health", response_model=HealthResponse)
def health_check():
    """
    Returns service health status and model metadata.
    """
    return HealthResponse(
        status="UP",
        model="Sedov-Taylor",
        windAware=True,
        educationalDisclaimer="Educational demonstrator only - not an engineering safety calculator"
    )


@app.post("/api/physics/simulate", response_model=PhysicsSimulationResponse)
def simulate_physics(req: PhysicsSimulationRequest):
    """
    Executes wind-aware Sedov-Taylor blast physics simulation and asset exposure calculations.
    """
    try:
        duration = max(req.durationSeconds, 0.1)
        x0 = req.sourcePosition.x
        y0 = req.sourcePosition.y

        # 1. Base blast metrics at time = duration
        final_radius = sedov_radius(duration, req.energyJ, req.airDensityKgM3, req.xi)
        velocity = shock_speed(duration, req.energyJ, req.airDensityKgM3, req.xi)
        post_shock = 2.0 * req.airDensityKgM3 * (velocity ** 2) / (req.gamma + 1.0)
        demo_scale = 0.08 * req.ambientPressurePa * (max(req.energyJ, 1.0) / 1e9) * 0.45 / (1.0 + (final_radius / 110.0) * 1.35)
        front_overpressure_pa = max(post_shock - req.ambientPressurePa, demo_scale)

        cx, cy = blast_center(duration, req.windSpeedKmh, req.windDirectionDeg, x0, y0)
        alpha = wind_asymmetry(req.windSpeedKmh)

        blast_metrics = BlastMetrics(
            radiusMeters=round(final_radius, 2),
            shockSpeedMps=round(velocity, 2),
            overpressurePa=round(front_overpressure_pa, 2),
            center=Point2D(x=round(cx, 2), y=round(cy, 2)),
            windAsymmetry=round(alpha, 4),
        )

        # 2. Hazard zone contours (70 kPa, 20 kPa, 5 kPa)
        raw_zones = calculate_hazard_contours(
            energy=req.energyJ,
            rho=req.airDensityKgM3,
            gamma=req.gamma,
            xi=req.xi,
            wind_kmh=req.windSpeedKmh,
            direction_deg=req.windDirectionDeg,
            x0=x0,
            y0=y0,
            duration=duration,
            points=36,
            thresholds_kpa=[70.0, 20.0, 5.0],
        )

        hazard_zones = [
            HazardZoneContour(
                thresholdKpa=z["thresholdKpa"],
                radiusMeters=z["radiusMeters"],
                polygonCoordinates=[Point2D(x=p["x"], y=p["y"]) for p in z["polygonCoordinates"]]
            )
            for z in raw_zones
        ]

        # 3. Directional asset exposures
        asset_exposures = []
        for asset in req.assetPositions:
            p_pa, dist_m, w_factor = point_overpressure(
                x=asset.x,
                y=asset.y,
                t=duration,
                energy=req.energyJ,
                rho=req.airDensityKgM3,
                p0=req.ambientPressurePa,
                gamma=req.gamma,
                xi=req.xi,
                wind_kmh=req.windSpeedKmh,
                direction_deg=req.windDirectionDeg,
                x0=x0,
                y0=y0,
            )
            asset_exposures.append(
                AssetExposureResult(
                    assetId=asset.assetId,
                    distanceMeters=round(dist_m, 2),
                    overpressureKpa=round(p_pa / 1000.0, 4),
                    windFactor=round(w_factor, 4),
                )
            )

        return PhysicsSimulationResponse(
            energyJ=req.energyJ,
            windSpeedKmh=req.windSpeedKmh,
            windDirectionDeg=req.windDirectionDeg,
            blast=blast_metrics,
            hazardZones=hazard_zones,
            assetExposures=asset_exposures,
            metadata=SimulationMetadata(),
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Physics calculation failure: {str(e)}")
