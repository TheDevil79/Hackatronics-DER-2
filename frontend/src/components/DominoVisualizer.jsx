import React, { useState, useEffect, useRef, useMemo } from "react";

/**
 * DominoVisualizer: Interactive Multi-Epicenter Cascading Blast Visualizer
 * Features 360° omnidirectional blast waves expanding outwards from every detonating asset.
 * Includes pan & zoom controls (Mouse wheel, Drag to pan, Zoom In/Out/Fit buttons).
 */
export default function DominoVisualizer({
  assets = [],
  steps = [],
  sourceAsset = {},
  currentTime = 0,
  setCurrentTime,
  isPlaying = false,
  setIsPlaying,
  playbackSpeed = 2,
  setPlaybackSpeed,
  onReset,
  onSelectEpicenter
}) {
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  // Zoom & Pan state (default 0.75x so the entire blast radius wave in all directions is fully visible)
  const [zoom, setZoom] = useState(0.75);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Determine timeline duration
  const maxTime = useMemo(() => {
    if (!steps || steps.length === 0) return 240;
    const maxDelay = Math.max(...steps.map((s) => Number(s.estimatedDelaySeconds) || 0));
    return Math.max(maxDelay + 10, 250);
  }, [steps]);

  // Coordinate mapping to SVG canvas (900 x 480)
  const SVG_WIDTH = 900;
  const SVG_HEIGHT = 480;
  const PADDING = 90;

  // Gather relevant assets: chain assets + neighbors
  const relevantAssets = useMemo(() => {
    const chainIds = new Set([
      sourceAsset?.id || "T-101",
      ...steps.map((s) => s.triggerAssetId),
      ...steps.map((s) => s.targetAssetId)
    ]);

    const list = assets.filter((a) => chainIds.has(a.id));
    const neighbors = assets.filter((a) => !chainIds.has(a.id)).slice(0, 4);
    return [...list, ...neighbors];
  }, [assets, steps, sourceAsset]);

  // Compute clean normalized coordinates with generous spacing for blast waves
  const assetCoords = useMemo(() => {
    if (relevantAssets.length === 0) return {};

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    relevantAssets.forEach((a) => {
      const x = Number(a.x) || 0;
      const y = Number(a.y) || 0;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    });

    const rangeX = Math.max(maxX - minX, 20);
    const rangeY = Math.max(maxY - minY, 20);

    const map = {};
    relevantAssets.forEach((a) => {
      const x = Number(a.x) || 0;
      const y = Number(a.y) || 0;
      const svgX = PADDING + ((x - minX) / rangeX) * (SVG_WIDTH - 2 * PADDING);
      const svgY = SVG_HEIGHT - (PADDING + ((y - minY) / rangeY) * (SVG_HEIGHT - 2 * PADDING));
      map[a.id] = {
        x: Math.round(svgX),
        y: Math.round(svgY),
        raw: a
      };
    });

    // Ensure sourceAsset is mapped
    const srcId = sourceAsset?.id || "T-101";
    if (!map[srcId]) {
      map[srcId] = { x: 200, y: 300, raw: sourceAsset };
    }

    return map;
  }, [relevantAssets, sourceAsset]);

  // Mouse wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 0.88;
    setZoom((prev) => Math.max(0.35, Math.min(2.8, +(prev * factor).toFixed(2))));
  };

  // Drag to pan
  const handleMouseDown = (e) => {
    if (e.target.closest(".domino-asset-node") || e.target.closest(".domino-zoom-controls")) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Timeline playback loop
  const timerRef = useRef(null);
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
      return;
    }

    let lastTimestamp = performance.now();

    const tick = (now) => {
      const deltaMs = now - lastTimestamp;
      lastTimestamp = now;

      const simulatedDelta = (deltaMs / 1000) * (playbackSpeed * 12);

      setCurrentTime((prev) => {
        const next = prev + simulatedDelta;
        if (next >= maxTime) {
          setIsPlaying(false);
          return maxTime;
        }
        return next;
      });

      timerRef.current = requestAnimationFrame(tick);
    };

    timerRef.current = requestAnimationFrame(tick);

    return () => {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
    };
  }, [isPlaying, playbackSpeed, maxTime, setCurrentTime, setIsPlaying]);

  // List of explosive blast events (Primary epicenter + secondary receptors)
  const blastEvents = useMemo(() => {
    const srcId = sourceAsset?.id || "T-101";
    const srcPos = assetCoords[srcId] || { x: 200, y: 300 };

    const events = [
      {
        id: srcId,
        name: sourceAsset?.name || "Primary LPG Storage",
        detonateTime: 0,
        x: srcPos.x,
        y: srcPos.y,
        maxRadius: 280,
        expansionSpeed: 24,
        peakOverpressureKpa: 485,
        mechanism: "PRIMARY_VAPOR_EXPLOSION",
        color: "#ff2a4b",
        gradientId: "blastGradPrimary",
        badgeAngle: { cos: -0.707, sin: -0.707 } // Top-left
      }
    ];

    steps.forEach((step, idx) => {
      const targetPos = assetCoords[step.targetAssetId];
      if (!targetPos) return;

      const delay = Number(step.estimatedDelaySeconds) || 0;
      const isPipe = step.targetAssetId.includes("PIPE");
      const isTank = step.targetAssetId.includes("T-");

      // Distribute badges in distinct quadrants
      const anglePresets = [
        { cos: 0.707, sin: -0.707 }, // Top-right
        { cos: 0.866, sin: 0.5 },    // Bottom-right
        { cos: -0.707, sin: 0.707 }  // Bottom-left
      ];

      events.push({
        id: step.targetAssetId,
        name: step.targetAssetId,
        detonateTime: delay,
        x: targetPos.x,
        y: targetPos.y,
        maxRadius: isTank ? 300 : isPipe ? 200 : 180,
        expansionSpeed: isTank ? 22 : 19,
        peakOverpressureKpa: isTank ? 410 : isPipe ? 290 : 210,
        mechanism: step.mechanism || "SECONDARY_CASCADE_BLAST",
        color: isTank ? "#ff3b30" : isPipe ? "#ff9f1c" : "#ff5247",
        gradientId: isTank ? "blastGradBleve" : isPipe ? "blastGradPipe" : "blastGradPump",
        badgeAngle: anglePresets[idx % anglePresets.length]
      });
    });

    return events.sort((a, b) => a.detonateTime - b.detonateTime);
  }, [steps, sourceAsset, assetCoords]);

  // Calculate active expanding blast waves
  const activeBlastWaves = useMemo(() => {
    return blastEvents
      .filter((ev) => currentTime >= ev.detonateTime)
      .map((ev) => {
        const dt = currentTime - ev.detonateTime;
        const currentRadius = Math.min(ev.maxRadius, 14 + Math.sqrt(dt) * ev.expansionSpeed);
        const pressureDecay = Math.max(
          1.2,
          +(ev.peakOverpressureKpa / Math.pow(Math.max(1, currentRadius / 35), 1.35)).toFixed(1)
        );

        return {
          ...ev,
          dt,
          currentRadius,
          currentOverpressureKpa: pressureDecay,
          expansionPct: Math.min(100, Math.round((currentRadius / ev.maxRadius) * 100))
        };
      });
  }, [blastEvents, currentTime]);

  // Current active status summary
  const currentPhase = useMemo(() => {
    const activeCount = activeBlastWaves.length;
    const nextUpcoming = blastEvents.find((b) => b.detonateTime > currentTime);

    if (activeCount === 0) {
      return {
        stage: "SYSTEM STANDBY",
        message: "Facility normal. Press PLAY to initiate cascade simulation.",
        threatLevel: "NORMAL"
      };
    }

    if (nextUpcoming) {
      return {
        stage: `BLAST WAVEFRONT EXPANDING (${activeCount} DETONATING)`,
        message: `${activeBlastWaves[activeBlastWaves.length - 1].id} shockwave radiating 360°. Approaching ${nextUpcoming.id} (detonation in ${Math.max(0, Math.round(nextUpcoming.detonateTime - currentTime))}s)`,
        threatLevel: "ESCALATING",
        targetAssetId: nextUpcoming.id
      };
    }

    return {
      stage: "CASCADE CONCLUDED",
      message: `Full domino cascade complete. All ${blastEvents.length} blast centers detonated omnidirectionally. Total plant perimeter compromised.`,
      threatLevel: "TOTAL_LOSS"
    };
  }, [activeBlastWaves, blastEvents, currentTime]);

  return (
    <div className="domino-visualizer-container">
      {/* 1. TOP STATUS TICKER & HUD */}
      <div className="domino-hud-bar">
        <div className="hud-left">
          <span className={`hud-live-pill ${currentPhase.threatLevel === "TOTAL_LOSS" ? "danger" : ""}`}>
            ● {currentPhase.stage}
          </span>
          <span className="hud-message">{currentPhase.message}</span>
        </div>

        <div className="hud-right">
          <span className="hud-clock-label">ELAPSED ESCALATION</span>
          <span className="hud-digital-clock">
            T+{Math.round(currentTime)}s <small>/ {maxTime}s</small>
          </span>
        </div>
      </div>

      {/* 2. OMNIDIRECTIONAL BLAST PROPAGATION 2D MAP (SVG) WITH PAN & ZOOM */}
      <div className="domino-canvas-wrapper">
        {/* Floating Zoom & Pan Controls Toolbar */}
        <div className="domino-zoom-controls" pointerEvents="auto">
          <button
            className="zoom-btn"
            onClick={() => setZoom((z) => Math.max(0.35, +(z - 0.15).toFixed(2)))}
            title="Zoom Out (Scroll wheel down)"
          >
            －
          </button>
          <span className="zoom-display" title="Current Zoom Level">
            {Math.round(zoom * 100)}%
          </span>
          <button
            className="zoom-btn"
            onClick={() => setZoom((z) => Math.min(2.8, +(z + 0.15).toFixed(2)))}
            title="Zoom In (Scroll wheel up)"
          >
            ＋
          </button>
          <button
            className="zoom-btn-fit"
            onClick={() => {
              setZoom(0.68);
              setPan({ x: 0, y: 0 });
            }}
            title="Fit Entire Blast Radius & Facility"
          >
            ⊡ FIT ALL
          </button>
          <button
            className="zoom-btn-fit"
            onClick={() => {
              setZoom(1.0);
              setPan({ x: 0, y: 0 });
            }}
            title="Reset to 100% (1:1)"
          >
            1:1
          </button>
        </div>

        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          className="domino-svg-canvas"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: isDragging ? "grabbing" : "grab" }}
        >
          <defs>
            {/* Background Blueprint Grid */}
            <pattern id="dominoGrid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
            </pattern>

            {/* Glowing filter for fireballs and supersonic shockwaves */}
            <filter id="glowBlast" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Radial Gradients for 360° Expanding Fireball Disks */}
            <radialGradient id="blastGradPrimary" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="25%" stopColor="#ffd000" stopOpacity="0.65" />
              <stop offset="55%" stopColor="#ff7b00" stopOpacity="0.35" />
              <stop offset="85%" stopColor="#ff2a4b" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#ff2a4b" stopOpacity="0" />
            </radialGradient>

            <radialGradient id="blastGradPipe" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="30%" stopColor="#ff9f1c" stopOpacity="0.6" />
              <stop offset="70%" stopColor="#ff5247" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#ff5247" stopOpacity="0" />
            </radialGradient>

            <radialGradient id="blastGradBleve" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="20%" stopColor="#ffd600" stopOpacity="0.75" />
              <stop offset="50%" stopColor="#ff3b30" stopOpacity="0.4" />
              <stop offset="85%" stopColor="#b30000" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#b30000" stopOpacity="0" />
            </radialGradient>

            <radialGradient id="blastGradPump" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
              <stop offset="35%" stopColor="#ff5247" stopOpacity="0.5" />
              <stop offset="80%" stopColor="#ff1744" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#ff1744" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Background Grid */}
          <rect width={SVG_WIDTH} height={SVG_HEIGHT} fill="#0d1117" />
          <rect width={SVG_WIDTH} height={SVG_HEIGHT} fill="url(#dominoGrid)" />

          {/* ================================================================= */}
          {/* ZOOM & PAN WRAPPER (Transformed from Center of Canvas)            */}
          {/* ================================================================= */}
          <g
            transform={`translate(${SVG_WIDTH / 2 + pan.x}, ${SVG_HEIGHT / 2 + pan.y}) scale(${zoom}) translate(${-SVG_WIDTH / 2}, ${-SVG_HEIGHT / 2})`}
          >
            {/* INTERCONNECTING PIPELINES */}
            {steps.map((step, idx) => {
              const triggerPos = assetCoords[step.triggerAssetId];
              const targetPos = assetCoords[step.targetAssetId];
              if (!triggerPos || !targetPos) return null;

              return (
                <line
                  key={`pipe-${idx}`}
                  x1={triggerPos.x}
                  y1={triggerPos.y}
                  x2={targetPos.x}
                  y2={targetPos.y}
                  stroke="rgba(255, 255, 255, 0.12)"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
              );
            })}

            {/* =============================================================== */}
            {/* 360° OMNIDIRECTIONAL EXPANDING BLAST WAVES & FIREBALL DISKS     */}
            {/* =============================================================== */}
            {activeBlastWaves.map((blast) => {
              const r = blast.currentRadius;
              const isLatest = blast.id === activeBlastWaves[activeBlastWaves.length - 1]?.id;
              const badgePos = {
                x: blast.x + r * blast.badgeAngle.cos,
                y: blast.y + r * blast.badgeAngle.sin
              };

              return (
                <g key={`blast-wave-${blast.id}`} className="omnidirectional-blast-group" pointerEvents="none">
                  {/* 1. Growing Fireball Thermal Radial Disk (360 degrees) */}
                  <circle
                    cx={blast.x}
                    cy={blast.y}
                    r={r}
                    fill={`url(#${blast.gradientId})`}
                  />

                  {/* 2. Leading Supersonic Shockwave Ring (360 degrees boundary) */}
                  <circle
                    cx={blast.x}
                    cy={blast.y}
                    r={r}
                    fill="none"
                    stroke={blast.color}
                    strokeWidth={isLatest ? "2.5" : "1.8"}
                    strokeDasharray={isLatest ? "none" : "6 3"}
                    filter="url(#glowBlast)"
                    opacity={isLatest ? 0.95 : 0.75}
                  />

                  {/* 3. Concentric Shockwave Echo Ripples */}
                  {r > 40 && (
                    <circle
                      cx={blast.x}
                      cy={blast.y}
                      r={r * 0.7}
                      fill="none"
                      stroke={blast.color}
                      strokeWidth="1.2"
                      strokeDasharray="4 4"
                      opacity="0.5"
                    />
                  )}
                  {r > 90 && (
                    <circle
                      cx={blast.x}
                      cy={blast.y}
                      r={r * 0.4}
                      fill="none"
                      stroke="#ffd000"
                      strokeWidth="1"
                      opacity="0.35"
                    />
                  )}

                  {/* 4. Shockwave Leading-Edge Floating Metric Badge (Non-overlapping) */}
                  <g transform={`translate(${badgePos.x}, ${badgePos.y})`}>
                    <rect
                      x="-70"
                      y="-10"
                      width="140"
                      height="20"
                      rx="3"
                      fill="rgba(13, 17, 23, 0.92)"
                      stroke={blast.color}
                      strokeWidth="1"
                    />
                    <text
                      x="0"
                      y="4"
                      textAnchor="middle"
                      fill={blast.color}
                      fontSize="8.5"
                      fontWeight="800"
                      fontFamily="monospace"
                    >
                      💥 {blast.id} BLAST: {Math.round(r)}m · {blast.currentOverpressureKpa} kPa
                    </text>
                  </g>
                </g>
              );
            })}

            {/* FACILITY ASSET NODES */}
            {relevantAssets.map((asset) => {
              const pos = assetCoords[asset.id];
              if (!pos) return null;

              const blastEvent = blastEvents.find((b) => b.id === asset.id);
              const detonateTime = blastEvent ? blastEvent.detonateTime : 999;
              const isRuptured = currentTime >= detonateTime;

              const isEngulfedByBlast = !isRuptured && activeBlastWaves.some((b) => {
                const dist = Math.hypot(b.x - pos.x, b.y - pos.y);
                return b.currentRadius >= dist;
              });

              const isSelected = selectedNodeId === asset.id;

              return (
                <g
                  key={asset.id}
                  className="domino-asset-node"
                  transform={`translate(${pos.x}, ${pos.y})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedNodeId(asset.id);
                    if (detonateTime < 999) {
                      setCurrentTime(detonateTime);
                      setIsPlaying(false);
                    }
                  }}
                  style={{ cursor: "pointer" }}
                >
                  {/* ACTIVE EXPLOSIVE DETONATION AURA */}
                  {isRuptured && (
                    <>
                      <circle r="34" fill="rgba(255, 59, 48, 0.3)" className="blast-ripple-1" />
                      <circle r="44" fill="none" stroke="#ff3b30" strokeWidth="1.5" className="blast-ripple-2" />
                      <circle r="20" fill="#ff2a4b" opacity="0.6" filter="url(#glowBlast)" />
                    </>
                  )}

                  {/* IMPINGEMENT SHOCK HEATING */}
                  {isEngulfedByBlast && (
                    <>
                      <circle r="32" fill="none" stroke="#ff9f1c" strokeWidth="2.5" strokeDasharray="4 3" className="impingement-spin" />
                      <circle r="26" fill="rgba(255, 159, 28, 0.25)" />
                    </>
                  )}

                  {/* Main Node Box */}
                  <rect
                    x="-22"
                    y="-20"
                    width="44"
                    height="40"
                    rx="6"
                    fill={isRuptured ? "#2a0b0d" : isEngulfedByBlast ? "#2b1807" : "#161b22"}
                    stroke={isRuptured ? "#ff3b30" : isEngulfedByBlast ? "#ff9f1c" : isSelected ? "#00f0ff" : "#30363d"}
                    strokeWidth={isRuptured || isEngulfedByBlast || isSelected ? 2.5 : 1.5}
                  />

                  {/* Icon Glyph */}
                  <text
                    x="0"
                    y="4"
                    textAnchor="middle"
                    fill={isRuptured ? "#ff5247" : isEngulfedByBlast ? "#ff9f1c" : "#f0f6fc"}
                    fontSize="15"
                  >
                    {isRuptured ? "🔥" : isEngulfedByBlast ? "⚡" : "▢"}
                  </text>

                  {/* Asset ID Tag */}
                  <text
                    x="0"
                    y="30"
                    textAnchor="middle"
                    fill="#f0f6fc"
                    fontSize="9.5"
                    fontWeight="800"
                    fontFamily="monospace"
                  >
                    {asset.id}
                  </text>

                  {/* State Tag Pill */}
                  <g transform="translate(0, 42)">
                    <rect
                      x="-28"
                      y="-7"
                      width="56"
                      height="14"
                      rx="3"
                      fill={isRuptured ? "#ff3b30" : isEngulfedByBlast ? "#ff9f1c" : "#21262d"}
                    />
                    <text
                      x="0"
                      y="3"
                      textAnchor="middle"
                      fill={isRuptured || isEngulfedByBlast ? "#080c10" : "#8b949e"}
                      fontSize="7.5"
                      fontWeight="900"
                      fontFamily="monospace"
                    >
                      {isRuptured
                        ? `RUPTURED`
                        : isEngulfedByBlast
                        ? `IMPINGED`
                        : "INTACT"}
                    </text>
                  </g>

                  {/* Detonation Time Callout Badge */}
                  {isRuptured && (
                    <g transform="translate(24, -20)">
                      <rect
                        x="-4"
                        y="-8"
                        width="75"
                        height="16"
                        rx="3"
                        fill="rgba(255, 59, 48, 0.9)"
                      />
                      <text
                        x="33"
                        y="3"
                        textAnchor="middle"
                        fill="#fff"
                        fontSize="7.5"
                        fontWeight="800"
                        fontFamily="monospace"
                      >
                        BLAST T+{detonateTime}s
                      </text>
                    </g>
                  )}

                  {/* Quick-Action: Set as Incident Epicenter on Map */}
                  {isSelected && asset.id !== (sourceAsset?.id || "T-101") && onSelectEpicenter && (
                    <g
                      transform="translate(0, -32)"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEpicenter(asset.id);
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      <rect
                        x="-55"
                        y="-9"
                        width="110"
                        height="18"
                        rx="4"
                        fill="#ff3b30"
                        stroke="#ffffff"
                        strokeWidth="1"
                      />
                      <text
                        x="0"
                        y="3.5"
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="8"
                        fontWeight="800"
                        fontFamily="monospace"
                      >
                        💥 SET EPICENTER
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* 3. PLAYBACK SCRUBBER & TIMELINE CONTROLS */}
      <div className="domino-controls-bar">
        <div className="controls-left">
          <button
            className={`domino-btn-primary ${isPlaying ? "playing" : ""}`}
            onClick={() => {
              if (currentTime >= maxTime) setCurrentTime(0);
              setIsPlaying(!isPlaying);
            }}
          >
            {isPlaying ? "⏸ PAUSE" : currentTime >= maxTime ? "↺ REPLAY" : "▶ PLAY CASCADE"}
          </button>

          <button
            className="domino-btn-secondary"
            onClick={() => {
              setCurrentTime(0);
              setIsPlaying(false);
              onReset?.();
            }}
          >
            ↺ RESET (T+0s)
          </button>
        </div>

        {/* Interactive Scrubbing Slider */}
        <div className="timeline-slider-wrapper">
          <input
            type="range"
            min="0"
            max={maxTime}
            step="1"
            value={Math.round(currentTime)}
            onChange={(e) => {
              setCurrentTime(Number(e.target.value));
              setIsPlaying(false);
            }}
            className="domino-scrubber"
          />

          {/* Milestone markers along the slider bar */}
          <div className="timeline-pins-layer">
            {blastEvents.map((b) => {
              const pct = (b.detonateTime / maxTime) * 100;
              const isPast = currentTime >= b.detonateTime;
              return (
                <div
                  key={`pin-${b.id}`}
                  className={`timeline-pin ${isPast ? "reached" : ""}`}
                  style={{ left: `${pct}%` }}
                  onClick={() => {
                    setCurrentTime(b.detonateTime);
                    setIsPlaying(false);
                  }}
                  title={`Click to seek to ${b.id} blast at T+${b.detonateTime}s`}
                >
                  <span className="pin-dot" />
                  <span className="pin-label">T+{b.detonateTime}s ({b.id})</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Speed Controls */}
        <div className="controls-right">
          {[1, 2, 5, 10].map((spd) => (
            <button
              key={spd}
              className={`speed-pill ${playbackSpeed === spd ? "active" : ""}`}
              onClick={() => setPlaybackSpeed(spd)}
            >
              {spd}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
