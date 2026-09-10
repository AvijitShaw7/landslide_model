"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Satellite,
  Bell,
  Globe,
  Shield,
  Radio,
  Clock,
  Wifi,
  WifiOff,
  AlertTriangle,
  MessageSquarePlus,
  ChevronDown,
} from "lucide-react";
import type { Language, Role } from "@/types";

const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: "en", label: "EN", flag: "🇮🇳" },
  { code: "as", label: "অস", flag: "🇮🇳" },
  { code: "hi", label: "हि", flag: "🇮🇳" },
  { code: "bn", label: "বাং", flag: "🇮🇳" },
];

const ROLES: { id: Role; label: string; short: string }[] = [
  { id: "MDoNER", label: "MDoNER", short: "MDN" },
  { id: "DM", label: "District Magistrate", short: "DM" },
  { id: "NHIDCL", label: "NHIDCL / BRO", short: "NHI" },
  { id: "SDRF", label: "SDRF", short: "SRF" },
];

interface Props {
  t: Record<string, string>;
  language: Language;
  setLanguage: (l: Language) => void;
  activeRole: Role;
  setActiveRole: (r: Role) => void;
  time: Date;
  criticalCount: number;
  lowBandwidth: boolean;
  setLowBandwidth: (v: boolean) => void;
  onCitizenReport: () => void;
}

export function HeaderBar({
  t,
  language,
  setLanguage,
  activeRole,
  setActiveRole,
  time,
  criticalCount,
  lowBandwidth,
  setLowBandwidth,
  onCitizenReport,
}: Props) {
  // Suppress SSR/CSR time mismatch: only show the clock after hydration
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  return (
    <header
      className="flex items-center justify-between px-4 py-2 border-b relative"
      style={{
        background: "linear-gradient(to right, #0a0e1a, #0f1628, #0a0e1a)",
        borderColor: "rgba(59,130,246,0.2)",
        boxShadow: "0 1px 20px rgba(0,0,0,0.5)",
      }}
    >
      {/* Animated border bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{
          background: "linear-gradient(to right, transparent, rgba(59,130,246,0.5), rgba(6,182,212,0.5), transparent)",
        }}
      />

      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #3b82f6, #06b6d4)",
              boxShadow: "0 0 15px rgba(59,130,246,0.4)",
            }}
          >
            <Satellite size={18} color="white" />
          </div>
          {criticalCount > 0 && (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
              style={{ background: "var(--accent-red)" }}
            >
              {criticalCount}
            </motion.div>
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-base gradient-text">{t.title}</span>
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded"
              style={{ background: "rgba(239,68,68,0.15)", color: "var(--accent-red)", border: "1px solid rgba(239,68,68,0.3)" }}
            >
              LIVE
            </span>
          </div>
          <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            {t.subtitle} · MDoNER · SIH 2024
          </div>
        </div>
      </div>

      {/* Center — Role Switcher */}
      <div className="flex items-center gap-1">
        {ROLES.map((role) => (
          <button
            key={role.id}
            onClick={() => setActiveRole(role.id)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-all duration-200 ${
              activeRole === role.id ? "tab-active" : ""
            }`}
            style={{
              background: activeRole === role.id ? "rgba(59,130,246,0.12)" : "transparent",
              borderColor: activeRole === role.id ? "rgba(59,130,246,0.4)" : "rgba(255,255,255,0.08)",
              color: activeRole === role.id ? "#60a5fa" : "var(--text-secondary)",
            }}
          >
            <span className="hidden md:inline">{role.label}</span>
            <span className="md:hidden">{role.short}</span>
          </button>
        ))}
      </div>

      {/* Right — Controls */}
      <div className="flex items-center gap-2">
        {/* Time */}
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border mono text-xs"
          style={{ borderColor: "var(--border-subtle)", color: "var(--text-secondary)" }}
        >
          <Clock size={12} style={{ color: "var(--accent-cyan)" }} />
          {mounted ? time.toLocaleTimeString("en-IN", { hour12: false }) : "--:--:--"} IST
        </div>

        {/* Language Switcher */}
        <div className="flex items-center gap-0.5">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className={`px-2 py-1 text-xs rounded-md transition-all font-medium border`}
              style={{
                background: language === lang.code ? "rgba(59,130,246,0.15)" : "transparent",
                borderColor: language === lang.code ? "rgba(59,130,246,0.4)" : "transparent",
                color: language === lang.code ? "#60a5fa" : "var(--text-muted)",
              }}
            >
              {lang.label}
            </button>
          ))}
        </div>

        {/* Low Bandwidth Toggle */}
        <button
          onClick={() => setLowBandwidth(!lowBandwidth)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition-all"
          style={{
            background: lowBandwidth ? "rgba(16,185,129,0.12)" : "transparent",
            borderColor: lowBandwidth ? "rgba(16,185,129,0.3)" : "var(--border-subtle)",
            color: lowBandwidth ? "var(--accent-emerald)" : "var(--text-muted)",
          }}
          title="Toggle Low-Bandwidth / USSD Mode"
        >
          {lowBandwidth ? <WifiOff size={13} /> : <Wifi size={13} />}
          <span className="hidden lg:inline">{lowBandwidth ? "USSD" : "LB"}</span>
        </button>

        {/* Citizen Report */}
        <button
          onClick={onCitizenReport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all"
          style={{
            background: "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(59,130,246,0.2))",
            border: "1px solid rgba(139,92,246,0.35)",
            color: "#a78bfa",
          }}
        >
          <MessageSquarePlus size={13} />
          <span className="hidden sm:inline">{t.citizenReport}</span>
        </button>

        {/* Alert indicator */}
        <motion.button
          animate={criticalCount > 0 ? { scale: [1, 1.05, 1] } : {}}
          transition={{ repeat: Infinity, duration: 2 }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold"
          style={{
            background: "rgba(239,68,68,0.15)",
            border: "1px solid rgba(239,68,68,0.35)",
            color: "var(--accent-red)",
          }}
        >
          <AlertTriangle size={13} />
          {criticalCount > 0 && <span>{criticalCount} CRITICAL</span>}
        </motion.button>
      </div>
    </header>
  );
}
