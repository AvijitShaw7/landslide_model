"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  X,
  MapPin,
  Camera,
  Send,
  AlertTriangle,
  CheckCircle,
  Phone,
  Globe,
} from "lucide-react";

interface Props {
  onClose: () => void;
  t: Record<string, string>;
}

export function CitizenReportModal({ onClose, t }: Props) {
  const [severity, setSeverity] = useState<"minor" | "moderate" | "severe">("moderate");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      onClose();
    }, 2500);
  };

  const severityConfig = {
    minor: { color: "var(--accent-emerald)", label: "Minor", bg: "rgba(16,185,129,0.15)" },
    moderate: { color: "var(--accent-amber)", label: "Moderate", bg: "rgba(245,158,11,0.15)" },
    severe: { color: "var(--accent-red)", label: "Severe", bg: "rgba(239,68,68,0.15)" },
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 20, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="w-full max-w-md rounded-xl overflow-hidden"
        style={{
          background: "var(--bg-card)",
          border: "1px solid rgba(139,92,246,0.35)",
          boxShadow: "0 0 60px rgba(139,92,246,0.2), 0 25px 60px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{
            borderColor: "rgba(139,92,246,0.25)",
            background: "linear-gradient(to right, rgba(139,92,246,0.1), rgba(59,130,246,0.1))",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #8b5cf6, #3b82f6)" }}
            >
              <MapPin size={16} color="white" />
            </div>
            <div>
              <div className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                NER GeoWatch — Citizen Report
              </div>
              <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                Report a hazard in your area
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10"
            style={{ color: "var(--text-muted)" }}
          >
            <X size={15} />
          </button>
        </div>

        {submitted ? (
          <div className="flex flex-col items-center justify-center py-12 px-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <CheckCircle size={48} style={{ color: "var(--accent-emerald)" }} />
            </motion.div>
            <div className="mt-4 font-bold text-lg" style={{ color: "var(--accent-emerald)" }}>
              Report Submitted!
            </div>
            <div className="mt-1 text-sm text-center" style={{ color: "var(--text-muted)" }}>
              Your report has been forwarded to the nearest District Control Room and SDRF.
              Reference ID: CR-{Math.floor(Math.random() * 9000) + 1000}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* USSD Alternative */}
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
              style={{
                background: "rgba(16,185,129,0.08)",
                border: "1px solid rgba(16,185,129,0.2)",
              }}
            >
              <Phone size={11} style={{ color: "var(--accent-emerald)" }} />
              <span style={{ color: "var(--text-muted)" }}>
                No internet? Dial <strong style={{ color: "var(--accent-emerald)" }}>*123#</strong> from any phone for USSD reporting.
              </span>
            </div>

            {/* Severity */}
            <div>
              <label className="block text-[11px] font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>
                SEVERITY LEVEL
              </label>
              <div className="flex gap-2">
                {(["minor", "moderate", "severe"] as const).map((s) => {
                  const cfg = severityConfig[s];
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSeverity(s)}
                      className="flex-1 py-2 rounded-lg text-xs font-bold transition-all border"
                      style={{
                        background: severity === s ? cfg.bg : "rgba(255,255,255,0.04)",
                        borderColor: severity === s ? cfg.color : "rgba(255,255,255,0.08)",
                        color: severity === s ? cfg.color : "var(--text-muted)",
                      }}
                    >
                      {s === "severe" && <AlertTriangle size={10} className="inline mr-1" />}
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-[11px] font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
                DESCRIBE THE HAZARD
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={3}
                placeholder="e.g., Large crack visible on hillside near NH-27, water seeping from slope..."
                className="w-full rounded-lg px-3 py-2 text-sm resize-none transition-all outline-none"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "var(--text-primary)",
                  fontFamily: "Inter, sans-serif",
                }}
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-[11px] font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
                LOCATION (optional)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Village / Landmark / NH km marker"
                  className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "var(--text-primary)",
                  }}
                />
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold"
                  style={{
                    background: "rgba(59,130,246,0.12)",
                    border: "1px solid rgba(59,130,246,0.3)",
                    color: "var(--accent-blue)",
                  }}
                >
                  <Globe size={11} />
                  GPS
                </button>
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-[11px] font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
                YOUR MOBILE NUMBER (optional)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 XXXXX XXXXX"
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "var(--text-primary)",
                }}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
              style={{
                background: "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(59,130,246,0.3))",
                border: "1px solid rgba(139,92,246,0.5)",
                color: "#c4b5fd",
              }}
            >
              <Send size={14} />
              Submit Hazard Report
            </button>

            <p className="text-center text-[9px]" style={{ color: "var(--text-muted)" }}>
              Reports are forwarded to District Control Room and NDRF in real-time.
              False reports may be penalized under Disaster Management Act 2005.
            </p>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}
