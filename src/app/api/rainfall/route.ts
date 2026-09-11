import { NextResponse } from "next/server";
import {
  calculateTerrainSlope,
  computeRiskScore,
  scoreToRiskLevel,
  buildTrigger,
  getSynthesizedWeatherData,
  isAlluvialValleyPlain,
  isHighlandMountainZone,
  invalidateStaleCache,
} from "@/lib/openMeteo";
import type { RiskLevel } from "@/types";

export const revalidate = 300;

interface NERCoordinate {
  id: string;
  name: string;
  district: string;
  lat: number;
  lng: number;
  fallbackRain24h: number;
  fallbackCurrentPrecip: number;
  slope: number;
  soilMoisture: number;
  elevation: number;
  /** Lithology susceptibility: 1=Alluvial, 3=Granite/Crystalline, 5=Weathered Shale */
  lithologyIndex: number;
  lithology?: string;
}

const NER_COORDINATES: NERCoordinate[] = [
  {
    id: "dima-hasao",
    name: "Dima Hasao Highlands",
    district: "Dima Hasao",
    lat: 25.5624,
    lng: 93.0199,
    fallbackRain24h: 187,
    fallbackCurrentPrecip: 14.2,
    slope: 38,
    soilMoisture: 94,
    elevation: 950,
    lithologyIndex: 5, // Barail Group: Weathered Shale/Sandstone (GSI NER mapping)
    lithology: "Barail Group Weathered Shale",
  },
  {
    id: "nh27-lumding-silchar",
    name: "NH-27 Lumding–Silchar",
    district: "Cachar / Hailakandi",
    lat: 25.027,
    lng: 93.005,
    fallbackRain24h: 142,
    fallbackCurrentPrecip: 8.6,
    slope: 29,
    soilMoisture: 86,
    elevation: 420,
    lithologyIndex: 4, // Surma Group: Sandstone/Siltstone embankment terrain
    lithology: "Surma Group Sandstone / Siltstone",
  },
  {
    id: "champhai",
    name: "Champhai Valley",
    district: "Champhai",
    lat: 23.4543,
    lng: 93.3286,
    fallbackRain24h: 115,
    fallbackCurrentPrecip: 6.4,
    slope: 34,
    soilMoisture: 79,
    elevation: 1350,
    lithologyIndex: 5, // Mizo Hills: Bhuban/Bokabil Shale formations
    lithology: "Bhuban / Bokabil Weathered Shale",
  },
  {
    id: "east-khasi-hills",
    name: "East Khasi Hills",
    district: "East Khasi Hills",
    lat: 25.5788,
    lng: 91.8933,
    fallbackRain24h: 89,
    fallbackCurrentPrecip: 3.2,
    slope: 31,
    soilMoisture: 72,
    elevation: 1480,
    lithologyIndex: 3, // Shillong Plateau: Precambrian granite/gneiss basement
    lithology: "Precambrian Granite & Gneiss",
  },
  {
    id: "mangan",
    name: "Mangan — North Sikkim",
    district: "North Sikkim",
    lat: 27.5127,
    lng: 88.5269,
    fallbackRain24h: 74,
    fallbackCurrentPrecip: 2.1,
    slope: 41,
    soilMoisture: 68,
    elevation: 1300,
    lithologyIndex: 3, // Sikkim: Metamorphic schist/gneiss crystalline terrain
    lithology: "Metamorphic Schist & Gneiss",
  },
  {
    id: "tripura-hills",
    name: "West Tripura Hills",
    district: "West Tripura",
    lat: 23.8315,
    lng: 91.2868,
    fallbackRain24h: 45,
    fallbackCurrentPrecip: 0.8,
    slope: 14,
    soilMoisture: 52,
    elevation: 180,
    lithologyIndex: 4, // Tipam/Dupitila: Sandstone undulating terrain
    lithology: "Tipam / Dupitila Formation",
  },
];

interface MLPredictionResult {
  riskScore: number;
  risk: RiskLevel;
  isMLInference: boolean;
  modelType: string;
  featureContributions?: Array<{
    feature: string;
    importance_pct: number;
    value: number;
    label: string;
  }>;
}

// ── In-Memory Cache (Deduplication) ──────────────────────────────────────
const CACHE_TTL_MS = 600_000; // 10 minutes (600,000 ms)

interface CachedInspectionResponse {
  payload: any;
  timestamp: number;
}

interface CachedWeatherData {
  rainfall24h: number;
  rainfall72h: number;
  api15d: number;
  currentPrecip: number;
  currentRain: number;
  soilMoistureFallback?: number;
  lithologyIndexFallback?: number;
  lithologyFallback?: string;
  isSimulated: boolean;
  timestamp: number;
}

const inspectionCache = new Map<string, CachedInspectionResponse>();
const weatherDataCache = new Map<string, CachedWeatherData>();

// Clear stale Silchar cache entries on initialization
inspectionCache.delete("24.83,92.78");
weatherDataCache.delete("24.83,92.78");
invalidateStaleCache();

/**
 * Compute 4-point cardinal DEM gradient slope (degrees).
 * Uses elevations sampled at N, S, E, W offsets (~500m) for accurate gradient.
 */
async function computeCardinalSlope(lat: number, lng: number): Promise<number | null> {
  const DELTA_DEG = 0.0045; // ~500m offset
  const DIST_M = 500;

  const coords = [
    [lat + DELTA_DEG, lng],      // North
    [lat - DELTA_DEG, lng],      // South
    [lat, lng + DELTA_DEG],      // East
    [lat, lng - DELTA_DEG],      // West
  ];

  const url =
    `https://api.open-meteo.com/v1/elevation?` +
    coords.map(([la, lo]) => `latitude=${la.toFixed(5)}&longitude=${lo.toFixed(5)}`).join("&");

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const json = await res.json();
    if (json?.error) return null;
    const elevs: number[] = json?.elevation;
    if (!Array.isArray(elevs) || elevs.length < 4) return null;

    const [hN, hS, hE, hW] = elevs;
    const gradNS = (hN - hS) / (2 * DIST_M);
    const gradEW = (hE - hW) / (2 * DIST_M);
    const gradient = Math.sqrt(gradNS ** 2 + gradEW ** 2);
    const slopeDeg = (Math.atan(gradient) * 180) / Math.PI;

    return Math.round(slopeDeg * 10) / 10;
  } catch {
    return null;
  }
}

/**
 * Compute the Antecedent Precipitation Index (API) using exponential decay
 * over 7 days of historical precipitation. Decay constant k = 0.87 per day.
 */
function computeAPI(dailyPrecip: number[]): { api15d: number; rainfall72h: number } {
  const K = 0.87; // Kohler-Linsley API decay constant
  const reversed = [...dailyPrecip].reverse(); // [today, yesterday, 2d ago, ...]

  let api15d = 0;
  for (let i = 0; i < reversed.length; i++) {
    api15d += (reversed[i] ?? 0) * Math.pow(K, i + 1);
  }
  api15d = Math.round(api15d * 10) / 10;

  // 72h sum: past 3 days (indices 1, 2, 3 of reversed array = yesterday, 2d, 3d ago)
  const rainfall72h = Math.round(
    ((reversed[1] ?? 0) + (reversed[2] ?? 0) + (reversed[3] ?? 0)) * 10
  ) / 10;

  return { api15d, rainfall72h };
}

/**
 * Infer lithology index & name from lat/lng and topography.
 * Calibrated to GSI Geological Map of NER India:
 *   - Barak Valley (Silchar, Cachar, Hailakandi) & Brahmaputra valley → Alluvial Silt & River Sediment (1)
 *   - Dima Hasao / Barail Range (mountain scarp >= 25.12°N) → Barail Group Weathered Shale (5)
 *   - Mizoram ridges → Bhuban/Bokabil Weathered Shale (5)
 *   - Shillong Plateau → Precambrian Granite & Gneiss (3)
 *   - Sikkim / Arunachal → Metamorphic Schist (3)
 *   - Mountain embankment slopes → Surma Sandstone (4)
 */
function inferLithology(
  lat: number,
  lng: number,
  isFlat: boolean,
  slope?: number
): { index: number; name: string } {
  // 1. Alluvial Valley Plains (Silchar/Barak Valley, Brahmaputra Valley, Indo-Gangetic, slope < 5°)
  if (isFlat || (typeof slope === "number" && slope < 5) || isAlluvialValleyPlain(lat, lng)) {
    return { index: 1, name: "Alluvial Silt & River Sediment" };
  }

  // 2. Dima Hasao / Barail Group Shale (highland scarp north of Barak river, lat >= 25.12)
  if (lat >= 25.12 && lat <= 26.2 && lng >= 92.8 && lng <= 93.6) {
    return { index: 5, name: "Barail Group Weathered Shale" };
  }

  // 3. Mizoram hills (Bhuban/Bokabil shale ridges)
  if (lat >= 22.0 && lat <= 24.4 && lng >= 92.6 && lng <= 94.0) {
    return { index: 5, name: "Bhuban / Bokabil Weathered Shale" };
  }

  // 4. Shillong Plateau / Meghalaya (granite gneiss)
  if (lat >= 25.0 && lat <= 26.5 && lng >= 91.0 && lng <= 92.5) {
    return { index: 3, name: "Precambrian Granite & Gneiss" };
  }

  // 5. North Sikkim / Darjeeling (metamorphic)
  if (lat >= 27.0 && lat <= 28.5 && lng >= 88.0 && lng <= 89.5) {
    return { index: 3, name: "Metamorphic Schist & Gneiss" };
  }

  // 6. Arunachal Pradesh (crystalline)
  if (lat >= 26.5 && lat <= 29.5 && lng >= 92.0 && lng <= 97.5) {
    return { index: 3, name: "Crystalline Metamorphic Complex" };
  }

  // 7. Mountain slope embankments / Surma Sandstone
  if (lat >= 24.0 && lat <= 26.0 && lng >= 92.5 && lng <= 94.5 && typeof slope === "number" && slope >= 15) {
    return { index: 4, name: "Surma Group Sandstone / Siltstone" };
  }

  // 8. Tripura hills (Tipam sandstone)
  if (lat >= 22.5 && lat <= 24.5 && lng >= 91.0 && lng <= 92.5) {
    return { index: 4, name: "Tipam / Dupitila Formation" };
  }

  return { index: 3, name: "Granite / Crystalline Rock" };
}

/**
 * Fetch 7-day weather history from Open-Meteo with deduplicating in-memory cache
 * and zero-failure rate limit / offline fallback.
 */
async function fetchWeatherWithFallback(
  lat: number,
  lng: number,
  slope?: number
): Promise<CachedWeatherData> {
  const coordKey = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  const cached = weatherDataCache.get(coordKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached;
  }

  const weatherUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}` +
    `&current=precipitation,rain&daily=precipitation_sum&past_days=7&forecast_days=1&timezone=Asia%2FKolkata`;

  try {
    const res = await fetch(weatherUrl, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(5000),
    });

    if (res.status === 429) {
      console.warn(`[Open-Meteo] 429 Rate Limit for (${lat.toFixed(2)}, ${lng.toFixed(2)}). Using synthesized fallback.`);
      const synth = getSynthesizedWeatherData(lat, lng, slope);
      const fallbackData: CachedWeatherData = {
        rainfall24h: synth.rainfall24h,
        rainfall72h: synth.rainfall72h,
        api15d: synth.api15d,
        currentPrecip: synth.currentPrecipitation,
        currentRain: synth.currentRain,
        soilMoistureFallback: synth.soilMoisture,
        lithologyIndexFallback: synth.lithologyIndex,
        lithologyFallback: synth.lithology,
        isSimulated: true,
        timestamp: Date.now(),
      };
      weatherDataCache.set(coordKey, fallbackData);
      return fallbackData;
    }

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const json = await res.json();
    if (json?.error) {
      console.warn(`[Open-Meteo] API error for (${lat.toFixed(2)}, ${lng.toFixed(2)}): ${json?.reason || "error"}. Using synthesized fallback.`);
      const synth = getSynthesizedWeatherData(lat, lng, slope);
      const fallbackData: CachedWeatherData = {
        rainfall24h: synth.rainfall24h,
        rainfall72h: synth.rainfall72h,
        api15d: synth.api15d,
        currentPrecip: synth.currentPrecipitation,
        currentRain: synth.currentRain,
        soilMoistureFallback: synth.soilMoisture,
        lithologyIndexFallback: synth.lithologyIndex,
        lithologyFallback: synth.lithology,
        isSimulated: true,
        timestamp: Date.now(),
      };
      weatherDataCache.set(coordKey, fallbackData);
      return fallbackData;
    }

    const dailySums: number[] = json?.daily?.precipitation_sum ?? [];
    const todaySum = dailySums[dailySums.length - 1] ?? 0;
    const rainfall24h = typeof todaySum === "number" ? Math.round(todaySum * 10) / 10 : 0;

    const currentPrecip = json?.current?.precipitation ?? json?.current?.rain ?? 0;
    const currentRain = json?.current?.rain ?? currentPrecip;

    const { api15d, rainfall72h } = computeAPI(dailySums);

    const liveData: CachedWeatherData = {
      rainfall24h,
      rainfall72h,
      api15d,
      currentPrecip: Math.round(currentPrecip * 10) / 10,
      currentRain: Math.round(currentRain * 10) / 10,
      isSimulated: false,
      timestamp: Date.now(),
    };
    weatherDataCache.set(coordKey, liveData);
    return liveData;
  } catch (err) {
    console.warn(`[Open-Meteo] Exception during weather fetch for (${lat.toFixed(2)}, ${lng.toFixed(2)}): ${err}. Using synthesized fallback.`);
    const synth = getSynthesizedWeatherData(lat, lng, slope);
    const fallbackData: CachedWeatherData = {
      rainfall24h: synth.rainfall24h,
      rainfall72h: synth.rainfall72h,
      api15d: synth.api15d,
      currentPrecip: synth.currentPrecipitation,
      currentRain: synth.currentRain,
      soilMoistureFallback: synth.soilMoisture,
      lithologyIndexFallback: synth.lithologyIndex,
      lithologyFallback: synth.lithology,
      isSimulated: true,
      timestamp: Date.now(),
    };
    weatherDataCache.set(coordKey, fallbackData);
    return fallbackData;
  }
}

/**
 * Call the FastAPI ML microservice with the full 6-feature v2 payload.
 * Enforces a 1.5s timeout and falls back to the deterministic heuristic
 * if the Python service is offline or returns any error.
 */
async function getLandslidePrediction(params: {
  slope: number;
  rainfall24h: number;
  rainfall72h: number;
  api15d: number;
  soilMoisture: number;
  lithologyIndex: number;
  elevation: number;
}): Promise<MLPredictionResult> {
  const { slope, rainfall24h, rainfall72h, api15d, soilMoisture, lithologyIndex } = params;

  // GEOTECHNICAL HARD GATE: Slopes < 10° cannot experience slope stability failure
  if (slope < 10) {
    const traceRisk = Math.min(3, Math.round((rainfall24h / 200) * 3));
    return {
      riskScore: Math.max(0, traceRisk),
      risk: "SAFE",
      isMLInference: true,
      modelType: "GSI-Gated-v2",
      featureContributions: [
        { feature: "slope", importance_pct: 0, value: slope, label: "N/A — GSI Flat Plain Gate" },
        { feature: "rainfall_24h", importance_pct: 0, value: rainfall24h, label: "N/A — GSI Flat Plain Gate" },
        { feature: "rainfall_72h", importance_pct: 0, value: rainfall72h, label: "N/A — GSI Flat Plain Gate" },
        { feature: "api_15d", importance_pct: 0, value: api15d, label: "N/A — GSI Flat Plain Gate" },
        { feature: "soil_moisture", importance_pct: 0, value: soilMoisture, label: "N/A — GSI Flat Plain Gate" },
        { feature: "lithology_index", importance_pct: 0, value: lithologyIndex, label: "N/A — GSI Flat Plain Gate" },
      ],
    };
  }

  try {
    const mlResponse = await fetch("http://127.0.0.1:8000/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slope,
        rainfall_24h: rainfall24h,
        rainfall_72h: rainfall72h,
        api_15d: api15d,
        soil_moisture: soilMoisture,
        lithology_index: lithologyIndex,
      }),
      signal: AbortSignal.timeout(1500),
    });

    if (mlResponse.ok) {
      const mlData = await mlResponse.json();
      return {
        riskScore: mlData.risk_score,
        risk: mlData.risk_level as RiskLevel,
        isMLInference: true,
        modelType: mlData.model_version || "RandomForest-v2-6F",
        featureContributions: mlData.feature_contributions,
      };
    }
  } catch {
    // Microservice offline or timeout; fall back gracefully to heuristic below
  }

  // Fallback heuristic scoring
  const heuristicScore = computeRiskScore(rainfall24h, soilMoisture, slope);
  return {
    riskScore: heuristicScore,
    risk: scoreToRiskLevel(heuristicScore),
    isMLInference: false,
    modelType: "Heuristic Fallback",
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latParam = searchParams.get("lat");
  const lngParam = searchParams.get("lng");
  const timestamp = new Date().toISOString();

  // ── Single Coordinate Query: Inspect Mode (Click or Search) ────────────
  if (latParam !== null && lngParam !== null) {
    const lat = parseFloat(latParam);
    const lng = parseFloat(lngParam);

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { success: false, error: "Invalid lat/lng parameters" },
        { status: 400 }
      );
    }

    const coordKey = `${lat.toFixed(2)},${lng.toFixed(2)}`;

    // Invalidate stale cache if requested or if cached data had old erroneous high rainfall in valley plains
    const existing = inspectionCache.get(coordKey);
    if (
      searchParams.get("refresh") === "1" ||
      (existing && isAlluvialValleyPlain(lat, lng) && existing.payload?.data?.rainfall24h > 10)
    ) {
      inspectionCache.delete(coordKey);
      weatherDataCache.delete(coordKey);
    }

    // 1. In-Memory Cache Check: return cached results immediately without hitting network
    const cached = inspectionCache.get(coordKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json(cached.payload, {
        headers: {
          "X-Cache-Status": "HIT",
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
        },
      });
    }

    // 2. 4-point cardinal DEM slope + elevation from terrain API (with graceful fallback)
    const terrain = await calculateTerrainSlope(lat, lng);
    const cardinalSlope = await computeCardinalSlope(lat, lng);
    const slope = cardinalSlope ?? terrain.slope;
    const isFlat = terrain.isFlat || slope < 10 || isAlluvialValleyPlain(lat, lng);

    // 3. Resilient weather history fetch (pass slope and coordinates for accurate fallback)
    const weather = await fetchWeatherWithFallback(lat, lng, slope);

    // 4. Soil moisture & Lithology index
    let soilMoisture: number;
    let lithologyIndex: number;
    let lithology: string;

    if (weather.isSimulated && weather.soilMoistureFallback != null && weather.lithologyIndexFallback != null) {
      soilMoisture = weather.soilMoistureFallback;
      lithologyIndex = weather.lithologyIndexFallback;
      lithology = weather.lithologyFallback || (lithologyIndex === 1 ? "Alluvial Silt & River Sediment" : "Sandstone Formation");
    } else {
      const litho = inferLithology(lat, lng, isFlat, slope);
      lithologyIndex = litho.index;
      lithology = litho.name;
      soilMoisture = isFlat
        ? Math.min(65, Math.round(30 + (weather.rainfall24h / 150) * 35))
        : Math.min(95, Math.round(55 + ((weather.rainfall24h + weather.rainfall72h * 0.4) / 280) * 40));
    }

    // 5. ML prediction (6-feature) or heuristic fallback
    const prediction = await getLandslidePrediction({
      slope,
      rainfall24h: weather.rainfall24h,
      rainfall72h: weather.rainfall72h,
      api15d: weather.api15d,
      soilMoisture,
      lithologyIndex,
      elevation: terrain.elevation,
    });

    const trigger = buildTrigger(weather.rainfall24h, weather.currentPrecip, soilMoisture, slope);

    const payload = {
      success: true,
      isLive: !weather.isSimulated,
      isSimulated: weather.isSimulated,
      isMLInference: prediction.isMLInference,
      modelType: prediction.modelType,
      timestamp,
      data: {
        lat,
        lng,
        elevation: terrain.elevation,
        slope,
        isFlat,
        terrainCategory: terrain.terrainCategory,
        rainfall24h: weather.rainfall24h,
        rainfall72h: weather.rainfall72h,
        api15d: weather.api15d,
        currentPrecipitation: weather.currentPrecip,
        rain: weather.currentRain,
        riskScore: prediction.riskScore,
        risk: prediction.risk,
        soilMoisture,
        lithologyIndex,
        lithology,
        trigger,
        source: weather.isSimulated ? ("fallback" as const) : ("live" as const),
        isSimulated: weather.isSimulated,
        isMLInference: prediction.isMLInference,
        modelType: prediction.modelType,
        featureContributions: prediction.featureContributions,
      },
    };

    // Cache the response
    inspectionCache.set(coordKey, { payload, timestamp: Date.now() });

    return NextResponse.json(payload, {
      headers: {
        "X-Cache-Status": "MISS",
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
      },
    });
  }

  // ── Default Batch Mode: All Pre-configured NER Zones ───────────────────
  const fetchPromises = NER_COORDINATES.map(async (coord) => {
    const weather = await fetchWeatherWithFallback(coord.lat, coord.lng, coord.slope);

    const rainfall24h = weather.rainfall24h;
    const rainfall72h = weather.rainfall72h;
    const api15d = weather.api15d;
    const currentPrecip = weather.currentPrecip;
    const currentRain = weather.currentRain;
    const soilMoisture = weather.isSimulated && weather.soilMoistureFallback != null
      ? weather.soilMoistureFallback
      : coord.soilMoisture;
    const lithologyIndex = weather.isSimulated && weather.lithologyIndexFallback != null
      ? weather.lithologyIndexFallback
      : coord.lithologyIndex;
    const lithology = weather.lithologyFallback || coord.lithology || (lithologyIndex === 1 ? "Alluvial Silt & River Sediment" : "Sandstone Formation");

    const prediction = await getLandslidePrediction({
      slope: coord.slope,
      rainfall24h,
      rainfall72h,
      api15d,
      soilMoisture,
      lithologyIndex,
      elevation: coord.elevation,
    });

    const trigger = buildTrigger(rainfall24h, currentPrecip, soilMoisture, coord.slope);

    return {
      id: coord.id,
      name: coord.name,
      district: coord.district,
      lat: coord.lat,
      lng: coord.lng,
      rainfall24h,
      rainfall72h,
      api15d,
      currentPrecipitation: currentPrecip,
      rain: currentRain,
      slope: coord.slope,
      soilMoisture,
      elevation: coord.elevation,
      lithologyIndex,
      lithology,
      riskScore: prediction.riskScore,
      risk: prediction.risk,
      trigger,
      isMLInference: prediction.isMLInference,
      modelType: prediction.modelType,
      featureContributions: prediction.featureContributions,
      isSimulated: weather.isSimulated,
      fetchedAt: timestamp,
      source: weather.isSimulated ? ("fallback" as const) : ("live" as const),
    };
  });

  const settled = await Promise.allSettled(fetchPromises);

  const data = settled.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    }
    const coord = NER_COORDINATES[index];
    const synth = getSynthesizedWeatherData(coord.lat, coord.lng, coord.slope);
    const fallbackScore = computeRiskScore(synth.rainfall24h, synth.soilMoisture, coord.slope);
    return {
      id: coord.id,
      name: coord.name,
      district: coord.district,
      lat: coord.lat,
      lng: coord.lng,
      rainfall24h: synth.rainfall24h,
      rainfall72h: synth.rainfall72h,
      api15d: synth.api15d,
      currentPrecipitation: synth.currentPrecipitation,
      rain: synth.currentRain,
      slope: coord.slope,
      soilMoisture: synth.soilMoisture,
      elevation: coord.elevation,
      lithologyIndex: synth.lithologyIndex,
      lithology: synth.lithology,
      riskScore: fallbackScore,
      risk: scoreToRiskLevel(fallbackScore),
      trigger: buildTrigger(synth.rainfall24h, synth.currentPrecipitation, synth.soilMoisture, coord.slope),
      isMLInference: false,
      modelType: "Synthesized Fallback",
      isSimulated: true,
      fetchedAt: timestamp,
      source: "fallback" as const,
    };
  });

  const hasML = data.some((d) => d.isMLInference);
  const isAnySimulated = data.some((d) => d.isSimulated);

  return NextResponse.json(
    {
      success: true,
      isLive: !isAnySimulated,
      isSimulated: isAnySimulated,
      isMLInference: hasML,
      timestamp,
      data,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
      },
    }
  );
}
