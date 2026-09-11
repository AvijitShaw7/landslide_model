"use client";

import { useState } from "react";

export function CitizenPortal() {
  return (
    <section className="portal active" id="portal-citizen" role="tabpanel">
      <div className="helpline-strip">
        District Disaster Helpline: <a href="tel:1077">1077</a> · Cachar DDMA: <a href="tel:03842234567">03842-234567</a>
      </div>
      <div className="citizen-wrap">
        <div className="citizen-header">
          <div className="citizen-header-top">
            <div className="citizen-location-tag">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--safe)" strokeWidth="2.5">
                <path d="M12 21 C12 21 5 14.5 5 9.5 A7 7 0 0 1 19 9.5 C19 14.5 12 21 12 21 Z" />
                <circle cx="12" cy="9.5" r="2.4" />
              </svg>
              <span>Zone: Badarpur–Silchar Sector</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span className="badge critical"><span className="dot"></span>Red Alert Active</span>
              <div className="lang-select-wrapper">
                <select className="lang-select" aria-label="Choose language" defaultValue="English">
                  <option>English</option>
                  <option>অসমীয়া (Assamese)</option>
                  <option>বাংলা (Bengali)</option>
                  <option>हिन्दी (Hindi)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="sos-action-bar">
            <div className="sos-desc">
              <span className="sos-title">Stranded or in immediate slope danger?</span>
              <span className="sos-sub">Transmits live hardware GPS coordinates directly to nearest SDRF rescue unit</span>
            </div>
            <button className="sos-btn" onClick={() => alert("SOS Triggered! Location Sent to SDRF.")}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
                <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
              </svg>
              Trigger SOS Alert
            </button>
          </div>
        </div>

        {/* LIVE DDMA ALERT */}
        <div className="card" style={{ marginBottom: "16px", borderLeft: "5px solid var(--danger)", padding: "16px", background: "#FFF7F7" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "18px" }}>🚨</span>
              <strong style={{ color: "var(--danger)", fontSize: "14px", letterSpacing: "0.02em" }}>CRITICAL DDMA ALERT · FLASH ADVISORY</strong>
            </div>
            <span style={{ fontSize: "11px", color: "var(--ink-soft)", background: "#FFE8EA", padding: "3px 8px", borderRadius: "99px", fontWeight: 600 }}>14 mins ago</span>
          </div>
          <p style={{ fontSize: "13.5px", margin: "10px 0 12px", lineHeight: 1.5, color: "var(--ink)" }}>
            <strong>Mandatory Evacuation Warning:</strong> High risk of sudden slope movement detected along <strong>NH-6 (Badarpur–Sonapur hill cut)</strong>. Saturated colluvium failure imminent. Residents within 1.5 km of steep escarpments must relocate to designated shelters immediately.
          </p>
        </div>

        <h2 className="section-title">Corridor Status Near You</h2>
        <div className="corridor-strip">
          <div className="corridor-strip-item">
            <div>
              <div className="name">NH-6, Badarpur–Sonapur</div>
              <div className="desc">Debris &amp; slope subsidence at km 114</div>
            </div>
            <span className="badge critical"><span className="dot"></span>Blocked</span>
          </div>
          <div className="corridor-strip-item">
            <div>
              <div className="name">Silchar–Haflong Rail</div>
              <div className="desc">Track embankment watch near Harangajao</div>
            </div>
            <span className="badge watch"><span className="dot"></span>High Risk Watch</span>
          </div>
          <div className="corridor-strip-item">
            <div>
              <div className="name">NH-37, Silchar–Badarpur</div>
              <div className="desc">Algapur junction clear</div>
            </div>
            <span className="badge clear"><span className="dot"></span>Clear</span>
          </div>
        </div>

        <h2 className="section-title">Designated Evacuation Shelters</h2>
        <div className="shelter-list">
          <div className="card shelter-card">
            <div className="shelter-name">Govt Boys HS Relief Centre (Badarpur)</div>
            <div className="shelter-meta">
              <span>📍 1.8 km away</span>
              <span>🛏️ 220 / 350 beds free</span>
              <span>⚕️ Medical team on-site</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
