"""
Educational blast propagation physics model for SafeZone AI.
Educational demonstrator only - not an engineering safety calculator.
"""

import math
from typing import Any, Dict, List, Tuple


def sedov_radius(t: float, energy: float, rho: float, xi: float = 1.0) -> float:
    """
    Computes the Sedov-Taylor blast radius R(t) = xi * (E * t^2 / rho)^0.2
    """
    t_val = max(float(t), 1e-6)
    e_val = max(float(energy), 0.0)
    rho_val = max(float(rho), 1e-6)
    return float(xi) * math.pow((e_val * (t_val ** 2)) / rho_val, 0.2)


def shock_speed(t: float, energy: float, rho: float, xi: float = 1.0) -> float:
    """
    Computes the shock front propagation velocity D(t) = 0.4 * R(t) / t
    """
    t_val = max(float(t), 1e-6)
    radius = sedov_radius(t_val, energy, rho, xi)
    return 0.4 * radius / t_val


def wind_components(speed_kmh: float, direction_deg: float) -> Tuple[float, float]:
    """
    Computes (ux, uy) in m/s from meteorological wind speed and direction (from which wind blows).
    Meteorological convention:
      0° (North) -> wind blows towards South (-Y): ux = 0, uy = -speed_ms
      90° (East) -> wind blows towards West (-X): ux = -speed_ms, uy = 0
      180° (South) -> wind blows towards North (+Y): ux = 0, uy = speed_ms
      270° (West) -> wind blows towards East (+X): ux = speed_ms, uy = 0
    """
    speed_ms = max(0.0, float(speed_kmh)) / 3.6
    # Downwind azimuth in degrees from North
    downwind_deg = ((float(direction_deg) % 360.0) + 180.0) % 360.0
    downwind_rad = math.radians(downwind_deg)
    # Cartesian components (x = East, y = North)
    ux = speed_ms * math.sin(downwind_rad)
    uy = speed_ms * math.cos(downwind_rad)
    return ux, uy


def wind_model(speed_kmh: float) -> Tuple[float, float, float, float]:
    """
    Computes geometric stretch, squeeze, drift_rate, and skew factors.
    """
    wind = max(0.0, float(speed_kmh))
    stretch = 1.0 + 0.020 * wind
    squeeze = max(0.35, 1.0 - 0.010 * wind)
    drift_rate = 0.045 * wind
    skew = 1.0 + 0.004 * wind
    return stretch, squeeze, drift_rate, skew


def wind_asymmetry(speed_kmh: float, alpha_max: float = 0.80, reference_speed: float = 18.0) -> float:
    """
    Computes the wind asymmetry factor alpha in [0, alpha_max).
    """
    wind = max(0.0, float(speed_kmh))
    return alpha_max * wind / (wind + reference_speed + 1e-9)


def blast_center(t: float, wind_kmh: float, direction_deg: float, x0: float = 0.0, y0: float = 0.0) -> Tuple[float, float]:
    """
    Computes the advected blast epicenter coordinates at time t.
    """
    ux, uy = wind_components(wind_kmh, direction_deg)
    t_val = max(0.0, float(t))
    return x0 + ux * t_val, y0 + uy * t_val


def blast_front_curve(
    radius: float,
    wind_kmh: float,
    direction_deg: float,
    center_x: float = 0.0,
    center_y: float = 0.0,
    points: int = 36
) -> List[Dict[str, float]]:
    """
    Generates the closed 2D polygon coordinates of the wind-deformed blast front.
    Uses an aerodynamic piecewise-ellipse model (elongated downwind, smooth convex dome upwind).
    """
    num_pts = max(8, int(points))
    alpha = wind_asymmetry(wind_kmh)
    downwind_deg = ((float(direction_deg) % 360.0) + 180.0) % 360.0
    cartesian_downwind_rad = math.radians(90.0 - downwind_deg)

    stretch = 1.0 + 1.25 * alpha
    squeeze_upwind = max(0.55, 1.0 - 0.45 * alpha)
    squeeze_cross = max(0.80, 1.0 - 0.20 * alpha)

    coords: List[Dict[str, float]] = []
    angle_step = (2.0 * math.pi) / num_pts

    for i in range(num_pts):
        theta = i * angle_step
        cos_t = math.cos(theta)
        sin_t = math.sin(theta)

        # Smooth aerodynamic profile: elongated downwind, convex dome upwind
        if cos_t >= 0:
            x_local = radius * stretch * cos_t
        else:
            x_local = radius * squeeze_upwind * cos_t

        y_local = radius * squeeze_cross * sin_t

        # Rotate local vector into global Cartesian (X=East, Y=North)
        x_world = center_x + (x_local * math.cos(cartesian_downwind_rad) - y_local * math.sin(cartesian_downwind_rad))
        y_world = center_y + (x_local * math.sin(cartesian_downwind_rad) + y_local * math.cos(cartesian_downwind_rad))

        coords.append({"x": round(x_world, 2), "y": round(y_world, 2)})

    return coords


def point_overpressure(
    x: float,
    y: float,
    t: float,
    energy: float,
    rho: float,
    p0: float,
    gamma: float,
    xi: float,
    wind_kmh: float,
    direction_deg: float,
    x0: float = 0.0,
    y0: float = 0.0
) -> Tuple[float, float, float]:
    """
    Calculates illustrative overpressure in Pa and directional factor for an asset at (x, y).
    Returns (overpressure_pa, distance_m, wind_factor).
    """
    t_val = max(float(t), 1e-6)
    radius = sedov_radius(t_val, energy, rho, xi)
    velocity = shock_speed(t_val, energy, rho, xi)
    post_shock = 2.0 * rho * (velocity ** 2) / (gamma + 1.0)
    demo_scale = 0.08 * p0 * (max(energy, 1.0) / 1e9) * 0.45 / (1.0 + (radius / 110.0) * 1.35)
    front_overpressure = max(post_shock - p0, demo_scale)

    center_x, center_y = blast_center(t_val, wind_kmh, direction_deg, x0, y0)
    dx = x - center_x
    dy = y - center_y
    dist_from_origin = math.sqrt((x - x0) ** 2 + (y - y0) ** 2)

    downwind_deg = ((float(direction_deg) % 360.0) + 180.0) % 360.0
    cartesian_downwind_rad = math.radians(90.0 - downwind_deg)

    # Transform (dx, dy) into local frame (u: downwind axis, v: crosswind axis)
    u = dx * math.cos(cartesian_downwind_rad) + dy * math.sin(cartesian_downwind_rad)
    v = -dx * math.sin(cartesian_downwind_rad) + dy * math.cos(cartesian_downwind_rad)

    alpha = wind_asymmetry(wind_kmh)
    stretch = 1.0 + 1.25 * alpha
    squeeze_upwind = max(0.55, 1.0 - 0.45 * alpha)
    squeeze_cross = max(0.80, 1.0 - 0.20 * alpha)

    if u >= 0:
        wind_factor = stretch
        norm = math.sqrt((u / max(stretch, 1e-6)) ** 2 + (v / max(squeeze_cross, 1e-6)) ** 2) / max(radius, 1e-9)
    else:
        wind_factor = squeeze_upwind
        norm = math.sqrt((u / max(squeeze_upwind, 1e-6)) ** 2 + (v / max(squeeze_cross, 1e-6)) ** 2) / max(radius, 1e-9)

    field_overpressure = front_overpressure * math.exp(-1.45 * norm) / (1.0 + 0.05 * (norm ** 2))

    return field_overpressure, dist_from_origin, wind_factor


def calculate_hazard_contours(
    energy: float,
    rho: float,
    gamma: float,
    xi: float,
    wind_kmh: float,
    direction_deg: float,
    x0: float = 0.0,
    y0: float = 0.0,
    duration: float = 10.0,
    points: int = 36,
    thresholds_kpa: List[float] = None
) -> List[Dict[str, Any]]:
    """
    Computes directional hazard zone polygons for overpressure thresholds (default [70.0, 20.0, 5.0] kPa).
    """
    if thresholds_kpa is None:
        thresholds_kpa = [70.0, 20.0, 5.0]

    center_x, center_y = blast_center(duration, wind_kmh, direction_deg, x0, y0)
    zones = []

    for thresh in thresholds_kpa:
        thresh_pa = thresh * 1000.0
        # Analytical Rankine-Hugoniot / Sedov-Taylor threshold radius
        numerator = 8.0 * (xi ** 5.0) * energy
        denominator = 25.0 * (gamma + 1.0) * thresh_pa
        base_radius = math.pow(numerator / denominator, 1.0 / 3.0) if denominator > 0 else 0.0

        polygon = blast_front_curve(
            radius=base_radius,
            wind_kmh=wind_kmh,
            direction_deg=direction_deg,
            center_x=center_x,
            center_y=center_y,
            points=points
        )

        zones.append({
            "thresholdKpa": thresh,
            "radiusMeters": round(base_radius, 2),
            "polygonCoordinates": polygon
        })

    return zones
