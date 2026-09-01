"""
Standalone Interactive Matplotlib Visualizer for SafeZone AI Blast Propagation.
Educational demonstrator only - not an engineering safety calculator.
"""

import argparse
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation
from matplotlib.widgets import Button, Slider

from physics_model import (
    sedov_radius,
    shock_speed,
    wind_model,
    wind_asymmetry,
    blast_center,
    blast_front_curve,
    point_overpressure,
)


def pressure_field_grid(X, Y, t, energy, rho, p0, gamma, xi, wind_kmh, direction_deg, x0=0.0, y0=0.0):
    field = np.zeros_like(X)
    for i in range(X.shape[0]):
        for j in range(X.shape[1]):
            p_val, _, _ = point_overpressure(
                x=X[i, j],
                y=Y[i, j],
                t=t,
                energy=energy,
                rho=rho,
                p0=p0,
                gamma=gamma,
                xi=xi,
                wind_kmh=wind_kmh,
                direction_deg=direction_deg,
                x0=x0,
                y0=y0,
            )
            field[i, j] = p_val

    radius = sedov_radius(t, energy, rho, xi)
    velocity = shock_speed(t, energy, rho, xi)
    post_shock = 2.0 * rho * (velocity ** 2) / (gamma + 1.0)
    demo_scale = 0.08 * p0 * (max(energy, 1.0) / 1e9) * 0.45 / (1.0 + (radius / 110.0) * 1.35)
    overpressure = max(post_shock - p0, demo_scale)
    cx, cy = blast_center(t, wind_kmh, direction_deg, x0, y0)
    alpha = wind_asymmetry(wind_kmh)

    return field, radius, velocity, overpressure, cx, cy, alpha


def parse_args():
    parser = argparse.ArgumentParser(
        description="Animate an illustrative blast radius and overpressure field."
    )
    parser.add_argument("--energy", type=float, default=2.82e9, help="Explosion energy in joules")
    parser.add_argument("--wind", type=float, default=25.0, help="Wind speed in km/h")
    parser.add_argument("--wind-dir", type=float, default=90.0, help="Wind direction in degrees from North")
    parser.add_argument("--duration", type=float, default=10.0, help="Simulation duration in seconds")
    parser.add_argument("--time-step", type=float, default=0.1, help="Time step in seconds")
    parser.add_argument("--air-density", type=float, default=1.225, help="Ambient air density in kg/m^3")
    parser.add_argument("--pressure", type=float, default=101325.0, help="Ambient pressure in Pa")
    parser.add_argument("--gamma", type=float, default=1.4, help="Ratio of specific heats")
    parser.add_argument("--xi", type=float, default=1.0, help="Sedov-Taylor similarity constant")
    parser.add_argument("--temperature", type=float, default=25.0, help="Ambient temperature in Celsius")
    parser.add_argument("--grid-points", type=int, default=100, help="Grid resolution per axis")
    parser.add_argument("--frames", type=int, default=100, help="Animation frame count")
    parser.add_argument("--t-start", type=float, default=0.1, help="Initial simulation time")
    parser.add_argument(
        "--compare-winds",
        action="store_true",
        help="Show a small comparison panel for several wind speeds and directions",
    )
    return parser.parse_args()


def build_cases(base_args):
    if not base_args.compare_winds:
        return [
            {
                "label": f"{base_args.wind:.0f} km/h @ {base_args.wind_dir:.0f}°",
                "wind": base_args.wind,
                "direction": base_args.wind_dir,
            }
        ]

    return [
        {"label": "Calm / no wind", "wind": 0.0, "direction": base_args.wind_dir},
        {"label": "Light crosswind", "wind": max(5.0, base_args.wind * 0.4), "direction": (base_args.wind_dir + 90.0) % 360.0},
        {"label": "Moderate wind", "wind": max(15.0, base_args.wind), "direction": base_args.wind_dir},
        {"label": "Strong wind", "wind": max(35.0, base_args.wind * 1.6), "direction": (base_args.wind_dir + 45.0) % 360.0},
    ]


def main():
    args = parse_args()
    duration = max(args.duration, max(args.time_step, args.t_start))
    t_start = max(1e-3, min(args.t_start, duration))
    time_step = max(args.time_step, 1e-3)

    cases = build_cases(args)
    final_radius = sedov_radius(duration, args.energy, args.air_density, args.xi)
    max_wind = max(case["wind"] for case in cases)
    stretch, _, _, _ = wind_model(max_wind)
    extent = max(100.0, 1.5 * final_radius * stretch)

    axis = np.linspace(-extent, extent, int(args.grid_points))
    X, Y = np.meshgrid(axis, axis)

    fig, ax = plt.subplots(figsize=(9, 8))
    plt.subplots_adjust(bottom=0.30, right=0.84)

    field, radius, velocity, overpressure, center_x, center_y, alpha = pressure_field_grid(
        X, Y, t_start, args.energy, args.air_density, args.pressure, args.gamma, args.xi, args.wind, args.wind_dir
    )

    image = ax.imshow(
        field,
        extent=[-extent, extent, -extent, extent],
        origin="lower",
        cmap="inferno",
        interpolation="bilinear",
        aspect="equal",
    )
    fig.colorbar(image, ax=ax, label="Illustrative overpressure (Pa)")

    center_marker = ax.scatter(
        [center_x], [center_y],
        s=180, marker="*", edgecolors="white", linewidths=1.2, zorder=5, label="Advected blast center"
    )
    front, = ax.plot([], [], linewidth=2.4, color="cyan", label="Shock front")
    wind_line, = ax.plot([], [], linewidth=2.0, color="deepskyblue", linestyle="--", label="Wind direction")

    def update_plot(current_time):
        current_wind = float(wind_speed_slider.val)
        current_direction = float(wind_dir_slider.val)
        field, radius, velocity, overpressure, cx, cy, alpha_val = pressure_field_grid(
            X, Y, current_time, args.energy, args.air_density, args.pressure, args.gamma, args.xi, current_wind, current_direction
        )
        image.set_data(field)
        image.set_clim(vmin=0, vmax=max(1.0, float(field.max())))
        center_marker.set_offsets(np.array([[cx, cy]]))

        pts = blast_front_curve(radius, current_wind, current_direction, cx, cy, points=120)
        front_x = [p["x"] for p in pts] + [pts[0]["x"]]
        front_y = [p["y"] for p in pts] + [pts[0]["y"]]
        front.set_data(front_x, front_y)

        wind_len = extent * 0.22
        downwind_rad = np.radians(90.0 - ((current_direction + 180.0) % 360.0))
        wind_line.set_data(
            [cx, cx + wind_len * np.cos(downwind_rad)],
            [cy, cy + wind_len * np.sin(downwind_rad)],
        )

        info.set_text(
            f"t = {current_time:.2f} s\n"
            f"R(t) = {radius:.2f} m\n"
            f"shock speed = {velocity:.2f} m/s\n"
            f"front overpressure ≈ {overpressure:.2e} Pa\n"
            f"alpha = {alpha_val:.2f}\n"
            f"energy = {args.energy:.2e} J\n"
            f"wind = {current_wind:.1f} km/h @ {current_direction:.0f}°"
        )

    info = ax.text(
        0.02, 0.02, "", transform=ax.transAxes, fontsize=10, va="bottom",
        bbox=dict(boxstyle="round", alpha=0.65)
    )
    ax.set(xlabel="x (m)", ylabel="y (m)", title="SafeZone AI — Educational Blast Propagation")
    ax.legend(loc="upper right")

    slider_ax = fig.add_axes([0.16, 0.14, 0.55, 0.030])
    slider = Slider(slider_ax, "Time (s)", t_start, duration, valinit=t_start, valstep=time_step)

    wind_speed_ax = fig.add_axes([0.16, 0.08, 0.55, 0.030])
    wind_speed_slider = Slider(wind_speed_ax, "Wind speed (km/h)", 0.0, max(60.0, args.wind * 2.0, 1.0), valinit=args.wind, valstep=1.0)

    wind_dir_ax = fig.add_axes([0.16, 0.02, 0.55, 0.030])
    wind_dir_slider = Slider(wind_dir_ax, "Wind direction (deg)", 0.0, 359.0, valinit=args.wind_dir, valstep=1.0)

    button_ax = fig.add_axes([0.74, 0.105, 0.10, 0.045])
    button = Button(button_ax, "Pause")
    playing = True

    def slider_changed(val):
        update_plot(float(slider.val))
        fig.canvas.draw_idle()

    slider.on_changed(slider_changed)
    wind_speed_slider.on_changed(slider_changed)
    wind_dir_slider.on_changed(slider_changed)

    def toggle(_):
        nonlocal playing
        playing = not playing
        button.label.set_text("Pause" if playing else "Play")

    button.on_clicked(toggle)

    update_plot(t_start)
    plt.show()


if __name__ == "__main__":
    main()
