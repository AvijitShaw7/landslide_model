"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Building2,
  Truck,
  Users,
  FileText,
  Download,
  ChevronRight,
  MapPin,
  AlertTriangle,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { SITREP_DATA } from "@/lib/data";
import type { Role, NERZone } from "@/types";

const ROLE_CONFIG: Record<
  Role,
  {
    label: string;
    icon: React.ReactNode;
    color: string;
    description: string;
  }
> = {
  MDoNER: {
    label: "MDoNER",
    icon: <Building2 size={14} />,
    color: "#3b82f6",
    description: "Ministry of Development of North Eastern Region — National Overview",
  },
  DM: {
    label: "District Magistrate",
    icon: <Shield size={14} />,
    color: "#10b981",
    description: "District-level coordination: evacuation, relief camps, local resources",
  },
  NHIDCL: {
    label: "NHIDCL / BRO",
    icon: <Truck size={14} />,
    color: "#f59e0b",
    description: "Road infrastructure status, clearance operations, alternate routes",
  },
  SDRF: {
    label: "SDRF",
    icon: <Users size={14} />,
    color: "#ef4444",
    description: "State Disaster Response Force: teams, deployment, rescue ops",
  },
};

const RISK_COLORS = {
  CRITICAL: "var(--accent-red)",
  HIGH: "var(--accent-amber)",
  MODERATE: "var(--accent-orange)",
  LOW: "var(--accent-emerald)",
  SAFE: "var(--accent-cyan)",
};

interface Props {
  activeRole: Role;
  setActiveRole: (r: Role) => void;
  zones: NERZone[];
  selectedZone: NERZone;
  t: Record<string, string>;
}

function MDoNERView({ zones }: { zones: NERZone[] }) {
  return (
    <div className="grid grid-cols-5 gap-3 p-3">
      {/* Summary cards */}
      {zones.map((zone) => {
        const color = RISK_COLORS[zone.risk];
        return (
          <div
            key={zone.id}
            className="rounded-lg p-2.5 border"
            style={{
              background: `rgba(${colorRgb(color)},0.06)`,
              borderColor: `rgba(${colorRgb(color)},0.25)`,
            }}
          >
            <div className="text-[10px] font-bold" style={{ color }}>
              {zone.risk}
            </div>
            <div className="text-[11px] font-semibold mt-0.5" style={{ color: "var(--text-primary)" }}>
              {zone.name.split(" ").slice(0, 2).join(" ")}
            </div>
            <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
              {zone.district}
            </div>
            <div className="mt-1.5 text-lg font-black mono" style={{ color }}>
              {zone.riskScore}%
            </div>
            <div className="text-[9px]" style={{ color: "var(--text-muted)" }}>
              Pop: {zone.affectedPopulation.toLocaleString("en-IN")}
            </div>
            <div className="mt-1 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${zone.riskScore}%`, background: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DMView({ zone }: { zone: NERZone }) {
  const evacActions = [
    { label: "Evacuation Order Issued", status: "done", time: "21:30" },
    { label: "Relief Camps Activated (3)", status: "done", time: "21:35" },
    { label: "Medical Teams Deployed", status: "done", time: "21:40" },
    { label: "Food & Water Supply", status: "progress", time: "21:55" },
    { label: "Animal Rescue Coordination", status: "pending", time: "22:15" },
  ];
  return (
    <div className="flex gap-3 p-3">
      <div className="flex-1">
        <div className="text-[10px] font-bold mb-2" style={{ color: "var(--text-muted)" }}>
          EVACUATION STATUS — {zone.district}
        </div>
        <div className="space-y-1.5">
          {evacActions.map((a, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                style={{
                  background:
                    a.status === "done"
                      ? "rgba(16,185,129,0.2)"
                      : a.status === "progress"
                      ? "rgba(245,158,11,0.2)"
                      : "rgba(255,255,255,0.06)",
                  border: `1px solid ${
                    a.status === "done"
                      ? "rgba(16,185,129,0.5)"
                      : a.status === "progress"
                      ? "rgba(245,158,11,0.5)"
                      : "rgba(255,255,255,0.1)"
                  }`,
                }}
              >
                {a.status === "done" ? (
                  <CheckCircle2 size={9} style={{ color: "var(--accent-emerald)" }} />
                ) : a.status === "progress" ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  >
                    <Clock size={8} style={{ color: "var(--accent-amber)" }} />
                  </motion.div>
                ) : (
                  <Clock size={8} style={{ color: "var(--text-muted)" }} />
                )}
              </div>
              <span className="text-[11px] flex-1" style={{ color: a.status === "done" ? "var(--text-secondary)" : "var(--text-primary)" }}>
                {a.label}
              </span>
              <span className="text-[9px] mono" style={{ color: "var(--text-muted)" }}>
                {a.time}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="w-40 shrink-0">
        <div className="text-[10px] font-bold mb-2" style={{ color: "var(--text-muted)" }}>
          ROAD CLOSURES
        </div>
        {zone.roadBlockages.length > 0 ? (
          zone.roadBlockages.map((rb) => (
            <div
              key={rb}
              className="flex items-center gap-1.5 mb-1.5 px-2 py-1.5 rounded"
              style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)" }}
            >
              <MapPin size={10} style={{ color: "var(--accent-amber)" }} />
              <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
                {rb}
              </span>
            </div>
          ))
        ) : (
          <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            No closures in this zone
          </div>
        )}
      </div>
    </div>
  );
}

function NHIDCLView({ zones }: { zones: NERZone[] }) {
  const allBlockages = zones.flatMap((z) =>
    z.roadBlockages.map((rb) => ({ road: rb, zone: z.name, risk: z.risk }))
  );
  return (
    <div className="p-3">
      <div className="text-[10px] font-bold mb-2" style={{ color: "var(--text-muted)" }}>
        ROAD NETWORK STATUS ({allBlockages.length} BLOCKAGES)
      </div>
      <div className="grid grid-cols-2 gap-2">
        {allBlockages.map((b, i) => (
          <div
            key={i}
            className="flex items-start gap-2 p-2 rounded-lg"
            style={{
              background: "rgba(245,158,11,0.08)",
              border: "1px solid rgba(245,158,11,0.2)",
            }}
          >
            <AlertTriangle size={11} style={{ color: "var(--accent-amber)", marginTop: "1px" }} />
            <div>
              <div className="text-[11px] font-bold" style={{ color: "var(--accent-amber)" }}>
                {b.road}
              </div>
              <div className="text-[9px]" style={{ color: "var(--text-muted)" }}>
                {b.zone}
              </div>
              <div
                className="text-[9px] font-bold mt-0.5"
                style={{ color: RISK_COLORS[b.risk] }}
              >
                Zone Risk: {b.risk}
              </div>
            </div>
          </div>
        ))}
        {allBlockages.length === 0 && (
          <div className="text-[11px] col-span-2" style={{ color: "var(--text-muted)" }}>
            No road blockages reported
          </div>
        )}
      </div>
    </div>
  );
}

function SDRFView() {
  const { resources, actions } = SITREP_DATA;
  return (
    <div className="flex gap-3 p-3">
      <div className="flex-1">
        <div className="text-[10px] font-bold mb-2" style={{ color: "var(--text-muted)" }}>
          RESOURCE DEPLOYMENT
        </div>
        <div className="space-y-2">
          {resources.map((r) => {
            const pct = (r.deployed / r.available) * 100;
            return (
              <div key={r.type}>
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span style={{ color: "var(--text-secondary)" }}>{r.type}</span>
                  <span className="mono" style={{ color: "var(--accent-blue)" }}>
                    {r.deployed}/{r.available}
                  </span>
                </div>
                <div className="h-2 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.5 }}
                    className="h-full rounded-full"
                    style={{ background: pct > 70 ? "var(--accent-red)" : "var(--accent-blue)" }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex-1">
        <div className="text-[10px] font-bold mb-2" style={{ color: "var(--text-muted)" }}>
          ACTIVE OPERATIONS
        </div>
        <div className="space-y-1">
          {actions.map((action, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <ChevronRight size={10} style={{ color: "var(--accent-red)", marginTop: "2px" }} />
              <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
                {action}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function RoleCommandCenter({ activeRole, setActiveRole, zones, selectedZone, t }: Props) {
  const [exportSuccess, setExportSuccess] = useState(false);

  const handleSitrep = () => {
    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 2000);
  };

  const cfg = ROLE_CONFIG[activeRole];

  return (
    <div style={{ height: "180px" }}>
      {/* Role tabs */}
      <div
        className="flex items-center border-b"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        {(Object.keys(ROLE_CONFIG) as Role[]).map((role) => {
          const rcfg = ROLE_CONFIG[role];
          const isActive = role === activeRole;
          return (
            <button
              key={role}
              onClick={() => setActiveRole(role)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border-r transition-all"
              style={{
                borderColor: "var(--border-subtle)",
                background: isActive ? `rgba(${colorRgb(rcfg.color)},0.1)` : "transparent",
                borderBottom: isActive ? `2px solid ${rcfg.color}` : "2px solid transparent",
                color: isActive ? rcfg.color : "var(--text-muted)",
              }}
            >
              {rcfg.icon}
              <span className="hidden sm:inline">{rcfg.label}</span>
            </button>
          );
        })}

        {/* Description */}
        <div className="flex-1 px-3 text-[10px]" style={{ color: "var(--text-muted)" }}>
          {cfg.description}
        </div>

        {/* SITREP Export */}
        <button
          onClick={handleSitrep}
          className="flex items-center gap-1.5 mx-3 px-3 py-1.5 rounded-md text-xs font-semibold transition-all"
          style={{
            background: exportSuccess
              ? "rgba(16,185,129,0.15)"
              : "rgba(59,130,246,0.12)",
            border: `1px solid ${exportSuccess ? "rgba(16,185,129,0.4)" : "rgba(59,130,246,0.3)"}`,
            color: exportSuccess ? "var(--accent-emerald)" : "var(--accent-blue)",
          }}
        >
          {exportSuccess ? (
            <>
              <CheckCircle2 size={12} />
              EXPORTED
            </>
          ) : (
            <>
              <Download size={12} />
              {t.sitrep}
            </>
          )}
        </button>
      </div>

      {/* Role content */}
      <div className="overflow-y-auto" style={{ height: "calc(180px - 40px)" }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeRole}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {activeRole === "MDoNER" && <MDoNERView zones={zones} />}
            {activeRole === "DM" && <DMView zone={selectedZone} />}
            {activeRole === "NHIDCL" && <NHIDCLView zones={zones} />}
            {activeRole === "SDRF" && <SDRFView />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function colorRgb(cssColor: string): string {
  const map: Record<string, string> = {
    "#3b82f6": "59,130,246",
    "#10b981": "16,185,129",
    "#f59e0b": "245,158,11",
    "#ef4444": "239,68,68",
    "var(--accent-red)": "239,68,68",
    "var(--accent-amber)": "245,158,11",
    "var(--accent-orange)": "249,115,22",
    "var(--accent-emerald)": "16,185,129",
    "var(--accent-cyan)": "6,182,212",
  };
  return map[cssColor] || "59,130,246";
}
