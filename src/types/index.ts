export type RiskLevel = "CRITICAL" | "HIGH" | "MODERATE" | "LOW" | "SAFE";
export type AlertChannel = "SMS" | "WhatsApp" | "Siren" | "Radio" | "AppPush";
export type Language = "en" | "as" | "hi" | "bn";
export type Role = "MDoNER" | "DM" | "NHIDCL" | "SDRF";
export type ForecastHorizon = 24 | 48 | 72;
export type MapLayer = "heatmap" | "rainfall" | "roads" | "faults";

export interface NERZone {
  id: string;
  name: string;
  district: string;
  state: string;
  lat: number;
  lng: number;
  risk: RiskLevel;
  riskScore: number; // 0-100
  rainfall24h: number; // mm
  soilMoisture: number; // %
  slope: number; // degrees
  trigger: string;
  lastUpdated: string;
  affectedPopulation: number;
  roadBlockages: string[];
  sensors: {
    id: string;
    type: string;
    status: "online" | "offline" | "degraded";
    battery: number;
  }[];
  isMLInference?: boolean;
  modelType?: string;
  rainfall72h?: number;
  api15d?: number;
  lithologyIndex?: number;
  lithology?: string;
  featureContributions?: Array<{ feature: string; importance_pct: number; value: number; label: string }>;
  isSimulated?: boolean;
}

export interface SHAPFactor {
  name: string;
  contribution: number; // -1 to 1
  value: string;
  unit: string;
}

export interface ForecastPoint {
  hour: number;
  risk: number;
  rainfall: number;
  confidence: number;
}

export interface AlertMessage {
  id: string;
  channel: AlertChannel;
  recipient: string;
  message: string;
  language: Language;
  status: "sent" | "pending" | "failed";
  timestamp: string;
}

export interface CitizenReport {
  id: string;
  lat: number;
  lng: number;
  description: string;
  severity: "minor" | "moderate" | "severe";
  timestamp: string;
  verified: boolean;
  reporter: string;
}

export interface SitrepData {
  id: string;
  timestamp: string;
  generatedBy: string;
  zones: { zone: string; risk: RiskLevel; affected: number }[];
  actions: string[];
  resources: { type: string; deployed: number; available: number }[];
}

export interface InspectedLocation {
  lat: number;
  lng: number;
  name: string;
  displayName: string;
  district: string;
  state: string;
  rainfall24h: number;
  currentPrecipitation: number;
  riskScore: number;
  risk: RiskLevel;
  slope: number;
  soilMoisture: number;
  trigger: string;
  isLoading?: boolean;
  elevation?: number;
  isFlat?: boolean;
  terrainCategory?: string;
  rainfall72h?: number;
  api15d?: number;
  lithologyIndex?: number;
  lithology?: string;
  featureContributions?: Array<{ feature: string; importance_pct: number; value: number; label: string }>;
  isMLInference?: boolean;
  modelType?: string;
  isSimulated?: boolean;
}
