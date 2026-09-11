"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Satellite,
  Radio,
  Globe,
  Bell,
  Users,
  MapPin,
  Zap,
  RefreshCw,
  WifiOff,
} from "lucide-react";
import { TRANSLATIONS } from "@/lib/data";
import { useOpenMeteoRainfall } from "@/hooks/useOpenMeteoRainfall";
import type { Language, Role, InspectedLocation, NERZone } from "@/types";
import { GISMap } from "@/components/GISMap";
import { AIEngine } from "@/components/AIEngine";
import { RoleCommandCenter } from "@/components/RoleCommandCenter";
import { AlertBroadcast } from "@/components/AlertBroadcast";
import { HeaderBar } from "@/components/HeaderBar";
import { ZoneSidebar } from "@/components/ZoneSidebar";
import { LowBandwidthBanner } from "@/components/LowBandwidthBanner";
import { CitizenReportModal } from "@/components/CitizenReportModal";
import { SensorFeed } from "@/components/SensorFeed";
import { RainfallStatusBar } from "@/components/RainfallStatusBar";

export default function Home() {
  const [language, setLanguage] = useState<Language>("en");
  const [activeRole, setActiveRole] = useState<Role>("MDoNER");
  const [selectedZoneId, setSelectedZoneId] = useState<string>("dima-hasao");
  const [showCitizenModal, setShowCitizenModal] = useState(false);
  const [lowBandwidth, setLowBandwidth] = useState(false);
  const [time, setTime] = useState(new Date());

  // ── Live rainfall via Open-Meteo & Custom Zones ──────────────────────────
  const {
    zones,
    rainfallMap,
    isLoading,
    isOnline,
    isMLInference,
    lastFetched,
    errors,
    refetch,
    addCustomZone,
  } = useOpenMeteoRainfall();

  const [inspectedLocation, setInspectedLocation] = useState<InspectedLocation | null>(null);

  const handleAddZone = (newZone: NERZone) => {
    addCustomZone(newZone);
    setSelectedZoneId(newZone.id);
  };

  const t = TRANSLATIONS[language];
  const selectedZone = zones.find((z) => z.id === selectedZoneId) || zones[0];

  // Dynamically synchronize clicked/searched location with AI Engine
  const displayedZone: NERZone = inspectedLocation
    ? {
        id: `inspected-${inspectedLocation.lat.toFixed(4)}-${inspectedLocation.lng.toFixed(4)}`,
        name: inspectedLocation.name,
        district: inspectedLocation.district,
        state: inspectedLocation.state,
        lat: inspectedLocation.lat,
        lng: inspectedLocation.lng,
        risk: inspectedLocation.risk,
        riskScore: inspectedLocation.riskScore,
        rainfall24h: inspectedLocation.rainfall24h,
        soilMoisture: inspectedLocation.soilMoisture,
        slope: inspectedLocation.slope,
        trigger: inspectedLocation.trigger,
        isMLInference: inspectedLocation.isMLInference,
        modelType: inspectedLocation.modelType,
        lastUpdated: new Date().toISOString(),
        affectedPopulation: inspectedLocation.slope < 10 ? 0 : 3500,
        roadBlockages:
          inspectedLocation.risk === "CRITICAL"
            ? ["Precautionary Terrain Inspection Sector"]
            : [],
        sensors: [
          {
            id: "S-INSPECT",
            type: "Virtual InSAR / Geotechnical Sensor",
            status: "online",
            battery: 98,
          },
        ],
      }
    : selectedZone;

  const displayedRainfallLive = inspectedLocation
    ? {
        rainfall24h: inspectedLocation.rainfall24h,
        currentPrecipitation: inspectedLocation.currentPrecipitation,
        fetchedAt: new Date().toISOString(),
        source: "live" as const,
      }
    : (rainfallMap.get(selectedZoneId) ?? null);

  const criticalCount = zones.filter((z) => z.risk === "CRITICAL").length;
  const highCount = zones.filter((z) => z.risk === "HIGH").length;
  const totalAffected = zones.reduce((s, z) => s + z.affectedPopulation, 0);

  // Clock tick
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-primary)" }}>
      {/* Low Bandwidth Banner */}
      <AnimatePresence>
        {lowBandwidth && <LowBandwidthBanner t={t} onClose={() => setLowBandwidth(false)} />}
      </AnimatePresence>

      {/* Header */}
      <HeaderBar
        t={t}
        language={language}
        setLanguage={setLanguage}
        activeRole={activeRole}
        setActiveRole={setActiveRole}
        time={time}
        criticalCount={criticalCount}
        lowBandwidth={lowBandwidth}
        setLowBandwidth={setLowBandwidth}
        onCitizenReport={() => setShowCitizenModal(true)}
      />

      {/* Top Stats Bar */}
      <div
        className="border-b flex items-center gap-0 overflow-x-auto"
        style={{ borderColor: "var(--border-subtle)", background: "var(--bg-secondary)" }}
      >
        {[
          {
            label: "CRITICAL ZONES",
            value: isLoading ? "…" : criticalCount,
            color: "var(--accent-red)",
            icon: <AlertTriangle size={14} />,
          },
          {
            label: "HIGH RISK",
            value: isLoading ? "…" : highCount,
            color: "var(--accent-amber)",
            icon: <Zap size={14} />,
          },
          {
            label: "AFFECTED POPULATION",
            value: totalAffected.toLocaleString("en-IN"),
            color: "var(--accent-orange)",
            icon: <Users size={14} />,
          },
          {
            label: "SENSORS ONLINE",
            value: "11/13",
            color: "var(--accent-emerald)",
            icon: <Satellite size={14} />,
          },
          {
            label: "ACTIVE ALERTS",
            value: "5",
            color: "var(--accent-cyan)",
            icon: <Bell size={14} />,
          },
          {
            label: "ROAD BLOCKAGES",
            value: "4",
            color: "var(--accent-purple)",
            icon: <MapPin size={14} />,
          },
          {
            label: "IMD STATUS",
            value: "RED ALERT",
            color: "var(--accent-red)",
            icon: <Radio size={14} />,
          },
          {
            label: "CAP BROADCASTS",
            value: "5 SENT",
            color: "var(--accent-blue)",
            icon: <Globe size={14} />,
          },
        ].map((stat, i) => (
          <div
            key={i}
            className="flex items-center gap-2 px-4 py-2 border-r shrink-0"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <span style={{ color: stat.color }}>{stat.icon}</span>
            <div>
              <div className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
                {stat.label}
              </div>
              <div className="text-sm font-bold mono" style={{ color: stat.color }}>
                {stat.value}
              </div>
            </div>
          </div>
        ))}

        {/* Open-Meteo live status chip — right edge of stats bar */}
        <div className="flex items-center gap-2 px-4 py-2 ml-auto shrink-0">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold"
                style={{
                  background: "rgba(59,130,246,0.12)",
                  border: "1px solid rgba(59,130,246,0.3)",
                  color: "var(--accent-blue)",
                }}
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                >
                  <RefreshCw size={11} />
                </motion.div>
                Syncing Open-Meteo…
              </motion.div>
            ) : isOnline ? (
              <motion.button
                key="live"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  refetch();
                  console.log("[Weather API] Fresh data synced", new Date().toLocaleTimeString());
                }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold transition-all shadow-[0_0_12px_rgba(16,185,129,0.3)] hover:shadow-[0_0_16px_rgba(16,185,129,0.45)] cursor-pointer"
                style={{
                  background: "rgba(16,185,129,0.14)",
                  border: "1px solid rgba(16,185,129,0.4)",
                  color: "var(--accent-emerald)",
                }}
                title={`Last fetched: ${lastFetched?.toLocaleTimeString("en-IN", { hour12: false })} IST · Click to refresh`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#34d399]" />
                <span>● Open-Meteo LIVE (Real-Time)</span>
              </motion.button>
            ) : (
              <motion.button
                key="offline"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  refetch();
                  console.log("[Weather API] Fresh data synced", new Date().toLocaleTimeString());
                }}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold cursor-pointer"
                style={{
                  background: "rgba(245,158,11,0.12)",
                  border: "1px solid rgba(245,158,11,0.3)",
                  color: "var(--accent-amber)",
                }}
              >
                <WifiOff size={11} />
                Static data (API offline) · Retry
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Open-Meteo per-zone rainfall strip */}
      <RainfallStatusBar
        zones={zones}
        rainfallMap={rainfallMap}
        isLoading={isLoading}
        isOnline={isOnline}
        isMLInference={isMLInference}
        errors={errors}
        lastFetched={lastFetched}
        refetch={refetch}
      />

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden" style={{ height: "calc(100vh - 148px)" }}>
        {/* Left Sidebar — Zone List */}
        <ZoneSidebar
          zones={zones}
          selectedZoneId={selectedZoneId}
          onSelectZone={(id) => {
            setSelectedZoneId(id);
            setInspectedLocation(null);
          }}
          t={t}
        />

        {/* Center — GIS Map */}
        <div className="flex-1 flex flex-col min-w-0">
          <GISMap
            zones={zones}
            selectedZoneId={selectedZoneId}
            onSelectZone={(id) => {
              setSelectedZoneId(id);
              setInspectedLocation(null);
            }}
            onAddZone={handleAddZone}
            inspectedLocation={inspectedLocation}
            onInspectLocation={setInspectedLocation}
          />
          {/* Bottom row — Sensor Feed */}
          <div
            className="border-t"
            style={{ borderColor: "var(--border-subtle)", height: "160px" }}
          >
            <SensorFeed zones={zones} selectedZone={displayedZone} />
          </div>
        </div>

        {/* Right Panel */}
        <div
          className="flex flex-col border-l overflow-y-auto"
          style={{
            width: "380px",
            borderColor: "var(--border-subtle)",
            background: "var(--bg-secondary)",
          }}
        >
          {/* AI Engine */}
          <AIEngine
            zone={displayedZone}
            rainfallLive={displayedRainfallLive}
            t={t}
            isInspected={Boolean(inspectedLocation)}
            onClearInspected={() => setInspectedLocation(null)}
            isMLInference={displayedZone.isMLInference ?? isMLInference}
          />

          {/* Alert Broadcast */}
          <AlertBroadcast t={t} language={language} />
        </div>
      </div>

      {/* Bottom — Role Command Center */}
      <div
        className="border-t"
        style={{ borderColor: "var(--border-subtle)", background: "var(--bg-secondary)" }}
      >
        <RoleCommandCenter
          activeRole={activeRole}
          setActiveRole={setActiveRole}
          zones={zones}
          selectedZone={selectedZone}
          t={t}
        />
      </div>

      {/* Citizen Report Modal */}
      <AnimatePresence>
        {showCitizenModal && (
          <CitizenReportModal onClose={() => setShowCitizenModal(false)} t={t} />
        )}
      </AnimatePresence>
    </div>
  );
}
