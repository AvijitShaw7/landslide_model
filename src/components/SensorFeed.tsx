"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Radio,
  Battery,
  CloudRain,
  Thermometer,
  Wind,
  Activity,
  AlertTriangle,
  Wifi,
  WifiOff,
} from "lucide-react";
import type { NERZone } from "@/types";

interface Props {
  zones: NERZone[];
  selectedZone: NERZone;
}

export function SensorFeed({ zones, selectedZone }: Props) {
  const [tick, setTick] = useState(0);
  // Derive readings in state so Math.random() only runs client-side (avoids SSR hydration mismatch)
  const [readings, setReadings] = useState(() =>
    selectedZone.sensors.map((s) => ({
      ...s,
      rainfall: (selectedZone.rainfall24h / 24).toFixed(1),
      soilMoisture: selectedZone.soilMoisture.toFixed(0),
      inclination: "0.20",
      temp: "24.0",
      signalDbm: "-65",
    }))
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
      // Update readings with random jitter inside useEffect (client-only)
      setReadings(
        selectedZone.sensors.map((s) => ({
          ...s,
          rainfall: (selectedZone.rainfall24h / 24 + (Math.random() - 0.5) * 2).toFixed(1),
          soilMoisture: (selectedZone.soilMoisture + (Math.random() - 0.5) * 2).toFixed(0),
          inclination: (Math.random() * 0.8 + 0.1).toFixed(2),
          temp: (22 + Math.random() * 5).toFixed(1),
          signalDbm: String(-(50 + Math.random() * 30).toFixed(0)),
        }))
      );
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedZone]);

  return (
    <div
      className="flex items-start h-full overflow-x-auto"
      style={{ background: "var(--bg-primary)" }}
    >
      {/* Section title */}
      <div
        className="flex items-center gap-2 px-3 h-full shrink-0 border-r"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <div className="text-center">
          <div className="flex items-center gap-1.5 mb-1">
            <Radio size={12} style={{ color: "var(--accent-cyan)" }} />
            <span className="text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>
              SENSOR FEED
            </span>
          </div>
          <div className="text-[9px]" style={{ color: "var(--text-muted)" }}>
            {selectedZone.name}
          </div>
          <div
            className="mt-1 text-[9px] px-1.5 py-0.5 rounded font-bold"
            style={{
              background: "rgba(16,185,129,0.12)",
              color: "var(--accent-emerald)",
              border: "1px solid rgba(16,185,129,0.25)",
            }}
          >
            LIVE
          </div>
        </div>
      </div>

      {/* Sensor cards */}
      {readings.map((sensor, i) => (
        <div
          key={sensor.id}
          className="flex flex-col justify-center px-3 py-2 h-full border-r shrink-0"
          style={{
            borderColor: "var(--border-subtle)",
            minWidth: "160px",
            background:
              sensor.status === "offline"
                ? "rgba(100,116,139,0.04)"
                : sensor.status === "degraded"
                ? "rgba(245,158,11,0.04)"
                : "transparent",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              {sensor.status === "online" ? (
                <Wifi size={10} style={{ color: "var(--accent-emerald)" }} />
              ) : sensor.status === "degraded" ? (
                <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1 }}>
                  <Wifi size={10} style={{ color: "var(--accent-amber)" }} />
                </motion.div>
              ) : (
                <WifiOff size={10} style={{ color: "var(--text-muted)" }} />
              )}
              <span
                className="text-[10px] font-bold"
                style={{
                  color:
                    sensor.status === "online"
                      ? "var(--text-secondary)"
                      : sensor.status === "degraded"
                      ? "var(--accent-amber)"
                      : "var(--text-muted)",
                }}
              >
                {sensor.id}
              </span>
            </div>
            <div
              className="text-[9px] font-bold px-1 py-0.5 rounded"
              style={{
                background:
                  sensor.status === "online"
                    ? "rgba(16,185,129,0.12)"
                    : sensor.status === "degraded"
                    ? "rgba(245,158,11,0.12)"
                    : "rgba(100,116,139,0.12)",
                color:
                  sensor.status === "online"
                    ? "var(--accent-emerald)"
                    : sensor.status === "degraded"
                    ? "var(--accent-amber)"
                    : "var(--text-muted)",
              }}
            >
              {sensor.status.toUpperCase()}
            </div>
          </div>

          <div className="text-[9px] mb-1.5" style={{ color: "var(--text-muted)" }}>
            {sensor.type}
          </div>

          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={`rf-${tick}`}
                initial={{ opacity: 0.6 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-1"
              >
                <CloudRain size={9} style={{ color: "var(--accent-cyan)" }} />
                <span className="text-[10px] mono" style={{ color: "var(--text-secondary)" }}>
                  {sensor.status !== "offline" ? `${sensor.rainfall}mm/h` : "--"}
                </span>
              </motion.div>
            </AnimatePresence>
            <motion.div
              key={`sm-${tick}`}
              animate={{ opacity: [0.7, 1] }}
              className="flex items-center gap-1"
            >
              <Thermometer size={9} style={{ color: "var(--accent-amber)" }} />
              <span className="text-[10px] mono" style={{ color: "var(--text-secondary)" }}>
                {sensor.status !== "offline" ? `${sensor.soilMoisture}%` : "--"}
              </span>
            </motion.div>
            <motion.div
              key={`inc-${tick}`}
              animate={{ opacity: [0.7, 1] }}
              className="flex items-center gap-1"
            >
              <Activity size={9} style={{ color: "var(--accent-red)" }} />
              <span
                className="text-[10px] mono"
                style={{
                  color:
                    sensor.status !== "offline" && parseFloat(sensor.inclination) > 0.5
                      ? "var(--accent-red)"
                      : "var(--text-secondary)",
                }}
              >
                {sensor.status !== "offline" ? `${sensor.inclination}°` : "--"}
              </span>
            </motion.div>
            <div className="flex items-center gap-1">
              <Battery size={9} style={{ color: sensor.battery < 30 ? "var(--accent-red)" : "var(--accent-emerald)" }} />
              <span
                className="text-[10px] mono"
                style={{ color: sensor.battery < 30 ? "var(--accent-red)" : "var(--text-secondary)" }}
              >
                {sensor.battery}%
              </span>
            </div>
          </div>
        </div>
      ))}

      {/* Global sensor stats */}
      <div
        className="flex flex-col justify-center px-4 py-2 h-full border-r shrink-0"
        style={{ borderColor: "var(--border-subtle)", minWidth: "140px" }}
      >
        <div className="text-[9px] font-bold mb-2" style={{ color: "var(--text-muted)" }}>
          ALL ZONES SUMMARY
        </div>
        {[
          { label: "Online", count: 11, color: "var(--accent-emerald)" },
          { label: "Degraded", count: 1, color: "var(--accent-amber)" },
          { label: "Offline", count: 1, color: "var(--text-muted)" },
        ].map((s) => (
          <div key={s.label} className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                {s.label}
              </span>
            </div>
            <span className="text-[11px] font-bold mono" style={{ color: s.color }}>
              {s.count}
            </span>
          </div>
        ))}
      </div>

      {/* IMD warning banner */}
      <div
        className="flex flex-col justify-center px-3 py-2 h-full shrink-0"
        style={{ minWidth: "180px" }}
      >
        <div className="text-[9px] font-bold mb-1.5" style={{ color: "var(--text-muted)" }}>
          IMD ALERTS
        </div>
        {["RED — Dima Hasao", "RED — Cachar", "ORANGE — Champhai"].map((alert, i) => (
          <motion.div
            key={alert}
            animate={i === 0 ? { opacity: [0.6, 1, 0.6] } : {}}
            transition={{ repeat: Infinity, duration: 2 }}
            className="flex items-center gap-1.5 mb-1 text-[10px]"
          >
            <AlertTriangle
              size={9}
              style={{ color: alert.startsWith("RED") ? "var(--accent-red)" : "var(--accent-amber)" }}
            />
            <span style={{ color: alert.startsWith("RED") ? "#fca5a5" : "#fde68a" }}>
              {alert}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
