"use client";

import { GISMap } from "./GISMap";
import { AlertBroadcast } from "./AlertBroadcast";
import { AIEngine } from "./AIEngine";
import { SensorFeed } from "./SensorFeed";
import type { NERZone, InspectedLocation } from "@/types";

interface Props {
  zones: NERZone[];
  selectedZone: NERZone;
  selectedZoneId: string;
  setSelectedZoneId: (id: string) => void;
  displayedZone: NERZone;
  displayedRainfallLive: any;
  handleAddZone: (zone: NERZone) => void;
  inspectedLocation: InspectedLocation | null;
  setInspectedLocation: (loc: InspectedLocation | null) => void;
  isMLInference?: boolean;
}

export function CommandPortal({
  zones,
  selectedZone,
  selectedZoneId,
  setSelectedZoneId,
  displayedZone,
  displayedRainfallLive,
  handleAddZone,
  inspectedLocation,
  setInspectedLocation,
  isMLInference,
}: Props) {
  return (
    <section className="portal active" id="portal-command" role="tabpanel">
      <div className="command-shell">
        {/* LEFT: metrics */}
        <div className="cmd-col">
          <div className="cmd-col-header">
            <span>Geotechnical Telemetry</span>
            <span style={{ fontSize: "10.5px", fontWeight: 600, color: "var(--safe)" }}>● Physics Model Active</span>
          </div>

          <div className="card metric-card">
            <div className="metric-top">
              <div>
                <div className="metric-label">Landslide Susceptibility Index</div>
                <div className={`metric-value ${displayedZone.riskScore > 75 ? "danger" : "safe"}`}>
                  {(displayedZone.riskScore / 100).toFixed(2)}
                </div>
              </div>
              <span className={`badge ${displayedZone.riskScore > 75 ? "critical" : "clear"}`}>
                <span className="dot"></span>{displayedZone.risk}
              </span>
            </div>
            <div className="gauge-track">
              <div 
                className="gauge-fill" 
                style={{ width: `${displayedZone.riskScore}%`, background: displayedZone.riskScore > 75 ? "var(--danger)" : "var(--safe)" }}
              ></div>
            </div>
            <div className="metric-caption">Weighted DEM slope angle ({displayedZone.slope.toFixed(1)}°), lithology &amp; antecedent saturation</div>
          </div>

          <div className="card metric-card">
            <div className="metric-top">
              <div>
                <div className="metric-label">Factor of Safety (Fs)</div>
                <div className={`metric-value ${displayedZone.riskScore > 75 ? "danger" : "safe"}`}>
                  {displayedZone.riskScore > 75 ? "0.91" : "1.45"}
                </div>
              </div>
              <span className={`badge ${displayedZone.riskScore > 75 ? "critical" : "clear"}`}>
                <span className="dot"></span>{displayedZone.riskScore > 75 ? "Unstable" : "Stable"}
              </span>
            </div>
            <div className="gauge-track">
              <div 
                className="gauge-fill" 
                style={{ width: displayedZone.riskScore > 75 ? "46%" : "85%", background: displayedZone.riskScore > 75 ? "var(--danger)" : "var(--safe)" }}
              ></div>
            </div>
            <div className="metric-caption">Limit equilibrium infinite slope calculation</div>
          </div>

          <div className="card metric-card">
            <div className="metric-top">
              <div>
                <div className="metric-label">24h Cumulative Precipitation</div>
                <div className="metric-value">
                  {displayedRainfallLive?.rainfall24h?.toFixed(1) || displayedZone.rainfall24h} mm
                </div>
              </div>
              <span className="badge watch"><span className="dot"></span>Heavy</span>
            </div>
            <div className="gauge-track">
              <div className="gauge-fill" style={{ width: "70%", background: "var(--warn)" }}></div>
            </div>
            <div className="metric-caption">Threshold for pore saturation: 140 mm/24h</div>
          </div>

          <div className="card" style={{ padding: "16px" }}>
            <div className="metric-label" style={{ marginBottom: "10px" }}>Regional Transit Corridors</div>
            <ul className="corridor-list">
              {zones.slice(0, 3).map((z, i) => (
                <li className="corridor-item" key={z.id} onClick={() => { setSelectedZoneId(z.id); setInspectedLocation(null); }} style={{ cursor: "pointer" }}>
                  <div>
                    <div className="corridor-name">{z.name}</div>
                    <div className="corridor-sub">{z.district}</div>
                  </div>
                  <span className={`badge ${z.risk === "CRITICAL" ? "critical" : z.risk === "HIGH" ? "watch" : "clear"}`}>
                    <span className="dot"></span>{z.risk === "CRITICAL" ? "Blocked" : z.risk === "HIGH" ? "Watch" : "Clear"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* CENTER: GIS VIEWPORT */}
        <div className="gis-wrap relative flex flex-col" style={{ height: "100%" }}>
          <div className="flex-1 relative">
            <GISMap
              zones={zones}
              selectedZoneId={selectedZoneId}
              onSelectZone={(id) => { setSelectedZoneId(id); setInspectedLocation(null); }}
              onAddZone={handleAddZone}
              inspectedLocation={inspectedLocation}
              onInspectLocation={setInspectedLocation}
            />
            {/* Timeline slider overlay from Neev */}
            <div className="timeline-panel" style={{ pointerEvents: "none", position: "absolute", bottom: "10px", left: "10px", zIndex: 1000 }}>
              <div className="timeline-head">
                <span className="label">Predictive Risk Horizon — Open-Meteo Numerical Forecast</span>
                <div className="timeline-readout">
                  <div>LSI <b>{(displayedZone.riskScore / 100).toFixed(2)}</b></div>
                  <div>Fs <b>{displayedZone.riskScore > 75 ? "0.91" : "1.45"}</b></div>
                  <div>24h Rain <b>{displayedRainfallLive?.rainfall24h?.toFixed(1) || displayedZone.rainfall24h}mm</b></div>
                </div>
              </div>
              <input type="range" min="0" max="4" step="1" defaultValue="0" aria-label="Predictive time offset" style={{ pointerEvents: "auto" }} />
              <div className="timeline-ticks">
                <span>Now (+0h)</span><span>+3h</span><span>+6h</span><span>+12h</span><span>+24h</span>
              </div>
            </div>
          </div>
          
          <div style={{ height: "140px", flexShrink: 0, borderTop: "1px solid var(--border)", background: "var(--surface)" }}>
            <SensorFeed zones={zones} selectedZone={displayedZone} />
          </div>
        </div>

        {/* RIGHT: dispatch */}
        <div className="cmd-col" style={{ display: 'flex', flexDirection: 'column' }}>
          <AIEngine 
            t={{ forecast: "Risk Forecast", aiEngine: "AI Engine" }} 
            zone={displayedZone} 
            rainfallLive={displayedRainfallLive} 
            isInspected={!!inspectedLocation} 
            onClearInspected={() => setInspectedLocation(null)} 
            isMLInference={displayedZone.isMLInference ?? isMLInference}
          />
          <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border)' }}>
            <div className="cmd-col-header">Early Warning Gateway</div>
            <AlertBroadcast t={{}} language="en" />
          </div>
        </div>
      </div>
    </section>
  );
}
