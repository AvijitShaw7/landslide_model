"use client";

import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
  useMapEvents,
  SVGOverlay,
  Marker,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Plus, Check, MapPin, CloudRain, Mountain, Gauge, Crosshair } from "lucide-react";
import type { NERZone, MapLayer, RiskLevel, InspectedLocation } from "@/types";

// Fix Leaflet default icon paths
if (typeof window !== "undefined") {
  // @ts-ignore
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  });
}

const RISK_COLORS: Record<RiskLevel, string> = {
  CRITICAL: "#ef4444",
  HIGH: "#f59e0b",
  MODERATE: "#f97316",
  LOW: "#10b981",
  SAFE: "#06b6d4",
};

const RISK_RADIUS: Record<RiskLevel, number> = {
  CRITICAL: 28,
  HIGH: 22,
  MODERATE: 18,
  LOW: 14,
  SAFE: 10,
};

// Controller for map click events
function MapEventsHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Controller to smoothly fly camera to target
function CameraController({
  selectedZone,
  targetLocation,
}: {
  selectedZone?: NERZone;
  targetLocation?: { lat: number; lng: number; zoom?: number } | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (targetLocation) {
      map.flyTo([targetLocation.lat, targetLocation.lng], targetLocation.zoom || 10, {
        duration: 1.2,
      });
    } else if (selectedZone) {
      map.flyTo([selectedZone.lat, selectedZone.lng], 9, { duration: 1.2 });
    }
  }, [selectedZone, targetLocation, map]);

  return null;
}

interface Props {
  zones: NERZone[];
  selectedZoneId: string;
  onSelectZone: (id: string) => void;
  activeLayers: Set<MapLayer>;
  inspectedLocation: InspectedLocation | null;
  onMapClick: (lat: number, lng: number) => void;
  onAddZone: (zone: NERZone) => void;
  targetCamera: { lat: number; lng: number; zoom?: number } | null;
}

export default function MapInner({
  zones,
  selectedZoneId,
  onSelectZone,
  activeLayers,
  inspectedLocation,
  onMapClick,
  onAddZone,
  targetCamera,
}: Props) {
  const center: [number, number] = [25.5, 92.0];
  const selectedZone = zones.find((z) => z.id === selectedZoneId);

  // Simulated rainfall radar cells
  const rainfallCells = [
    { lat: 25.55, lng: 93.02, intensity: 0.9 },
    { lat: 25.03, lng: 93.01, intensity: 0.7 },
    { lat: 23.45, lng: 93.33, intensity: 0.6 },
    { lat: 25.58, lng: 91.89, intensity: 0.5 },
    { lat: 27.51, lng: 88.53, intensity: 0.4 },
    { lat: 24.8, lng: 92.5, intensity: 0.65 },
    { lat: 26.2, lng: 90.5, intensity: 0.35 },
  ];

  // Road blockages
  const roadBlockages = [
    { lat: 25.56, lng: 93.03, label: "NH-27 km 341-348" },
    { lat: 25.01, lng: 93.01, label: "NH-27 km 415-422" },
    { lat: 23.45, lng: 93.33, label: "AH-1 Zokhawthar" },
    { lat: 27.51, lng: 88.53, label: "NH-10 km 78" },
  ];

  // Custom pulsing crosshair Leaflet icon
  const crosshairIcon =
    typeof window !== "undefined"
      ? L.divIcon({
          className: "custom-crosshair-icon",
          html: `
            <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
              <div style="position: absolute; width: 40px; height: 40px; border-radius: 50%; background: rgba(59, 130, 246, 0.3); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
              <div style="position: absolute; width: 24px; height: 24px; border-radius: 50%; border: 2px solid #3b82f6; background: rgba(15, 23, 42, 0.9); box-shadow: 0 0 12px #3b82f6;"></div>
              <div style="width: 6px; height: 6px; border-radius: 50%; background: #60a5fa;"></div>
              <div style="position: absolute; width: 34px; height: 1.5px; background: #60a5fa;"></div>
              <div style="position: absolute; height: 34px; width: 1.5px; background: #60a5fa;"></div>
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        })
      : null;

  // Check if inspected location is already monitored
  const isAlreadyMonitored =
    inspectedLocation &&
    zones.some(
      (z) =>
        Math.abs(z.lat - inspectedLocation.lat) < 0.005 &&
        Math.abs(z.lng - inspectedLocation.lng) < 0.005
    );

  const handleAddCustomZone = (loc: InspectedLocation) => {
    const slug = loc.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const newZone: NERZone = {
      id: `custom-${slug}-${Date.now().toString().slice(-4)}`,
      name: loc.name,
      district: loc.district || "Inspected Sector",
      state: loc.state || "NER",
      lat: loc.lat,
      lng: loc.lng,
      risk: loc.risk,
      riskScore: loc.riskScore,
      rainfall24h: loc.rainfall24h,
      soilMoisture: loc.soilMoisture,
      slope: loc.slope,
      trigger: loc.trigger,
      lastUpdated: new Date().toISOString(),
      affectedPopulation: Math.round(2200 + Math.random() * 4800),
      roadBlockages:
        loc.risk === "CRITICAL" || loc.risk === "HIGH"
          ? ["Precautionary Terrain Inspection Sector"]
          : [],
      sensors: [
        {
          id: `S-CUST-${Date.now().toString().slice(-3)}`,
          type: "Virtual InSAR/Precip Sensor",
          status: "online",
          battery: 96,
        },
      ],
    };
    onAddZone(newZone);
  };

  return (
    <MapContainer
      center={center}
      zoom={7}
      style={{ height: "100%", width: "100%", background: "#0a0e1a" }}
      zoomControl={false}
    >
      {/* Free OpenStreetMap tiles */}
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        subdomains="abc"
        maxZoom={19}
      />

      {/* Map Click Listener */}
      <MapEventsHandler onMapClick={onMapClick} />

      {/* Camera FlyTo Controller */}
      <CameraController selectedZone={selectedZone} targetLocation={targetCamera} />

      {/* Dynamic Click-to-Inspect Marker & Popup */}
      {inspectedLocation && crosshairIcon && (
        <Marker position={[inspectedLocation.lat, inspectedLocation.lng]} icon={crosshairIcon}>
          <Popup autoClose={false} closeOnClick={false} className="ner-inspect-popup">
            <div
              style={{
                background: "#0f172a",
                border: "1px solid rgba(59,130,246,0.5)",
                borderRadius: "10px",
                padding: "14px",
                minWidth: "260px",
                maxWidth: "320px",
                color: "#f1f5f9",
                fontFamily: "Inter, sans-serif",
                boxShadow: "0 10px 30px rgba(0,0,0,0.8)",
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                  paddingBottom: "6px",
                  borderBottom: "1px solid rgba(59,130,246,0.2)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Crosshair size={13} style={{ color: "#38bdf8" }} />
                  <span style={{ fontSize: "10px", fontWeight: 800, color: "#38bdf8", letterSpacing: "0.05em" }}>
                    DYNAMIC INSPECTION
                  </span>
                </div>
                <span
                  style={{
                    fontSize: "9px",
                    fontWeight: 700,
                    padding: "2px 6px",
                    borderRadius: "4px",
                    background: `${RISK_COLORS[inspectedLocation.risk]}20`,
                    color: RISK_COLORS[inspectedLocation.risk],
                    border: `1px solid ${RISK_COLORS[inspectedLocation.risk]}40`,
                  }}
                >
                  {inspectedLocation.risk}
                </span>
              </div>

              {/* Location Name & Lat/Lng */}
              <div style={{ marginBottom: "10px" }}>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#f8fafc", lineHeight: "1.2" }}>
                  {inspectedLocation.name}
                </div>
                <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                  {inspectedLocation.district}, {inspectedLocation.state}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "2px" }}>
                  <span style={{ fontSize: "10px", color: "#64748b", fontFamily: "monospace" }}>
                    {inspectedLocation.lat.toFixed(4)}°N, {inspectedLocation.lng.toFixed(4)}°E
                  </span>
                  {inspectedLocation.isSimulated && (
                    <span
                      style={{
                        fontSize: "8.5px",
                        padding: "1px 5px",
                        borderRadius: "3px",
                        background: "rgba(245,158,11,0.15)",
                        color: "#fbbf24",
                        border: "1px solid rgba(245,158,11,0.35)",
                        fontWeight: 700,
                      }}
                    >
                      ⚡ Cached / Offline Fallback
                    </span>
                  )}
                </div>
              </div>

              {/* Data Metrics Grid */}
              {inspectedLocation.isLoading ? (
                <div style={{ padding: "12px 0", textAlign: "center", color: "#94a3b8", fontSize: "11px" }}>
                  <div className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin mx-auto mb-2" />
                  Fetching live rainfall & terrain risk…
                </div>
              ) : (
                <>
                  {/* Core Metrics Grid — 2 columns */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "7px",
                      background: "rgba(15,23,42,0.6)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      padding: "8px",
                      borderRadius: "6px",
                      marginBottom: "8px",
                    }}
                  >
                    {/* Row 1 */}
                    <div>
                      <div style={{ fontSize: "9px", color: "#64748b", fontWeight: 600, letterSpacing: "0.04em" }}>LANDSLIDE RISK</div>
                      <div
                        style={{
                          fontSize: "16px",
                          fontWeight: 800,
                          fontFamily: "monospace",
                          color: RISK_COLORS[inspectedLocation.risk],
                        }}
                      >
                        {inspectedLocation.riskScore}%
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "9px", color: "#64748b", fontWeight: 600, letterSpacing: "0.04em" }}>24H TRIGGER RAIN</div>
                      <div style={{ fontSize: "14px", fontWeight: 800, fontFamily: "monospace", color: "#38bdf8" }}>
                        {inspectedLocation.rainfall24h} mm
                      </div>
                      {inspectedLocation.currentPrecipitation > 0 && (
                        <div style={{ fontSize: "9px", color: "#64748b" }}>
                          ({inspectedLocation.currentPrecipitation} mm/h now)
                        </div>
                      )}
                    </div>

                    {/* Row 2 */}
                    <div>
                      <div style={{ fontSize: "9px", color: "#64748b", fontWeight: 600, letterSpacing: "0.04em" }}>72H ANTECEDENT RAIN</div>
                      <div style={{ fontSize: "12px", fontWeight: 700, fontFamily: "monospace", color: "#7dd3fc" }}>
                        {inspectedLocation.rainfall72h != null
                          ? `${inspectedLocation.rainfall72h} mm`
                          : `${Math.round(inspectedLocation.rainfall24h * 2.2)} mm`}
                      </div>
                      <div style={{ fontSize: "8.5px", color: "#64748b" }}>3-day soaking</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "9px", color: "#64748b", fontWeight: 600, letterSpacing: "0.04em" }}>API-15D INDEX</div>
                      <div style={{ fontSize: "12px", fontWeight: 700, fontFamily: "monospace", color: "#a78bfa" }}>
                        {inspectedLocation.api15d != null
                          ? `${inspectedLocation.api15d.toFixed(1)} mm`
                          : `${Math.round(inspectedLocation.rainfall24h * 1.6)} mm`}
                      </div>
                      <div style={{ fontSize: "8.5px", color: "#64748b" }}>k=0.87 decay</div>
                    </div>

                    {/* Row 3 */}
                    <div>
                      <div style={{ fontSize: "9px", color: "#64748b", fontWeight: 600, letterSpacing: "0.04em" }}>TERRAIN SLOPE</div>
                      <div
                        style={{
                          fontSize: "12px",
                          fontWeight: 700,
                          fontFamily: "monospace",
                          color: inspectedLocation.slope < 10 ? "#34d399" : "#a855f7",
                        }}
                      >
                        {inspectedLocation.slope}°
                        <span style={{ fontSize: "8.5px", marginLeft: "3px", fontWeight: 600, color: inspectedLocation.slope < 10 ? "#34d399" : "#94a3b8" }}>
                          ({inspectedLocation.slope < 10 ? "Flat" : inspectedLocation.slope < 20 ? "Gentle" : "Steep"})
                        </span>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "9px", color: "#64748b", fontWeight: 600, letterSpacing: "0.04em" }}>SOIL SATURATION</div>
                      <div style={{ fontSize: "12px", fontWeight: 700, fontFamily: "monospace", color: "#10b981" }}>
                        {inspectedLocation.soilMoisture}%
                      </div>
                    </div>
                  </div>

                  {/* Lithology Badge */}
                  {inspectedLocation.lithologyIndex != null && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "5px 8px",
                        borderRadius: "5px",
                        background: inspectedLocation.lithologyIndex >= 5
                          ? "rgba(239,68,68,0.10)"
                          : inspectedLocation.lithologyIndex >= 3
                          ? "rgba(168,85,247,0.10)"
                          : "rgba(52,211,153,0.10)",
                        border: `1px solid ${inspectedLocation.lithologyIndex >= 5 ? "rgba(239,68,68,0.30)" : inspectedLocation.lithologyIndex >= 3 ? "rgba(168,85,247,0.30)" : "rgba(52,211,153,0.30)"}`,
                        marginBottom: "8px",
                      }}
                    >
                      <span style={{ fontSize: "9px", color: "#64748b", fontWeight: 700, letterSpacing: "0.05em" }}>LITHOLOGY</span>
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 800,
                          color: inspectedLocation.lithologyIndex >= 5
                            ? "#ef4444"
                            : inspectedLocation.lithologyIndex >= 3
                            ? "#a855f7"
                            : "#34d399",
                        }}
                      >
                        {inspectedLocation.lithology || (
                          inspectedLocation.lithologyIndex >= 5
                            ? "⚠ Weathered Shale/Sandstone"
                            : inspectedLocation.lithologyIndex >= 4
                            ? "Sandstone Formation"
                            : inspectedLocation.lithologyIndex >= 3
                            ? "Granite / Crystalline"
                            : "Alluvial Silt & River Sediment"
                        )}
                      </span>
                      <span
                        style={{
                          marginLeft: "auto",
                          fontSize: "9px",
                          padding: "1px 5px",
                          borderRadius: "3px",
                          background: "rgba(255,255,255,0.06)",
                          color: "#94a3b8",
                          fontFamily: "monospace",
                        }}
                      >
                        GSI Index {inspectedLocation.lithologyIndex}
                      </span>
                    </div>
                  )}

                  {/* Geotechnical Hard-Gate Notice for Flat Terrain */}
                  {inspectedLocation.slope < 10 && (
                    <div
                      style={{
                        padding: "8px 10px",
                        borderRadius: "6px",
                        background: "rgba(16,185,129,0.12)",
                        border: "1px solid rgba(16,185,129,0.35)",
                        marginBottom: "10px",
                        boxShadow: "0 0 10px rgba(16,185,129,0.15)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                        <span
                          style={{
                            width: "7px",
                            height: "7px",
                            borderRadius: "50%",
                            background: "#34d399",
                            display: "inline-block",
                            boxShadow: "0 0 6px #34d399",
                          }}
                        />
                        <span style={{ fontSize: "10px", fontWeight: 800, color: "#34d399" }}>
                          Flat Plain / Zero Landslide Risk
                        </span>
                      </div>
                      <div style={{ fontSize: "9.5px", color: "#a7f3d0", lineHeight: "1.35" }}>
                        Topography: Flat alluvial terrain (Slope {inspectedLocation.slope.toFixed(1)}° &lt; 10°). Slope stability failure is geomechanically impossible. Negligible landslide hazard.
                      </div>
                    </div>
                  )}

                  {/* Add Zone Action Button */}
                  <button
                    type="button"
                    onClick={() => handleAddCustomZone(inspectedLocation)}
                    disabled={Boolean(isAlreadyMonitored)}
                    style={{
                      width: "100%",
                      padding: "7px 10px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      cursor: isAlreadyMonitored ? "default" : "pointer",
                      background: isAlreadyMonitored
                        ? "rgba(16,185,129,0.18)"
                        : "linear-gradient(135deg, #2563eb, #1d4ed8)",
                      border: isAlreadyMonitored ? "1px solid rgba(16,185,129,0.4)" : "none",
                      color: isAlreadyMonitored ? "#34d399" : "#ffffff",
                      boxShadow: isAlreadyMonitored ? "none" : "0 4px 12px rgba(37,99,235,0.4)",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {isAlreadyMonitored ? (
                      <>
                        <Check size={13} />
                        <span>✓ Added to Monitored Zones</span>
                      </>
                    ) : (
                      <>
                        <Plus size={13} />
                        <span>+ Add to Monitored Zones list</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </Popup>
        </Marker>
      )}

      {/* IMD Rainfall Radar layer */}
      {activeLayers.has("rainfall") &&
        rainfallCells.map((cell, i) => (
          <CircleMarker
            key={`rf-${i}`}
            center={[cell.lat, cell.lng]}
            radius={30 + cell.intensity * 20}
            pathOptions={{
              color: `rgba(6,182,212,${cell.intensity * 0.6})`,
              fillColor: `rgba(6,182,212,${cell.intensity * 0.25})`,
              fillOpacity: 1,
              weight: 1,
            }}
          />
        ))}

      {/* Risk Heatmap circles */}
      {activeLayers.has("heatmap") &&
        zones.map((zone) => (
          <CircleMarker
            key={`heat-${zone.id}`}
            center={[zone.lat, zone.lng]}
            radius={RISK_RADIUS[zone.risk] + 15}
            pathOptions={{
              color: "transparent",
              fillColor: RISK_COLORS[zone.risk],
              fillOpacity: 0.18,
              weight: 0,
            }}
          />
        ))}

      {/* Preset Zone markers */}
      {zones.map((zone) => {
        const isSelected = zone.id === selectedZoneId;
        const color = RISK_COLORS[zone.risk];
        const radius = RISK_RADIUS[zone.risk];

        return (
          <CircleMarker
            key={zone.id}
            center={[zone.lat, zone.lng]}
            radius={radius}
            pathOptions={{
              color: color,
              fillColor: color,
              fillOpacity: isSelected ? 0.85 : 0.55,
              weight: isSelected ? 3 : 1.5,
            }}
            eventHandlers={{ click: () => onSelectZone(zone.id) }}
          >
            <Popup className="custom-popup">
              <div
                style={{
                  background: "#111827",
                  border: `1px solid ${color}40`,
                  borderRadius: "8px",
                  padding: "12px",
                  minWidth: "210px",
                  color: "#f1f5f9",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                <div style={{ fontSize: "13px", fontWeight: 700, color: color, marginBottom: "4px" }}>
                  {zone.name}
                </div>
                <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "8px" }}>
                  {zone.district}, {zone.state}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                  <div>
                    <div style={{ fontSize: "9px", color: "#64748b" }}>RISK SCORE</div>
                    <div style={{ fontSize: "14px", fontWeight: 800, color }}>{zone.riskScore}%</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "9px", color: "#64748b" }}>RAINFALL 24H</div>
                    <div style={{ fontSize: "14px", fontWeight: 800, color: "#06b6d4" }}>
                      {zone.rainfall24h}mm
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "9px", color: "#64748b" }}>POPULATION</div>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#f59e0b" }}>
                      {zone.affectedPopulation.toLocaleString("en-IN")}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "9px", color: "#64748b" }}>SLOPE</div>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#8b5cf6" }}>
                      {zone.slope}°
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    marginTop: "8px",
                    padding: "6px",
                    background: `${color}15`,
                    borderRadius: "4px",
                    fontSize: "10px",
                    color: "#e2e8f0",
                  }}
                >
                  ⚡ {zone.trigger}
                </div>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}

      {/* Road blockage markers */}
      {activeLayers.has("roads") &&
        roadBlockages.map((rb, i) => (
          <CircleMarker
            key={`rb-${i}`}
            center={[rb.lat, rb.lng]}
            radius={8}
            pathOptions={{
              color: "#f59e0b",
              fillColor: "#f59e0b",
              fillOpacity: 0.8,
              weight: 2,
            }}
          >
            <Popup>
              <div
                style={{
                  background: "#111827",
                  color: "#f1f5f9",
                  padding: "8px",
                  borderRadius: "4px",
                  fontSize: "11px",
                }}
              >
                🚧 <strong style={{ color: "#f59e0b" }}>Road Blockage</strong>
                <br />
                {rb.label}
              </div>
            </Popup>
          </CircleMarker>
        ))}

      {/* Fault Lines SVG Overlay */}
      {activeLayers.has("faults") && (
        <SVGOverlay
          bounds={[
            [22.0, 87.0],
            [29.0, 95.0],
          ]}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <line
              x1="10%"
              y1="20%"
              x2="60%"
              y2="45%"
              stroke="#8b5cf6"
              strokeWidth="1.5"
              strokeDasharray="8,4"
              opacity="0.7"
              filter="url(#glow)"
            />
            <line
              x1="30%"
              y1="30%"
              x2="75%"
              y2="55%"
              stroke="#8b5cf6"
              strokeWidth="1.5"
              strokeDasharray="8,4"
              opacity="0.6"
              filter="url(#glow)"
            />
            <line
              x1="5%"
              y1="60%"
              x2="50%"
              y2="80%"
              stroke="#8b5cf6"
              strokeWidth="1"
              strokeDasharray="6,3"
              opacity="0.5"
              filter="url(#glow)"
            />
          </svg>
        </SVGOverlay>
      )}
    </MapContainer>
  );
}
