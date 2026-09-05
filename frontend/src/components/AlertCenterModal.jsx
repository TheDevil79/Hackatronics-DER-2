import React, { useState, useEffect } from "react";

/**
 * AlertCenterModal: High-Tech Industrial Safety & Incident Alert Drawer
 * Displays active incident alarms, blast overpressure threats, domino cascade warnings,
 * and evacuation alerts with live acknowledge/mute controls and quick-jump navigations.
 */
export default function AlertCenterModal({
  isOpen,
  onClose,
  simulationResult,
  assets,
  setPage,
  setSelectedId
}) {
  const sourceId = simulationResult?.parameters?.sourceAssetId || "T-101";
  const peakP = simulationResult?.blastMetrics?.peakOverpressureKPa || 320;
  const radius = simulationResult?.blastMetrics?.finalRadiusMeters || 92;
  const dominoSteps = simulationResult?.dominoPropagation || [];

  // Alarms state with acknowledge / dismiss capability
  const [alarms, setAlarms] = useState([
    {
      id: "ALM-001",
      severity: "CRITICAL",
      title: `Critical Blast Incident at ${sourceId}`,
      detail: `Vapor Cloud Explosion detected. Peak overpressure reached ${peakP} kPa with dynamic blast radius of ${radius}m.`,
      timestamp: "LIVE NOW",
      acknowledged: false,
      targetPage: "blast",
      targetId: sourceId,
      actionLabel: "INSPECT BLAST CONTOUR"
    },
    {
      id: "ALM-002",
      severity: "HIGH",
      title: `Domino Failure Escalation Threat`,
      detail: `${dominoSteps.length || 3} secondary vessels within thermal and shock blast envelope. Secondary rupture probability up to 72%.`,
      timestamp: "T+12s ESCALATION",
      acknowledged: false,
      targetPage: "domino",
      targetId: "PIPE-01",
      actionLabel: "VIEW CASCADE SEQUENCE"
    },
    {
      id: "ALM-003",
      severity: "WARNING",
      title: `Evacuation Route Northwest Compromised`,
      detail: `North process corridor intersects active blast perimeter. Personnel must divert to Southeast Gate B or Shelter Alpha.`,
      timestamp: "URGENT ACTION",
      acknowledged: false,
      targetPage: "evacuation",
      targetId: "GATE-B",
      actionLabel: "VIEW SAFE ESCAPE ROUTE"
    },
    {
      id: "ALM-004",
      severity: "ADVISORY",
      title: `Atmospheric Dispersion Boundary`,
      detail: `Wind speed active. Positive-pressure air scrubbers initiated in Shelter Haven Alpha (SAFE-01).`,
      timestamp: "MONITORED",
      acknowledged: true,
      targetPage: "geomap",
      targetId: "SAFE-01",
      actionLabel: "VIEW FACILITY GEOMAP"
    }
  ]);

  const [isMuted, setIsMuted] = useState(false);

  // Web Audio emergency siren beep when critical alarm is active and not muted
  const triggerAlarmBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.25);

      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.28);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      // AudioContext might be restricted until user gesture
    }
  };

  const handleAcknowledge = (id) => {
    setAlarms((prev) =>
      prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a))
    );
  };

  const handleAcknowledgeAll = () => {
    setAlarms((prev) => prev.map((a) => ({ ...a, acknowledged: true })));
  };

  const handleJump = (page, assetId) => {
    if (page) setPage(page);
    if (assetId && setSelectedId) setSelectedId(assetId);
    onClose();
  };

  if (!isOpen) return null;

  const unackCount = alarms.filter((a) => !a.acknowledged).length;

  return (
    <div className="alert-drawer-backdrop" onClick={onClose}>
      <div
        className="alert-drawer-panel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="alert-drawer-header">
          <div className="drawer-header-left">
            <span className={`drawer-live-beacon ${unackCount > 0 ? "active-alarm" : ""}`} />
            <div>
              <span className="drawer-eyebrow">TACTICAL SAFETY CONSOLE</span>
              <h3>INCIDENT & SAFETY ALERTS</h3>
            </div>
          </div>

          <div className="drawer-header-actions">
            <button
              className={`drawer-sound-btn ${isMuted ? "muted" : ""}`}
              onClick={() => {
                if (isMuted) triggerAlarmBeep();
                setIsMuted(!isMuted);
              }}
              title={isMuted ? "Unmute Siren" : "Mute Siren"}
            >
              {isMuted ? "🔇 MUTED" : "🔔 SIREN ON"}
            </button>

            <button className="drawer-close-btn" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        {/* Live Incident Status Banner */}
        <div className="drawer-incident-banner">
          <div className="banner-metric">
            <span className="b-label">ACTIVE RUN ID</span>
            <strong className="b-val danger-text">{simulationResult?.simulationId || "sim-py-active"}</strong>
          </div>
          <div className="banner-metric">
            <span className="b-label">EPICENTER ASSET</span>
            <strong className="b-val">{sourceId}</strong>
          </div>
          <div className="banner-metric">
            <span className="b-label">PEAK OVERPRESSURE</span>
            <strong className="b-val danger-text">{peakP} kPa</strong>
          </div>
          <div className="banner-metric">
            <span className="b-label">BLAST RADIUS</span>
            <strong className="b-val">{radius}m</strong>
          </div>
        </div>

        {/* Controls Toolbar */}
        <div className="drawer-toolbar-sub">
          <span>
            <b>{unackCount}</b> UNACKNOWLEDGED {unackCount === 1 ? "ALARM" : "ALARMS"}
          </span>
          {unackCount > 0 && (
            <button className="ack-all-btn" onClick={handleAcknowledgeAll}>
              ✓ ACKNOWLEDGE ALL ALARMS
            </button>
          )}
        </div>

        {/* Alarms List */}
        <div className="alarms-card-list">
          {alarms.map((alarm) => {
            const isCrit = alarm.severity === "CRITICAL";
            const isHigh = alarm.severity === "HIGH";
            const isWarn = alarm.severity === "WARNING";

            return (
              <div
                key={alarm.id}
                className={`alarm-item-card ${alarm.acknowledged ? "ack" : "unack"} ${isCrit ? "crit-border" : isHigh ? "high-border" : isWarn ? "warn-border" : ""}`}
              >
                <div className="alarm-top-row">
                  <div className="alarm-id-group">
                    <span
                      className={`severity-badge ${isCrit ? "sev-critical" : isHigh ? "sev-high" : isWarn ? "sev-warning" : "sev-advisory"}`}
                    >
                      {alarm.severity}
                    </span>
                    <span className="alarm-id-code">{alarm.id}</span>
                  </div>
                  <span className="alarm-time-code">{alarm.timestamp}</span>
                </div>

                <h4 className="alarm-item-title">{alarm.title}</h4>
                <p className="alarm-item-detail">{alarm.detail}</p>

                <div className="alarm-footer-row">
                  <button
                    className="alarm-action-jump-btn"
                    onClick={() => handleJump(alarm.targetPage, alarm.targetId)}
                  >
                    ▶ {alarm.actionLabel} →
                  </button>

                  {!alarm.acknowledged ? (
                    <button
                      className="alarm-ack-single-btn"
                      onClick={() => handleAcknowledge(alarm.id)}
                    >
                      ✓ ACKNOWLEDGE
                    </button>
                  ) : (
                    <span className="alarm-ack-badge">✓ ACKNOWLEDGED</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Tactical Directive Footer */}
        <div className="drawer-tactical-footer">
          <div className="directive-row">
            <span>TACTICAL MITIGATION PROTOCOL:</span>
            <strong>EXECUTE AUTOMATIC WATER DELUGE AT T-102 & EVACUATE ZONE 01</strong>
          </div>
          <button
            className="emergency-drill-btn"
            onClick={() => handleJump("domino", "PIPE-01")}
          >
            ACTIVATE DELUGE INTERLOCK 🛡️
          </button>
        </div>
      </div>
    </div>
  );
}
