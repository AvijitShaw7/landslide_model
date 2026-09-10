"use client";

import { motion } from "framer-motion";
import { WifiOff, X, Phone, AlertTriangle } from "lucide-react";

interface Props {
  t: Record<string, string>;
  onClose: () => void;
}

export function LowBandwidthBanner({ t, onClose }: Props) {
  return (
    <motion.div
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -60, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="relative flex items-center justify-between px-4 py-2 text-xs font-medium"
      style={{
        background: "linear-gradient(to right, rgba(16,185,129,0.15), rgba(6,182,212,0.15))",
        borderBottom: "1px solid rgba(16,185,129,0.3)",
      }}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5" style={{ color: "var(--accent-emerald)" }}>
          <WifiOff size={13} />
          <span className="font-bold">LOW-BANDWIDTH MODE</span>
        </div>
        <span style={{ color: "var(--text-secondary)" }}>{t.lowBandwidth}</span>
        <div
          className="flex items-center gap-1.5 px-2 py-1 rounded"
          style={{
            background: "rgba(16,185,129,0.12)",
            border: "1px solid rgba(16,185,129,0.3)",
            color: "var(--accent-emerald)",
          }}
        >
          <Phone size={11} />
          <span className="font-bold">USSD: *123#</span>
        </div>
        <div
          className="flex items-center gap-1 text-[10px]"
          style={{ color: "var(--text-muted)" }}
        >
          <AlertTriangle size={10} style={{ color: "var(--accent-amber)" }} />
          High-res map tiles disabled · Text-only mode
        </div>
      </div>
      <button
        onClick={onClose}
        className="p-1 rounded transition-colors hover:bg-white/10"
        style={{ color: "var(--text-muted)" }}
      >
        <X size={13} />
      </button>
    </motion.div>
  );
}
