"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useRef } from "react";
import {
  Layers,
  Eye,
  EyeOff,
  CloudRain,
  Flame,
  AlertTriangle,
  Zap,
  Search,
  X,
  MapPin,
  Loader2,
  Navigation,
} from "lucide-react";
import type { NERZone, MapLayer, RiskLevel, InspectedLocation } from "@/types";
import {
  computeRiskScore,
  scoreToRiskLevel,
  buildTrigger,
  calculateTerrainSlope,
} from "@/lib/openMeteo";

// Dynamic import to avoid Leaflet SSR issues
const MapInner = dynamic(() => import("./MapInner"), {
  ssr: false,
  loading: () => <MapLoading />,
});

function MapLoading() {
  return (
    <div
      className="flex-1 flex items-center justify-center"
      style={{ background: "var(--bg-primary)" }}
    >
      <div className="text-center">
        <div
          className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-3"
          style={{ borderColor: "rgba(59,130,246,0.4)", borderTopColor: "#3b82f6" }}
        />
        <div className="text-xs" style={{ color: "var(--text-muted)" }}>
          Initializing Geospatial Canvas…
        </div>
      </div>
    </div>
  );
}

const LAYER_CONFIG: { id: MapLayer; label: string; icon: React.ReactNode; color: string }[] = [
  { id: "heatmap", label: "Risk Heatmap", icon: <Flame size={12} />, color: "var(--accent-red)" },
  { id: "rainfall", label: "IMD Radar", icon: <CloudRain size={12} />, color: "var(--accent-cyan)" },
  { id: "roads", label: "Road Blocks", icon: <AlertTriangle size={12} />, color: "var(--accent-amber)" },
  { id: "faults", label: "Fault Lines", icon: <Zap size={12} />, color: "var(--accent-purple)" },
];

const QUICK_SUGGESTIONS = [
  { name: "Tawang", lat: 27.5879, lng: 91.8637, district: "Mountain Scarp", state: "Arunachal Pradesh" },
  { name: "Haflong", lat: 25.1788, lng: 93.0205, district: "Highland Ridge", state: "Assam" },
  { name: "Kohima", lat: 25.6751, lng: 94.1086, district: "Barail Range", state: "Nagaland" },
  { name: "Cherrapunji", lat: 25.2702, lng: 91.7323, district: "Khasi Plateau", state: "Meghalaya" },
  { name: "Delhi", lat: 28.6139, lng: 77.2090, district: "Flat Alluvial Plain", state: "Delhi NCR" },
  { name: "Lucknow", lat: 26.8467, lng: 80.9462, district: "Gangetic Basin", state: "Uttar Pradesh" },
];

interface SearchResult {
  id: string;
  name: string;
  displayName: string;
  district: string;
  state: string;
  lat: number;
  lng: number;
  type?: string;
}

interface Props {
  zones: NERZone[];
  selectedZoneId: string;
  onSelectZone: (id: string) => void;
  onAddZone: (zone: NERZone) => void;
  inspectedLocation: InspectedLocation | null;
  onInspectLocation: (loc: InspectedLocation | null) => void;
}

export function GISMap({
  zones,
  selectedZoneId,
  onSelectZone,
  onAddZone,
  inspectedLocation,
  onInspectLocation,
}: Props) {
  const [activeLayers, setActiveLayers] = useState<Set<MapLayer>>(
    new Set(["heatmap", "roads"])
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [targetCamera, setTargetCamera] = useState<{ lat: number; lng: number; zoom?: number } | null>(
    null
  );

  const searchContainerRef = useRef<HTMLDivElement>(null);

  const toggleLayer = (layer: MapLayer) => {
    setActiveLayers((prev) => {
      const next = new Set(prev);
      next.has(layer) ? next.delete(layer) : next.add(layer);
      return next;
    });
  };

  // Debounced Place Search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(searchQuery.trim())}`);
        if (res.ok) {
          const json = await res.json();
          setSearchResults(json.data || []);
        }
      } catch (err) {
        console.warn("Geocode search failed:", err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside search container to close dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Core Inspection Function: coordinates + reverse geocode + live weather
  const handleInspectCoordinate = async (
    lat: number,
    lng: number,
    presetName?: string,
    presetDistrict?: string,
    presetState?: string
  ) => {
    // 1. Set initial pending state
    const initialLoc: InspectedLocation = {
      lat,
      lng,
      name: presetName || `Inspecting (${lat.toFixed(3)}°, ${lng.toFixed(3)}°)`,
      displayName: `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`,
      district: presetDistrict || "Resolving sector…",
      state: presetState || "NER",
      rainfall24h: 0,
      currentPrecipitation: 0,
      riskScore: 0,
      risk: "SAFE",
      slope: 0,
      soilMoisture: 35,
      trigger: "Calculating live terrain & precipitation risk…",
      isLoading: true,
    };

    onInspectLocation(initialLoc);
    setTargetCamera({ lat, lng, zoom: 11 });

    try {
      // 2. Parallel fetch geocode + live rainfall (with geotechnical slope model)
      const [geoRes, rainRes] = await Promise.allSettled([
        presetName
          ? Promise.resolve(null)
          : fetch(`/api/geocode?lat=${lat}&lon=${lng}`).then((r) => (r.ok ? r.json() : null)),
        fetch(`/api/rainfall?lat=${lat}&lng=${lng}`).then((r) => (r.ok ? r.json() : null)),
      ]);

      let resolvedName = presetName || initialLoc.name;
      let resolvedDistrict = presetDistrict || initialLoc.district;
      let resolvedState = presetState || initialLoc.state;

      if (geoRes.status === "fulfilled" && geoRes.value?.data) {
        resolvedName = geoRes.value.data.name || resolvedName;
        resolvedDistrict = geoRes.value.data.district || resolvedDistrict;
        resolvedState = geoRes.value.data.state || resolvedState;
      }

      let rainfall24h = 0;
      let currentPrecipitation = 0;
      let slope = 0;
      let soilMoisture = 35;
      let riskScore = 0;
      let risk: RiskLevel = "SAFE";
      let trigger = "Evaluating geotechnical slope stability…";
      let elevation: number | undefined = undefined;
      let isFlat = false;
      let terrainCategory: string | undefined = undefined;

      if (rainRes.status === "fulfilled" && rainRes.value?.data) {
        const d = rainRes.value.data;
        rainfall24h = d.rainfall24h ?? 0;
        currentPrecipitation = d.currentPrecipitation ?? 0;
        slope = typeof d.slope === "number" ? d.slope : 0;
        soilMoisture = d.soilMoisture ?? 35;
        riskScore = typeof d.riskScore === "number" ? d.riskScore : computeRiskScore(rainfall24h, soilMoisture, slope);
        risk = (d.risk as RiskLevel) ?? scoreToRiskLevel(riskScore);
        trigger = d.trigger ?? buildTrigger(rainfall24h, currentPrecipitation, soilMoisture, slope);
        elevation = d.elevation;
        isFlat = d.isFlat ?? (slope < 10);
        terrainCategory = d.terrainCategory;
      } else {
        // Fallback: direct geotechnical slope calculation
        try {
          const terrain = await calculateTerrainSlope(lat, lng);
          slope = terrain.slope;
          elevation = terrain.elevation;
          isFlat = terrain.isFlat;
          terrainCategory = terrain.terrainCategory;
          soilMoisture = isFlat ? 35 : 65;
          riskScore = computeRiskScore(rainfall24h, soilMoisture, slope);
          risk = scoreToRiskLevel(riskScore);
          trigger = buildTrigger(rainfall24h, currentPrecipitation, soilMoisture, slope);
        } catch {
          slope = 2;
          riskScore = 0;
          risk = "SAFE";
          trigger = "Flat / Low-gradient terrain. Negligible landslide hazard.";
        }
      }

      const resolvedLoc: InspectedLocation = {
        lat,
        lng,
        name: resolvedName,
        displayName: `${resolvedName}, ${resolvedDistrict}, ${resolvedState}`,
        district: resolvedDistrict,
        state: resolvedState,
        rainfall24h,
        currentPrecipitation,
        riskScore,
        risk,
        slope,
        soilMoisture,
        trigger,
        elevation,
        isFlat,
        terrainCategory,
        isLoading: false,
      };

      onInspectLocation(resolvedLoc);
    } catch (err) {
      console.error("Coordinate inspection error:", err);
      onInspectLocation({
        ...initialLoc,
        isLoading: false,
      });
    }
  };

  const handleSelectSearchResult = (res: SearchResult) => {
    setSearchQuery("");
    setSearchResults([]);
    setIsSearchFocused(false);
    handleInspectCoordinate(res.lat, res.lng, res.name, res.district, res.state);
  };

  return (
    <div className="flex-1 relative flex flex-col overflow-hidden">
      {/* Map canvas */}
      <div className="flex-1 relative" style={{ minHeight: 0 }}>
        <MapInner
          zones={zones}
          selectedZoneId={selectedZoneId}
          onSelectZone={onSelectZone}
          activeLayers={activeLayers}
          inspectedLocation={inspectedLocation}
          onMapClick={(lat, lng) => handleInspectCoordinate(lat, lng)}
          onAddZone={onAddZone}
          targetCamera={targetCamera}
        />

        {/* Top-Left Title Bar */}
        <div
          className="absolute top-3 left-3 z-[1000] px-3 py-1.5 rounded-lg pointer-events-auto"
          style={{
            background: "rgba(10,14,26,0.9)",
            border: "1px solid var(--border-subtle)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div className="text-[11px] font-bold gradient-text">NER Landslide Risk Map</div>
          <div className="text-[9px] flex items-center gap-1 mt-0.5" style={{ color: "var(--text-muted)" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Click canvas to inspect custom coordinates</span>
          </div>
        </div>

        {/* Floating Search Bar (Top-Center) */}
        <div
          ref={searchContainerRef}
          className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] w-[320px] sm:w-[420px] max-w-[90vw] pointer-events-auto"
        >
          <div
            className="relative flex items-center rounded-xl transition-all shadow-xl"
            style={{
              background: "rgba(15, 23, 42, 0.94)",
              border: isSearchFocused
                ? "1px solid rgba(59, 130, 246, 0.6)"
                : "1px solid rgba(59, 130, 246, 0.25)",
              backdropFilter: "blur(14px)",
              boxShadow: isSearchFocused
                ? "0 8px 30px rgba(0,0,0,0.6), 0 0 15px rgba(59,130,246,0.3)"
                : "0 6px 20px rgba(0,0,0,0.4)",
            }}
          >
            <div className="pl-3.5 pr-2" style={{ color: isSearching ? "#38bdf8" : "var(--accent-blue)" }}>
              {isSearching ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
            </div>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              placeholder="Search town, district, or pass... e.g. Tawang, Haflong, Kohima"
              className="w-full py-2.5 pr-8 bg-transparent text-xs text-white placeholder-slate-400 focus:outline-none"
            />

            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSearchResults([]);
                }}
                className="pr-3 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Search Dropdown / Quick Suggestions */}
          {isSearchFocused && (
            <div
              className="mt-2 rounded-xl overflow-hidden shadow-2xl transition-all"
              style={{
                background: "rgba(15, 23, 42, 0.97)",
                border: "1px solid rgba(59, 130, 246, 0.35)",
                backdropFilter: "blur(16px)",
              }}
            >
              {searchResults.length > 0 ? (
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-800/60">
                  <div className="px-3 py-1.5 text-[9px] font-bold text-slate-400 tracking-wider">
                    SEARCH RESULTS
                  </div>
                  {searchResults.map((res) => (
                    <button
                      key={res.id}
                      type="button"
                      onClick={() => handleSelectSearchResult(res)}
                      className="w-full px-3.5 py-2 text-left hover:bg-blue-600/15 flex items-start gap-2.5 transition-colors cursor-pointer"
                    >
                      <MapPin size={13} className="text-blue-400 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-white truncate">{res.name}</div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {res.district}, {res.state}
                        </div>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 font-mono shrink-0">
                        {res.lat.toFixed(2)}°, {res.lng.toFixed(2)}°
                      </span>
                    </button>
                  ))}
                </div>
              ) : searchQuery.length >= 2 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  {isSearching ? "Searching locations…" : "No locations found in NER region"}
                </div>
              ) : (
                <div className="p-3">
                  <div className="text-[9px] font-bold text-slate-400 mb-2 tracking-wider flex items-center gap-1">
                    <Navigation size={10} />
                    BENCHMARK TOPOGRAPHY & NER ZONES
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_SUGGESTIONS.map((item) => (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => {
                          handleInspectCoordinate(item.lat, item.lng, item.name, item.district, item.state);
                          setIsSearchFocused(false);
                          setSearchQuery("");
                        }}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-medium bg-slate-800/80 hover:bg-blue-600/20 text-slate-300 hover:text-blue-300 border border-slate-700/60 hover:border-blue-500/40 transition-all cursor-pointer flex items-center gap-1"
                      >
                        <MapPin size={10} className="text-blue-400" />
                        <span>{item.name}</span>
                        <span className="text-[8px] text-slate-500 font-mono">({item.district})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right-Edge Layer Controls */}
        <div
          className="absolute top-3 right-3 z-[1000] flex flex-col gap-1 p-2 rounded-lg pointer-events-auto"
          style={{
            background: "rgba(10,14,26,0.9)",
            border: "1px solid var(--border-subtle)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div
            className="text-[10px] font-bold mb-1 flex items-center gap-1"
            style={{ color: "var(--text-muted)" }}
          >
            <Layers size={10} />
            LAYERS
          </div>
          {LAYER_CONFIG.map((layer) => {
            const isOn = activeLayers.has(layer.id);
            return (
              <button
                key={layer.id}
                onClick={() => toggleLayer(layer.id)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] font-medium transition-all cursor-pointer"
                style={{
                  background: isOn ? `rgba(${layerRgb(layer.color)},0.15)` : "rgba(255,255,255,0.04)",
                  border: `1px solid ${isOn ? layer.color : "transparent"}`,
                  color: isOn ? layer.color : "var(--text-muted)",
                }}
              >
                {isOn ? <Eye size={10} /> : <EyeOff size={10} />}
                <span style={{ color: isOn ? layer.color : "var(--text-muted)" }}>
                  {layer.icon}
                </span>
                {layer.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function layerRgb(cssVar: string): string {
  const map: Record<string, string> = {
    "var(--accent-red)": "239,68,68",
    "var(--accent-cyan)": "6,182,212",
    "var(--accent-amber)": "245,158,11",
    "var(--accent-purple)": "139,92,246",
  };
  return map[cssVar] || "59,130,246";
}
