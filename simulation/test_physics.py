"""
Unit and API tests for Python physics service endpoints and model calculations.
"""

import unittest
from physics_model import (
    sedov_radius,
    shock_speed,
    wind_components,
    wind_model,
    wind_asymmetry,
    blast_center,
    blast_front_curve,
    point_overpressure,
    calculate_hazard_contours,
)

try:
    from fastapi.testclient import TestClient
    from app import app
    HAS_FASTAPI_TEST = True
except ImportError:
    HAS_FASTAPI_TEST = False


class TestSedovPhysicsModel(unittest.TestCase):

    def test_sedov_radius_and_shock_speed(self):
        energy = 2.82e9
        rho = 1.225
        t = 1.0
        xi = 1.0

        r = sedov_radius(t, energy, rho, xi)
        self.assertGreater(r, 0.0)
        self.assertAlmostEqual(r, (energy / rho) ** 0.2, places=1)

        v = shock_speed(t, energy, rho, xi)
        self.assertAlmostEqual(v, 0.4 * r / t, places=3)

    def test_zero_wind_symmetry(self):
        energy = 4.184e8  # 100 kg TNT
        rho = 1.225
        p0 = 101325.0
        gamma = 1.4
        xi = 1.0
        t = 2.0
        x0, y0 = 40.0, 50.0

        alpha = wind_asymmetry(0.0)
        self.assertEqual(alpha, 0.0)

        cx, cy = blast_center(t, 0.0, 90.0, x0, y0)
        self.assertAlmostEqual(cx, x0, places=4)
        self.assertAlmostEqual(cy, y0, places=4)

        # 4 points at 50m distance (North, South, East, West)
        p_north, d_n, w_n = point_overpressure(x0, y0 + 50.0, t, energy, rho, p0, gamma, xi, 0.0, 0.0, x0, y0)
        p_south, d_s, w_s = point_overpressure(x0, y0 - 50.0, t, energy, rho, p0, gamma, xi, 0.0, 0.0, x0, y0)
        p_east, d_e, w_e = point_overpressure(x0 + 50.0, y0, t, energy, rho, p0, gamma, xi, 0.0, 0.0, x0, y0)
        p_west, d_w, w_w = point_overpressure(x0 - 50.0, y0, t, energy, rho, p0, gamma, xi, 0.0, 0.0, x0, y0)

        self.assertAlmostEqual(w_n, 1.0, places=4)
        self.assertAlmostEqual(w_s, 1.0, places=4)
        self.assertAlmostEqual(w_e, 1.0, places=4)
        self.assertAlmostEqual(w_w, 1.0, places=4)

        self.assertAlmostEqual(p_north, p_south, places=2)
        self.assertAlmostEqual(p_east, p_west, places=2)
        self.assertAlmostEqual(p_north, p_east, places=2)

    def test_wind_validation_equal_distance_assets(self):
        """
        Deterministic benchmark test:
        Epicenter: T-SRC at (40, 50)
        Downwind asset: T-WEST at (-15, 50)  -> 55m West
        Upwind asset: T-EAST at (95, 50)     -> 55m East
        Wind: 3 m/s (10.8 km/h) FROM East (90°)
        """
        energy = 4.184e8
        rho = 1.225
        p0 = 101325.0
        gamma = 1.4
        xi = 1.0
        t = 2.0
        x0, y0 = 40.0, 50.0
        wind_kmh = 10.8
        wind_dir = 90.0  # From East

        alpha = wind_asymmetry(wind_kmh)
        self.assertGreater(alpha, 0.0)

        cx, cy = blast_center(t, wind_kmh, wind_dir, x0, y0)
        self.assertLess(cx, x0)  # shifted west
        self.assertAlmostEqual(cy, y0, places=4)

        p_west, d_w, w_w = point_overpressure(-15.0, 50.0, t, energy, rho, p0, gamma, xi, wind_kmh, wind_dir, x0, y0)
        p_east, d_e, w_e = point_overpressure(95.0, 50.0, t, energy, rho, p0, gamma, xi, wind_kmh, wind_dir, x0, y0)

        self.assertAlmostEqual(d_w, 55.0, places=2)
        self.assertAlmostEqual(d_e, 55.0, places=2)

        self.assertGreater(w_w, w_e)
        self.assertGreater(p_west, p_east)

    def test_fastapi_endpoints(self):
        if not HAS_FASTAPI_TEST:
            return

        client = TestClient(app)

        # 1. Health check
        health_resp = client.get("/health")
        self.assertEqual(health_resp.status_code, 200)
        data = health_resp.json()
        self.assertEqual(data["status"], "UP")
        self.assertEqual(data["model"], "Sedov-Taylor")
        self.assertTrue(data["windAware"])

        # 2. Simulate endpoint
        payload = {
            "energyJ": 4.184e8,
            "windSpeedKmh": 10.8,
            "windDirectionDeg": 90.0,
            "sourcePosition": {"x": 40.0, "y": 50.0, "z": 0.0},
            "durationSeconds": 5.0,
            "timeStepSeconds": 0.1,
            "airDensityKgM3": 1.225,
            "ambientPressurePa": 101325.0,
            "gamma": 1.4,
            "xi": 1.0,
            "temperatureCelsius": 25.0,
            "assetPositions": [
                {"assetId": "T-WEST", "x": -15.0, "y": 50.0, "z": 0.0},
                {"assetId": "T-EAST", "x": 95.0, "y": 50.0, "z": 0.0}
            ]
        }

        sim_resp = client.post("/api/physics/simulate", json=payload)
        self.assertEqual(sim_resp.status_code, 200)
        res = sim_resp.json()

        self.assertIn("blast", res)
        self.assertIn("hazardZones", res)
        self.assertIn("assetExposures", res)
        self.assertEqual(len(res["hazardZones"]), 3)
        self.assertEqual(len(res["assetExposures"]), 2)

        west_exp = next(a for a in res["assetExposures"] if a["assetId"] == "T-WEST")
        east_exp = next(a for a in res["assetExposures"] if a["assetId"] == "T-EAST")

        self.assertGreater(west_exp["overpressureKpa"], east_exp["overpressureKpa"])
        self.assertGreater(west_exp["windFactor"], east_exp["windFactor"])


if __name__ == "__main__":
    unittest.main()
