import Image from "next/image";
import { LayoutDashboard, ShieldAlert, Navigation, FileCheck2 } from "lucide-react";

export type PortalType = "command" | "citizen" | "field" | "dosdont";

interface Props {
  activePortal: PortalType;
  setActivePortal: (portal: PortalType) => void;
}

export function NeevTopbar({ activePortal, setActivePortal }: Props) {
  return (
    <header className="topbar">
      <div className="brand">
        <Image src="/Neev-logo.png" className="brand-mark" alt="Neev Logo" width={48} height={48} />
        <div className="brand-text">
          <span className="name">नींव</span>
          <span className="sub">StrataWatch · NER Landslide Monitoring</span>
        </div>
      </div>

      <nav className="portal-switch" role="tablist" aria-label="Select portal">
        <button
          role="tab"
          aria-selected={activePortal === "command"}
          onClick={() => setActivePortal("command")}
        >
          <LayoutDashboard size={15} />
          <span>Command Center</span>
        </button>
        <button
          role="tab"
          aria-selected={activePortal === "citizen"}
          onClick={() => setActivePortal("citizen")}
        >
          <ShieldAlert size={15} />
          <span>Citizen Safety</span>
        </button>
        <button
          role="tab"
          aria-selected={activePortal === "field"}
          onClick={() => setActivePortal("field")}
        >
          <Navigation size={15} />
          <span>Field Officer</span>
        </button>
        <button
          role="tab"
          aria-selected={activePortal === "dosdont"}
          onClick={() => setActivePortal("dosdont")}
        >
          <FileCheck2 size={15} />
          <span>Do&apos;s &amp; Don&apos;ts</span>
        </button>
      </nav>

      <div className="env-tag">
        <span className="dot"></span>Barak Valley &amp; Dima Hasao Corridor · IMD/Open-Meteo Telemetry Live
      </div>
    </header>
  );
}
