"use client";

import { useState } from "react";
import type { NERZone } from "@/types";
import { SensorFeed } from "./SensorFeed";

interface Props {
  displayedZone: NERZone;
}

export function FieldPortal({ displayedZone }: Props) {
  const [loggedIn, setLoggedIn] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  if (!loggedIn) {
    return (
      <section className="portal active" id="portal-field" role="tabpanel">
        <div className="field-wrap">
          <div className="card login-card" id="field-login">
            <h2>Field Officer Login</h2>
            <p>Sign in with your issued Badge ID and PIN to access your active beat.</p>
            {!otpSent ? (
              <form onSubmit={(e) => { e.preventDefault(); setOtpSent(true); }}>
                <div className="field-input-group">
                  <label htmlFor="badge-id">Badge ID</label>
                  <input type="text" id="badge-id" placeholder="e.g. SDRF-2214" required />
                </div>
                <div className="field-input-group">
                  <label htmlFor="badge-pin">PIN</label>
                  <input type="password" id="badge-pin" placeholder="4-digit PIN" inputMode="numeric" maxLength={4} required />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>Request OTP</button>
              </form>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); setLoggedIn(true); }}>
                <div className="field-input-group">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <label htmlFor="badge-otp">One Time Password (OTP)</label>
                    <span style={{ fontSize: "11px", color: "var(--focus)", cursor: "pointer", fontWeight: 600 }}>Auto-fill for demo</span>
                  </div>
                  <input type="text" id="badge-otp" placeholder="6-digit OTP" inputMode="numeric" maxLength={6} required />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>Verify &amp; Sign In</button>
              </form>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="portal active" id="portal-field" role="tabpanel">
      <div className="field-wrap">
        <div id="field-dashboard">
          <div className="beat-banner">
            <b>Active Beat</b>
            Assigned: SDRF Patrol Team 2 — {displayedZone.name}
          </div>

          <div className="status-pill-row">
            <span className="status-pill online">
              Online (Synced)
            </span>
          </div>

          <div className="field-metric-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
            <div className="card field-metric">
              <div className="fm-label">Landslide Possibility (LSI)</div>
              <div className="fm-value" style={{ color: "var(--danger)" }}>{(displayedZone.riskScore / 100).toFixed(2)}</div>
            </div>
            <div className="card field-metric">
              <div className="fm-label">Safety Factor (Fs)</div>
              <div className="fm-value" style={{ color: "var(--danger)" }}>{displayedZone.riskScore > 75 ? "0.91" : "1.45"}</div>
            </div>
            <div className="card field-metric">
              <div className="fm-label">Soil Moisture (Vol)</div>
              <div className="fm-value">{displayedZone.soilMoisture}%</div>
            </div>
            <div className="card field-metric">
              <div className="fm-label">Water Saturation</div>
              <div className="fm-value">{displayedZone.rainfall24h > 100 ? "High" : "Normal"}</div>
            </div>
          </div>
          
          <div className="card" style={{ padding: "18px", marginTop: "16px" }}>
            <h3 style={{ fontSize: "15px", marginBottom: "12px" }}>Local Telemetry Nodes</h3>
            <SensorFeed zones={[displayedZone]} selectedZone={displayedZone} />
          </div>

          <div className="card" style={{ padding: "18px", marginTop: "16px" }}>
            <div className="dispatch-title" style={{ marginBottom: "14px" }}>Report Ground Hazard</div>
            <form onSubmit={(e) => { e.preventDefault(); alert("Report Submitted."); }}>
              <button type="button" className="camera-btn">
                <span id="camera-btn-text">Capture Photo (auto-tags GPS + timestamp)</span>
              </button>

              <div className="field-input-group" style={{ marginTop: "14px" }}>
                <label htmlFor="hazard-type">Hazard Type</label>
                <select id="hazard-type">
                  <option>Slope Tension Cracks</option>
                  <option>Rockfall / Subsidence</option>
                  <option>Complete Road Severance</option>
                  <option>Drainage Blockage</option>
                </select>
              </div>

              <div className="field-input-group">
                <label>Severity</label>
                <div className="radio-row">
                  <label className="radio-option"><input type="radio" name="severity" value="Passable" defaultChecked /> Passable</label>
                  <label className="radio-option"><input type="radio" name="severity" value="Single-Lane Blocked" /> Single-Lane Blocked</label>
                  <label className="radio-option"><input type="radio" name="severity" value="Road Severed" /> Road Severed</label>
                </div>
              </div>

              <div className="field-input-group">
                <label htmlFor="field-notes">Field Notes</label>
                <textarea id="field-notes" placeholder="Describe what you're observing..."></textarea>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>Submit Report</button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
