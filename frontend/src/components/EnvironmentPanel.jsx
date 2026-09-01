import { useState } from "react";

export default function EnvironmentPanel({
  windSpeed,
  setWindSpeed,
  windDirection,
  setWindDirection,
  temperature = "28.5",
  setTemperature,
  ambientPressure = "101.3",
  setAmbientPressure,
  onReset
}) {
  const [atmosphere, setAtmosphere] = useState("Stable");
  const [humidity, setHumidity] = useState("45");

  const directions = [
    { code: "N", label: "N — North (0°)", deg: 0 },
    { code: "NE", label: "NE — Northeast (45°)", deg: 45 },
    { code: "E", label: "E — East (90°)", deg: 90 },
    { code: "SE", label: "SE — Southeast (135°)", deg: 135 },
    { code: "S", label: "S — South (180°)", deg: 180 },
    { code: "SW", label: "SW — Southwest (225°)", deg: 225 },
    { code: "W", label: "W — West (270°)", deg: 270 },
    { code: "NW", label: "NW — Northwest (315°)", deg: 315 },
  ];

  return (
    <div className="panel environment-panel">
      <div className="panel-heading">
        <div>
          <small>LIVE CONDITIONS</small>
          <h2>Environmental Dynamics</h2>
        </div>
        {onReset && (
          <button className="text-btn" onClick={onReset}>
            RESET DEFAULTS
          </button>
        )}
      </div>

      <div className="environment">
        <div className="environment-main">
          <div
            className="wind-icon"
            style={{
              transform: `rotate(${directions.find((d) => d.code === windDirection)?.deg || 315}deg)`
            }}
          >
            ↑
          </div>

          <div>
            <small>WIND SPEED</small>
            <div className="wind-input">
              <input
                type="number"
                step="0.1"
                min="0"
                max="60"
                value={windSpeed}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setWindSpeed?.(e.target.value)}
              />
              <em>m/s</em>
            </div>
            <span className="wind-kmh-sub">
              ({(Number(windSpeed || 0) * 3.6).toFixed(1)} km/h)
            </span>
          </div>
        </div>

        <div className="environment-row">
          <span>Direction</span>
          <select
            className="wind-direction-input"
            value={windDirection}
            onChange={(e) => setWindDirection?.(e.target.value)}
            aria-label="Wind direction"
          >
            {directions.map((d) => (
              <option key={d.code} value={d.code}>
                {d.label}
              </option>
            ))}
          </select>
        </div>

        <div className="environment-row">
          <span>Atmosphere Class</span>
          <select
            className="wind-direction-input"
            value={atmosphere}
            onChange={(e) => setAtmosphere(e.target.value)}
          >
            <option value="Stable">Class D - Neutral / Stable</option>
            <option value="Very Stable">Class F - Night / Inversion</option>
            <option value="Unstable">Class B - Daytime Convective</option>
          </select>
        </div>

        <div className="environment-row">
          <span>Ambient Temp</span>
          <div className="inline-input">
            <input
              type="number"
              value={temperature}
              onChange={(e) => setTemperature?.(e.target.value)}
              style={{ width: "60px" }}
            />
            <b>°C</b>
          </div>
        </div>

        <div className="environment-row">
          <span>Ambient Pressure</span>
          <div className="inline-input">
            <input
              type="number"
              value={ambientPressure}
              onChange={(e) => setAmbientPressure?.(e.target.value)}
              style={{ width: "60px" }}
            />
            <b>kPa</b>
          </div>
        </div>

        <div className="environment-row">
          <span>Humidity</span>
          <div className="inline-input">
            <input
              type="number"
              value={humidity}
              onChange={(e) => setHumidity(e.target.value)}
              style={{ width: "50px" }}
            />
            <b>%</b>
          </div>
        </div>
      </div>
    </div>
  );
}
