"use client";

import { useState, useEffect } from "react";
import { NeevTopbar, PortalType } from "@/components/NeevTopbar";
import { HeaderBar } from "@/components/HeaderBar";
import { CommandPortal } from "@/components/CommandPortal";
import { CitizenPortal } from "@/components/CitizenPortal";
import { FieldPortal } from "@/components/FieldPortal";
import { DosDontsPortal } from "@/components/DosDontsPortal";
import { CitizenReportModal } from "@/components/CitizenReportModal";
import { useOpenMeteoRainfall } from "@/hooks/useOpenMeteoRainfall";
import type { InspectedLocation, NERZone, Language, Role } from "@/types";
import { LowBandwidthBanner } from "@/components/LowBandwidthBanner";
import { AnimatePresence } from "framer-motion";

export default function Home() {
  const [activePortal, setActivePortal] = useState<PortalType>("command");
  const [selectedZoneId, setSelectedZoneId] = useState<string>("dima-hasao");
  const [inspectedLocation, setInspectedLocation] = useState<InspectedLocation | null>(null);

  const [language, setLanguage] = useState<Language>("en");
  const [activeRole, setActiveRole] = useState<Role>("MDoNER");
  const [lowBandwidth, setLowBandwidth] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const t = {
    en: {
      title: "NER GeoWatch",
      subtitle: "AI Early Warning & Landslide Risk Monitoring",
      citizenReport: "Report Hazard",
    },
    as: {
      title: "NER জিওওয়াচ",
      subtitle: "এআই আগাম সতর্কতা এবং ভূমিধস ঝুঁকি পর্যবেক্ষণ",
      citizenReport: "বিপদ রিপোর্ট করুন",
    },
    hi: {
      title: "NER जियोवॉच",
      subtitle: "एआई पूर्व चेतावनी और भूस्खलन जोखिम निगरानी",
      citizenReport: "खतरे की रिपोर्ट करें",
    },
    bn: {
      title: "NER জিওওয়াচ",
      subtitle: "এআই আগাম সতর্কতা এবং ভূমিধস ঝুঁকি পর্যবেক্ষণ",
      citizenReport: "বিপদ রিপোর্ট করুন",
    },
  }[language];

  const {
    zones,
    rainfallMap,
    isLoading,
    isOnline,
    lastFetched,
    errors,
    refetch,
    addCustomZone,
  } = useOpenMeteoRainfall();

  const handleAddZone = (newZone: NERZone) => {
    addCustomZone(newZone);
    setSelectedZoneId(newZone.id);
  };

  const selectedZone = zones.find((z) => z.id === selectedZoneId) || zones[0];

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
        lastUpdated: new Date().toISOString(),
        affectedPopulation: inspectedLocation.slope < 10 ? 0 : 3500,
        roadBlockages: inspectedLocation.risk === "CRITICAL" ? ["Precautionary Terrain Inspection Sector"] : [],
        sensors: [{ id: "S-INSPECT", type: "Virtual InSAR", status: "online", battery: 98 }],
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

  return (
    <div id="app">
      <div className="sticky top-0 w-full flex flex-col shadow-md" style={{ zIndex: 5000 }}>
        <HeaderBar
          t={t}
          language={language}
          setLanguage={setLanguage}
          activeRole={activeRole}
          setActiveRole={setActiveRole}
          time={time}
          criticalCount={zones.filter((z) => z.risk === "CRITICAL").length}
          lowBandwidth={lowBandwidth}
          setLowBandwidth={setLowBandwidth}
          onCitizenReport={() => setIsReportModalOpen(true)}
        />
        <NeevTopbar activePortal={activePortal} setActivePortal={setActivePortal} />
      </div>
      
      <main>
        {activePortal === "command" && (
          <CommandPortal 
            zones={zones} 
            selectedZone={selectedZone}
            selectedZoneId={selectedZoneId}
            setSelectedZoneId={setSelectedZoneId}
            displayedZone={displayedZone}
            displayedRainfallLive={displayedRainfallLive}
            handleAddZone={handleAddZone}
            inspectedLocation={inspectedLocation}
            setInspectedLocation={setInspectedLocation}
          />
        )}
        {activePortal === "citizen" && <CitizenPortal />}
        {activePortal === "field" && <FieldPortal displayedZone={displayedZone} />}
        {activePortal === "dosdont" && <DosDontsPortal />}
      </main>

      <AnimatePresence>
        {isReportModalOpen && (
          <CitizenReportModal
            onClose={() => setIsReportModalOpen(false)}
            t={t}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
