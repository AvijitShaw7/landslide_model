"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle,
  Thermometer,
  CloudRain,
  Mountain,
  Radio,
  ChevronRight,
} from "lucide-react";
import type { NERZone } from "@/types";

const RISK_CONFIG = {
  CRITICAL: { color: "var(--accent-red)", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.3)" },
  HIGH: { color: "var(--accent-amber)", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.3)" },
  MODERATE: { color: "var(--accent-orange)", bg: "rgba(249,115,22,0.1)", border: "rgba(249,115,22,0.3)" },
  LOW: { color: "var(--accent-emerald)", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.3)" },
  SAFE: { color: "var(--accent-cyan)", bg: "rgba(6,182,212,0.1)", border: "rgba(6,182,212,0.3)" },
};

interface Props {
  zones: NERZone[];
  selectedZoneId: string;
  onSelectZone: (id: string) => void;
  t: Record<string, string>;
}

export function ZoneSidebar({ zones, selectedZoneId, onSelectZone, t }: Props) {
  return (
    <div
      className="flex flex-col border-r overflow-hidden"
      style={{
        width: "240px",
        borderColor: "var(--border-subtle)",
        background: "var(--bg-secondary)",
      }}
    >
      <div
        className="px-3 py-2 border-b flex items-center justify-between"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <div className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>
          MONITORED ZONES
        </div>
        <div
          className="text-[10px] font-bold px-1.5 py-0.5 rounded mono"
          style={{ background: "rgba(59,130,246,0.1)", color: "var(--accent-blue)" }}
        >
          {zones.length} ZONES
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {zones.map((zone, i) => {
          const cfg = RISK_CONFIG[zone.risk];
          const isSelected = zone.id === selectedZoneId;

          return (
            <motion.button
              key={zone.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => onSelectZone(zone.id)}
              className="w-full text-left px-3 py-3 border-b transition-all group relative"
              style={{
                borderColor: "var(--border-subtle)",
                background: isSelected ? cfg.bg : "transparent",
                borderLeft: isSelected ? `3px solid ${cfg.color}` : "3px solid transparent",
              }}
            >
              {/* Risk badge + name */}
              <div className="flex items-start justify-between gap-1">
                <div className="flex-1 min-w-0">
                  <div
                    className="text-xs font-semibold truncate"
                    style={{ color: isSelected ? cfg.color : "var(--text-primary)" }}
                  >
                    {zone.name}
                  </div>
                  <div className="text-[10px] mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>
                    {zone.district}, {zone.state}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                    style={{
                      background: cfg.bg,
                      color: cfg.color,
                      border: `1px solid ${cfg.border}`,
                    }}
                  >
                    {zone.risk}
                  </span>
                  {isSelected && (
                    <ChevronRight size={10} style={{ color: cfg.color }} />
                  )}
                </div>
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-1">
                  <CloudRain size={10} style={{ color: "var(--accent-cyan)" }} />
                  <span className="text-[10px] mono" style={{ color: "var(--text-muted)" }}>
                    {zone.rainfall24h}mm
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Thermometer size={10} style={{ color: "var(--accent-amber)" }} />
                  <span className="text-[10px] mono" style={{ color: "var(--text-muted)" }}>
                    {zone.soilMoisture}%
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Mountain size={10} style={{ color: "var(--accent-purple)" }} />
                  <span className="text-[10px] mono" style={{ color: "var(--text-muted)" }}>
                    {zone.slope}°
                  </span>
                </div>
              </div>

              {/* Risk bar */}
              <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${zone.riskScore}%` }}
                  transition={{ delay: i * 0.05 + 0.3, duration: 0.6 }}
                  className="h-full rounded-full"
                  style={{ background: cfg.color }}
                />
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>
                  Risk
                </span>
                <span className="text-[10px] font-bold mono" style={{ color: cfg.color }}>
                  {zone.riskScore}%
                </span>
              </div>

              {/* Sensor dots */}
              <div className="flex items-center gap-1 mt-1.5">
                {zone.sensors.map((s) => (
                  <div
                    key={s.id}
                    className="w-1.5 h-1.5 rounded-full"
                    title={`${s.id}: ${s.status}`}
                    style={{
                      background:
                        s.status === "online"
                          ? "var(--accent-emerald)"
                          : s.status === "degraded"
                          ? "var(--accent-amber)"
                          : "var(--text-muted)",
                    }}
                  />
                ))}
                <span className="text-[9px] ml-1" style={{ color: "var(--text-muted)" }}>
                  {zone.sensors.filter((s) => s.status === "online").length}/{zone.sensors.length} sensors
                </span>
              </div>

              {/* CRITICAL animation */}
              {zone.risk === "CRITICAL" && (
                <motion.div
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="absolute top-2 right-2"
                >
                  <AlertTriangle size={10} style={{ color: "var(--accent-red)" }} />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Footer */}
      <div
        className="px-3 py-2 border-t"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: "var(--accent-emerald)", animation: "pulse-glow 1.5s infinite" }} />
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            Live · Refresh 60s
          </span>
        </div>
      </div>
    </div>
  );
}
