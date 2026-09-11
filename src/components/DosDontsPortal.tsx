export function DosDontsPortal() {
  return (
    <section className="portal active" id="portal-dosdont" role="tabpanel" style={{ position: "relative", overflow: "hidden" }}>
      <div className="dosdont-bg" id="dosdont-bg"></div>
      <div className="dosdont-wrap" style={{ position: "relative", zIndex: 1 }}>
        <div className="card dosdont-header">
          <h2>Safety Guidelines: Do&apos;s and Don&apos;ts</h2>
          <p style={{ color: "var(--ink-soft)", fontSize: "14px", marginTop: "8px" }}>
            Select a disaster event to view the official safety guidelines based on the National Disaster Management Authority (NDMA) framework.
          </p>
          <div className="event-selector" style={{ marginTop: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
            <label htmlFor="disaster-select" style={{ fontWeight: 600 }}>Events:</label>
            <select id="disaster-select" style={{ padding: "8px 12px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", background: "var(--surface)", fontSize: "15px", outline: "none" }}>
              <option value="landslide">Landslides</option>
              <option value="flood">Floods</option>
              <option value="earthquake">Earthquakes</option>
            </select>
          </div>
        </div>

        <div className="dosdont-grid">
          <div className="dos-column">
            <div className="dos-header">
              <div className="icon-circle safe-bg">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
              </div>
              <h3>Do&apos;s</h3>
            </div>
            <ul className="dos-list">
              <li>Prepare and keep a disaster emergency kit ready.</li>
              <li>Familiarize yourself with evacuation routes.</li>
              <li>Watch for warning signs like tilting trees or cracks in walls.</li>
              <li>Evacuate immediately if you suspect an imminent landslide.</li>
            </ul>
          </div>
          <div className="donts-column">
            <div className="dos-header">
              <div className="icon-circle danger-bg">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </div>
              <h3>Don&apos;ts</h3>
            </div>
            <ul className="donts-list">
              <li>Don&apos;t build near steep slopes or drainage ways.</li>
              <li>Don&apos;t ignore warning signs of ground movement.</li>
              <li>Don&apos;t return to your home until authorities say it&apos;s safe.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
