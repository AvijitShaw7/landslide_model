"use client";

/**
 * RainfallStatusBar
 *
 * A compact horizontal strip sitting just below the stats bar.
 * Shows one chip per NER zone with:
 *   • Glowing Open-Meteo LIVE (Real-Time) indicator with refresh on click
 *   • Accumulated rainfall (mm) and current intensity (mm/h)
 *   • Colour-coded by magnitude
 *   • Skeleton shimmer while the first fetch is in flight
 */

import { motion, AnimatePresence } from "framer-motion";
import { CloudRain, CloudDrizzle, Sun } from "lucide-react";
import type { NERZone } from "@/types";
import type { OpenMeteoResult } from "@/lib/openMeteo";

interface Props {
  zones: NERZone[];
  rainfallMap: Map<string, OpenMeteoResult>;
  isLoading: boolean;
  isOnline?: boolean;
  isMLInference?: boolean;
  errors: Set<string>;
  lastFetched: Date | null;
  refetch?: () => void;
}

function rainColor(mm: number): string {
  if (mm >= 150) return "var(--accent-red)";
  if (mm >= 80) return "var(--accent-amber)";
  if (mm >= 30) return "var(--accent-orange)";
  if (mm >= 5) return "var(--accent-cyan)";
  return "var(--accent-emerald)";
}

function rainBg(mm: number): string {
  if (mm >= 150) return "rgba(239,68,68,0.08)";
  if (mm >= 80) return "rgba(245,158,11,0.08)";
  if (mm >= 30) return "rgba(249,115,22,0.08)";
  if (mm >= 5) return "rgba(6,182,212,0.08)";
  return "rgba(16,185,129,0.08)";
}

function RainIcon({ mm }: { mm: number }) {
  const size = 11;
  if (mm >= 80) return <CloudRain size={size} />;
  if (mm >= 10) return <CloudDrizzle size={size} />;
  return <Sun size={size} />;
}

function Skeleton() {
  return (
    <div
      className="h-2.5 rounded-full animate-pulse"
      style={{ width: "48px", background: "rgba(255,255,255,0.08)" }}
    />
  );
}

export function RainfallStatusBar({
  zones,
  rainfallMap,
  isLoading,
  isOnline = true,
  isMLInference = false,
  errors,
  lastFetched,
  refetch,
}: Props) {
  const handleBadgeClick = () => {
    refetch?.();
    console.log("[Weather API] Fresh data synced", new Date().toLocaleTimeString());
  };

  return (
    <div
      className="flex items-center gap-0 border-b overflow-x-auto shrink-0"
      style={{
        borderColor: "var(--border-subtle)",
        background: "rgba(10,14,26,0.6)",
        height: "36px",
      }}
    >
      {/* Source label & glowing green pill */}
      <div
        className="flex items-center gap-2 px-3 shrink-0 h-full border-r"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <button
          type="button"
          onClick={handleBadgeClick}
          className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold transition-all hover:scale-105 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
          style={{
            background: isOnline ? "rgba(16,185,129,0.14)" : "rgba(255,255,255,0.06)",
            border: isOnline ? "1px solid rgba(16,185,129,0.4)" : "1px solid var(--border-subtle)",
            color: isOnline ? "var(--accent-emerald)" : "var(--text-muted)",
            cursor: "pointer",
          }}
          title="Click to refresh Open-Meteo live weather data"
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isOnline ? "bg-emerald-400 animate-pulse shadow-[0_0_4px_#34d399]" : "bg-zinc-500"
            }`}
          />
          <span>● Open-Meteo LIVE</span>
        </button>

        {/* ML Engine Status Badge */}
        <span
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9.5px] font-semibold border"
          style={{
            background: isMLInference ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.12)",
            borderColor: isMLInference ? "rgba(16,185,129,0.35)" : "rgba(245,158,11,0.35)",
            color: isMLInference ? "var(--accent-emerald)" : "var(--accent-amber)",
          }}
          title={isMLInference ? "Machine Learning microservice active (RandomForest-v1)" : "Python ML service offline - using deterministic GSI geotechnical model"}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isMLInference ? "bg-emerald-400 animate-pulse shadow-[0_0_4px_#34d399]" : "bg-amber-400"
            }`}
          />
          <span>
            {isMLInference ? "ML Engine: Active (RandomForest-v1)" : "Heuristic Fallback"}
          </span>
        </span>

        {lastFetched && !isLoading && (
          <span className="text-[9px] mono" style={{ color: "var(--text-muted)" }}>
            {lastFetched.toLocaleTimeString("en-IN", { hour12: false, hour: "2-digit", minute: "2-digit" })} IST
          </span>
        )}
      </div>

      {/* Per-zone chips */}
      {zones.map((zone) => {
        const live = rainfallMap.get(zone.id);
        const color = live ? rainColor(live.rainfall24h) : "var(--text-muted)";

        return (
          <div
            key={zone.id}
            className="flex items-center gap-2 px-3 shrink-0 h-full border-r"
            style={{
              borderColor: "var(--border-subtle)",
              background: live ? rainBg(live.rainfall24h) : "transparent",
            }}
          >
            {/* Zone name abbreviated */}
            <span
              className="text-[9px] font-semibold shrink-0"
              style={{ color: "var(--text-muted)" }}
            >
              {zone.district.split(" ")[0].slice(0, 8)}
            </span>

            {isLoading ? (
              <Skeleton />
            ) : live ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={live.rainfall24h}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-1"
                >
                  <span style={{ color }}>
                    <RainIcon mm={live.rainfall24h} />
                  </span>
                  <span className="text-[10px] font-bold mono" style={{ color }}>
                    {live.rainfall24h}mm
                  </span>
                  {live.currentPrecipitation > 0 && (
                    <span
                      className="text-[9px] mono"
                      style={{ color: "var(--text-muted)" }}
                    >
                      ({live.currentPrecipitation}mm/h now)
                    </span>
                  )}
                  {/* LIVE badge */}
                  <span
                    className="text-[8px] font-bold px-1 rounded"
                    style={{
                      background: "rgba(16,185,129,0.15)",
                      color: "var(--accent-emerald)",
                      border: "1px solid rgba(16,185,129,0.25)",
                    }}
                  >
                    LIVE
                  </span>
                </motion.div>
              </AnimatePresence>
            ) : (
              <span className="text-[9px] mono" style={{ color: "var(--text-muted)" }}>
                {zone.rainfall24h}mm
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
