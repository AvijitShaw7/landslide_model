"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  TrendingUp,
  BarChart3,
  ChevronDown,
  AlertTriangle,
  Info,
  CloudDrizzle,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { SHAP_FACTORS_24H, FORECAST_24H, FORECAST_48H, FORECAST_72H } from "@/lib/data";
import type { NERZone, ForecastHorizon } from "@/types";
import type { OpenMeteoResult } from "@/lib/openMeteo";

const FORECAST_DATA = {
  24: FORECAST_24H,
  48: FORECAST_48H,
  72: FORECAST_72H,
};

const SHAP_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308",
  "#84cc16", "#06b6d4", "#3b82f6", "#8b5cf6",
];

interface Props {
  zone: NERZone;
  /** Live Open-Meteo rainfall for this zone — null while loading or on fetch error */
  rainfallLive: OpenMeteoResult | null;
  t: Record<string, string>;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs"
      style={{ background: "#0f1628", border: "1px solid rgba(59,130,246,0.3)" }}
    >
      <div style={{ color: "#94a3b8" }}>+{label}h</div>
      <div style={{ color: "#ef4444" }}>Risk: {payload[0]?.value}%</div>
      <div style={{ color: "#06b6d4" }}>Rain: {payload[1]?.value}mm/h</div>
      <div style={{ color: "#64748b" }}>Conf: {payload[2]?.value}%</div>
    </div>
  );
};

export function AIEngine({ zone, rainfallLive, t }: Props) {
  const [horizon, setHorizon] = useState<ForecastHorizon>(24);
  const [showShap, setShowShap] = useState(true);
  const [dataMode, setDataMode] = useState<"BASELINE" | "LIVE">("LIVE");
  const forecastData = FORECAST_DATA[horizon];

  const riskColor =
    zone.riskScore >= 80
      ? "var(--accent-red)"
      : zone.riskScore >= 60
      ? "var(--accent-amber)"
      : "var(--accent-emerald)";

  return (
    <div
      className="border-b"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}
          >
            <Brain size={13} color="white" />
          </div>
          <div>
            <div className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>
              {t.aiEngine}
            </div>
            <div className="text-[9px]" style={{ color: "var(--text-muted)" }}>
              Multi-Modal Fusion · SHAP XAI
            </div>
          </div>
        </div>

        {/* BASELINE | LIVE Toggle */}
        <div
          className="flex items-center p-0.5 rounded-lg border text-[9px] font-bold"
          style={{
            background: "rgba(10,14,26,0.85)",
            borderColor: "var(--border-subtle)",
          }}
        >
          <button
            type="button"
            onClick={() => setDataMode("BASELINE")}
            className="px-2 py-0.5 rounded transition-all cursor-pointer"
            style={{
              background: dataMode === "BASELINE" ? "rgba(245,158,11,0.2)" : "transparent",
              color: dataMode === "BASELINE" ? "var(--accent-amber)" : "var(--text-muted)",
              border: dataMode === "BASELINE" ? "1px solid rgba(245,158,11,0.4)" : "1px solid transparent",
            }}
          >
            BASELINE
          </button>
          <button
            type="button"
            onClick={() => setDataMode("LIVE")}
            className="flex items-center gap-1 px-2.5 py-0.5 rounded transition-all cursor-pointer shadow-[0_0_8px_rgba(16,185,129,0.3)]"
            style={{
              background: dataMode === "LIVE" ? "rgba(16,185,129,0.22)" : "transparent",
              color: dataMode === "LIVE" ? "var(--accent-emerald)" : "var(--text-muted)",
              border: dataMode === "LIVE" ? "1px solid rgba(16,185,129,0.45)" : "1px solid transparent",
            }}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                dataMode === "LIVE" ? "bg-emerald-400 animate-pulse shadow-[0_0_4px_#34d399]" : "bg-zinc-600"
              }`}
            />
            <span>LIVE</span>
          </button>
        </div>
      </div>

      {/* Risk Probability Meter */}
      <div className="px-3 py-3 border-b" style={{ borderColor: "var(--border-subtle)" }}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-[10px] font-semibold" style={{ color: "var(--text-secondary)" }}>
              RISK PROBABILITY — {zone.name}
            </span>
            {/* Live or baseline rainfall sub-label */}
            {dataMode === "LIVE" && rainfallLive ? (
              <div className="flex items-center gap-1.5 mt-0.5">
                <CloudDrizzle size={10} style={{ color: "var(--accent-cyan)" }} />
                <span className="text-[9px] mono font-semibold" style={{ color: "var(--accent-cyan)" }}>
                  {rainfallLive.rainfall24h} mm/24h
                  {rainfallLive.currentPrecipitation > 0 &&
                    ` · ${rainfallLive.currentPrecipitation} mm/h now`}
                </span>
                <span
                  className="text-[8px] font-bold px-1 py-0.2 rounded"
                  style={{
                    background: "rgba(16,185,129,0.18)",
                    color: "var(--accent-emerald)",
                    border: "1px solid rgba(16,185,129,0.3)",
                  }}
                >
                  REAL-TIME
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[9px] mono" style={{ color: "var(--text-muted)" }}>
                  {zone.rainfall24h} mm/24h (Static IMD Baseline)
                </span>
              </div>
            )}
          </div>
          <motion.span
            key={zone.riskScore}
            initial={{ scale: 1.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-xl font-black mono"
            style={{ color: riskColor }}
          >
            {zone.riskScore}%
          </motion.span>
        </div>

        {/* Gradient meter */}
        <div className="relative h-4 rounded-full overflow-hidden mb-1"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              background: "linear-gradient(to right, #10b981, #f59e0b, #ef4444)",
              width: "100%",
              opacity: 0.3,
            }}
          />
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${zone.riskScore}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ background: `linear-gradient(to right, #10b981, #f59e0b, ${riskColor})` }}
          />
          {/* Danger threshold line */}
          <div
            className="absolute top-0 bottom-0 w-px"
            style={{ left: "75%", background: "rgba(239,68,68,0.8)" }}
          />
        </div>
        <div className="flex justify-between text-[9px]" style={{ color: "var(--text-muted)" }}>
          <span>LOW</span><span>MOD</span><span>HIGH</span><span>CRITICAL</span>
        </div>

        {/* Trigger */}
        <div
          className="mt-2 flex items-start gap-1.5 px-2 py-1.5 rounded text-[10px]"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
        >
          <AlertTriangle size={10} style={{ color: "var(--accent-red)", marginTop: "1px", flexShrink: 0 }} />
          <span style={{ color: "#fca5a5" }}>{zone.trigger}</span>
        </div>
      </div>

      {/* Forecast Horizon Tabs */}
      <div className="px-3 py-2 border-b" style={{ borderColor: "var(--border-subtle)" }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold" style={{ color: "var(--text-secondary)" }}>
            <TrendingUp size={10} className="inline mr-1" />
            {t.forecast}
          </span>
          <div className="flex gap-1">
            {([24, 48, 72] as ForecastHorizon[]).map((h) => (
              <button
                key={h}
                onClick={() => setHorizon(h)}
                className="px-2 py-0.5 rounded text-[10px] font-bold transition-all"
                style={{
                  background: horizon === h ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${horizon === h ? "rgba(59,130,246,0.5)" : "transparent"}`,
                  color: horizon === h ? "#60a5fa" : "var(--text-muted)",
                }}
              >
                {h}h
              </button>
            ))}
          </div>
        </div>

        {/* Chart */}
        <AnimatePresence mode="wait">
          <motion.div
            key={horizon}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}
            style={{ height: "110px" }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecastData} margin={{ top: 4, right: 0, left: -30, bottom: 0 }}>
                <defs>
                  <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="rainGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="hour"
                  tick={{ fontSize: 8, fill: "#64748b" }}
                  tickFormatter={(v) => `+${v}h`}
                />
                <YAxis tick={{ fontSize: 8, fill: "#64748b" }} domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={75} stroke="rgba(239,68,68,0.4)" strokeDasharray="3 3" />
                <Area
                  type="monotone"
                  dataKey="risk"
                  stroke="#ef4444"
                  strokeWidth={1.5}
                  fill="url(#riskGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="rainfall"
                  stroke="#06b6d4"
                  strokeWidth={1}
                  fill="url(#rainGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="confidence"
                  stroke="rgba(139,92,246,0.4)"
                  strokeWidth={1}
                  strokeDasharray="4 2"
                  fill="none"
                />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center gap-4 mt-1">
          {[
            { color: "#ef4444", label: "Risk %" },
            { color: "#06b6d4", label: "Rainfall" },
            { color: "#8b5cf6", label: "Confidence" },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1">
              <div className="w-2 h-0.5 rounded" style={{ background: l.color }} />
              <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* SHAP Factor Breakdown */}
      <div className="px-3 py-2">
        <button
          onClick={() => setShowShap(!showShap)}
          className="flex items-center justify-between w-full mb-2"
        >
          <div className="flex items-center gap-1.5">
            <BarChart3 size={11} style={{ color: "var(--accent-blue)" }} />
            <span className="text-[10px] font-bold" style={{ color: "var(--text-secondary)" }}>
              Explainable AI (SHAP Factors)
            </span>
          </div>
          <motion.div
            animate={{ rotate: showShap ? 0 : -90 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown size={12} style={{ color: "var(--text-muted)" }} />
          </motion.div>
        </button>

        <AnimatePresence>
          {showShap && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="space-y-1.5">
                {SHAP_FACTORS_24H.map((factor, i) => {
                  const isPositive = factor.contribution > 0;
                  const pct = Math.abs(factor.contribution) * 100;
                  return (
                    <div key={factor.name}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[9px] truncate pr-1" style={{ color: "var(--text-muted)", maxWidth: "140px" }}>
                          {factor.name}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] mono" style={{ color: "var(--text-secondary)" }}>
                            {factor.value}{factor.unit}
                          </span>
                          <span
                            className="text-[9px] font-bold mono"
                            style={{ color: isPositive ? "var(--accent-red)" : "var(--accent-emerald)" }}
                          >
                            {isPositive ? "+" : ""}{(factor.contribution * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ delay: i * 0.04, duration: 0.5 }}
                          className="h-full rounded-full"
                          style={{
                            background: isPositive
                              ? SHAP_COLORS[i % SHAP_COLORS.length]
                              : "var(--accent-emerald)",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div
                className="mt-2 flex items-start gap-1 px-2 py-1.5 rounded text-[9px]"
                style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)" }}
              >
                <Info size={9} style={{ color: "var(--accent-blue)", marginTop: "1px" }} />
                <span style={{ color: "var(--text-muted)" }}>
                  Model: Ensemble (RF + LSTM + InSAR). Confidence: 89%.
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
