/**
 * Open-Meteo API utility
 *
 * Fetches the last 24-hour accumulated precipitation (mm) for a
 * given lat/lng using the free Open-Meteo hourly endpoint.
 *
 * API docs: https://open-meteo.com/en/docs
 *
 * Strategy: request hourly precipitation for the past 24 h, then
 * sum all non-null values. This gives us the "rain accumulated in
 * the last 24 h" figure that the rest of the app uses for risk
 * scoring.
 */

export interface OpenMeteoResult {
  rainfall24h: number; // mm accumulated in last 24 h
  currentPrecipitation: number; // mm currently falling (instant)
  fetchedAt: string; // ISO timestamp
  source: "live" | "fallback";
}

const BASE_URL = "https://api.open-meteo.com/v1/forecast";

/**
 * Fetch 24-h accumulated rain + current precipitation for one coordinate.
 * Returns null if the network call fails (caller falls back to static data).
 */
export async function fetchRainfall(
  lat: number,
  lng: number
): Promise<OpenMeteoResult | null> {
  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lng.toFixed(4),
    hourly: "precipitation",
    current: "precipitation",
    past_hours: "24",
    forecast_hours: "0",
    timezone: "Asia/Kolkata",
  });

  const url = `${BASE_URL}?${params}`;

  try {
    const res = await fetch(url, {
      // We want reasonably fresh data; 5-min revalidation is fine
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(8_000), // 8 s hard timeout
    });

    if (!res.ok) {
      // 429 = rate-limited; 4xx/5xx → fall back to static
      console.warn(`[Open-Meteo] HTTP ${res.status} for (${lat},${lng})`);
      return null;
    }

    const json = await res.json();

    // Open-Meteo returns { error: true, reason: "..." } on rate-limit even with 200
    if (json?.error) {
      console.warn(`[Open-Meteo] API error for (${lat},${lng}):`, json.reason);
      return null;
    }

    // Sum the last 24 hourly buckets (some may be null — treat as 0)
    const hourlyPrecip: (number | null)[] = json?.hourly?.precipitation ?? [];
    const rainfall24h = hourlyPrecip.reduce<number>(
      (sum, v) => sum + (v ?? 0),
      0
    );

    // Current instant precipitation (mm in the current hour)
    const currentPrecipitation: number =
      json?.current?.precipitation ?? 0;

    return {
      rainfall24h: Math.round(rainfall24h * 10) / 10, // 1 dp
      currentPrecipitation: Math.round(currentPrecipitation * 10) / 10,
      fetchedAt: new Date().toISOString(),
      source: "live",
    };
  } catch (err) {
    console.warn(`[Open-Meteo] Fetch failed for (${lat},${lng}):`, err);
    return null;
  }
}

/**
 * Parallel-fetch rainfall for multiple (lat, lng) pairs.
 * Failed individual calls are returned as null — callers should fall back
 * to static values for those entries.
 */
export async function fetchRainfallBatch(
  coords: { id: string; lat: number; lng: number }[]
): Promise<Map<string, OpenMeteoResult>> {
  const results = await Promise.allSettled(
    coords.map(({ id, lat, lng }) =>
      fetchRainfall(lat, lng).then((r) => ({ id, result: r }))
    )
  );

  const map = new Map<string, OpenMeteoResult>();
  for (const r of results) {
    if (r.status === "fulfilled" && r.value.result !== null) {
      map.set(r.value.id, r.value.result);
    }
  }
  return map;
}

/**
 * Re-compute a risk score (0–100) from live rainfall + the zone's static
 * baseline parameters (soilMoisture, slope).
 *
 * The formula is a simplified multi-factor scoring model:
 *
 *   rainfall component  → 0–50 pts (dominant driver)
 *   soil moisture       → 0–25 pts
 *   slope               → 0–25 pts
 *
 * Thresholds are calibrated for the NER monsoon climate:
 *   rainfall24h > 200 mm → maximum score from rainfall
 *   soilMoisture > 90 %  → maximum score from moisture
 *   slope > 45 °         → maximum score from slope
 */
export function computeRiskScore(
  rainfall24h: number,
  soilMoisture: number,
  slope: number
): number {
  const rainScore = Math.min(50, (rainfall24h / 200) * 50);
  const moistureScore = Math.min(25, (soilMoisture / 90) * 25);
  const slopeScore = Math.min(25, (slope / 45) * 25);
  return Math.min(100, Math.round(rainScore + moistureScore + slopeScore));
}

/**
 * Map a numeric risk score to a qualitative level.
 */
export function scoreToRiskLevel(
  score: number
): "CRITICAL" | "HIGH" | "MODERATE" | "LOW" | "SAFE" {
  if (score >= 80) return "CRITICAL";
  if (score >= 65) return "HIGH";
  if (score >= 45) return "MODERATE";
  if (score >= 25) return "LOW";
  return "SAFE";
}

/**
 * Build a human-readable trigger description based on live data.
 */
export function buildTrigger(
  rainfall24h: number,
  currentPrecipitation: number,
  soilMoisture: number
): string {
  const parts: string[] = [];

  if (rainfall24h > 150)
    parts.push(`Extreme 24h rainfall (${rainfall24h} mm)`);
  else if (rainfall24h > 80)
    parts.push(`Heavy 24h rainfall (${rainfall24h} mm)`);
  else if (rainfall24h > 30)
    parts.push(`Moderate rainfall (${rainfall24h} mm/24h)`);
  else parts.push(`Low rainfall (${rainfall24h} mm/24h)`);

  if (currentPrecipitation > 5)
    parts.push(`currently ${currentPrecipitation} mm/h`);

  if (soilMoisture > 85) parts.push("saturated slopes");
  else if (soilMoisture > 70) parts.push("elevated soil moisture");

  return parts.join(" + ");
}
