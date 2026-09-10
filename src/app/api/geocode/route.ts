import { NextResponse } from "next/server";

export const revalidate = 600; // Cache search & reverse geocoding for 10 minutes

interface NERPresetTown {
  name: string;
  district: string;
  state: string;
  lat: number;
  lng: number;
  type: string;
}

const NER_PRESET_TOWNS: NERPresetTown[] = [
  { name: "Tawang", district: "Tawang", state: "Arunachal Pradesh", lat: 27.5879, lng: 91.8637, type: "High-Altitude Town & Pass" },
  { name: "Haflong", district: "Dima Hasao", state: "Assam", lat: 25.1788, lng: 93.0205, type: "Hill Station" },
  { name: "Kohima", district: "Kohima", state: "Nagaland", lat: 25.6751, lng: 94.1086, type: "State Capital / Hill City" },
  { name: "Gangtok", district: "East Sikkim", state: "Sikkim", lat: 27.3389, lng: 88.6065, type: "State Capital" },
  { name: "Shillong", district: "East Khasi Hills", state: "Meghalaya", lat: 25.5788, lng: 91.8933, type: "State Capital" },
  { name: "Cherrapunji (Sohra)", district: "East Khasi Hills", state: "Meghalaya", lat: 25.2702, lng: 91.7323, type: "High Precipitation Plateau" },
  { name: "Mangan", district: "North Sikkim", state: "Sikkim", lat: 27.5127, lng: 88.5269, type: "Landslide Vulnerable Valley" },
  { name: "Champhai", district: "Champhai", state: "Mizoram", lat: 23.4543, lng: 93.3286, type: "Border Valley" },
  { name: "Aizawl", district: "Aizawl", state: "Mizoram", lat: 23.7271, lng: 92.7176, type: "Ridge City" },
  { name: "Itanagar", district: "Papum Pare", state: "Arunachal Pradesh", lat: 27.0844, lng: 93.6053, type: "Foothill Capital" },
  { name: "Bomdila", district: "West Kameng", state: "Arunachal Pradesh", lat: 27.2645, lng: 92.4239, type: "Mountain Pass" },
  { name: "Ziro", district: "Lower Subansiri", state: "Arunachal Pradesh", lat: 27.595, lng: 93.834, type: "Highland Valley" },
  { name: "Diphu", district: "Karbi Anglong", state: "Assam", lat: 25.8459, lng: 93.4316, type: "Hill Town" },
  { name: "Silchar", district: "Cachar", state: "Assam", lat: 24.8333, lng: 92.7789, type: "Barak Valley City" },
  { name: "Tura", district: "West Garo Hills", state: "Meghalaya", lat: 25.5137, lng: 90.2201, type: "Garo Hills Foothill" },
  { name: "Mokokchung", district: "Mokokchung", state: "Nagaland", lat: 26.3262, lng: 94.5165, type: "Ao Hills Hub" },
  { name: "Dimapur", district: "Dimapur", state: "Nagaland", lat: 25.9068, lng: 93.7271, type: "Gateway City" },
  { name: "Lunglei", district: "Lunglei", state: "Mizoram", lat: 22.8887, lng: 92.7339, type: "Southern Hill Town" },
  { name: "Namchi", district: "South Sikkim", state: "Sikkim", lat: 27.1663, lng: 88.3585, type: "Sub-Himalayan Town" },
  { name: "Pelling", district: "West Sikkim", state: "Sikkim", lat: 27.3167, lng: 88.2333, type: "High Ridge" },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon") || searchParams.get("lng");

  // ── 1. Reverse Geocoding Mode ───────────────────────────────────────────
  if (lat && lon) {
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);

    if (isNaN(latNum) || isNaN(lonNum)) {
      return NextResponse.json({ success: false, error: "Invalid coordinates" }, { status: 400 });
    }

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latNum.toFixed(4)}&lon=${lonNum.toFixed(4)}&zoom=14&addressdetails=1`,
        {
          headers: {
            "User-Agent": "NER-Landslide-Early-Warning-System/1.0 (sih-ner-monitor)",
            "Accept-Language": "en",
          },
          signal: AbortSignal.timeout(4000),
        }
      );

      if (res.ok) {
        const json = await res.json();
        const address = json.address || {};
        const placeName =
          json.name ||
          address.suburb ||
          address.village ||
          address.town ||
          address.city ||
          address.county ||
          address.state_district ||
          `Locality (${latNum.toFixed(3)}°N, ${lonNum.toFixed(3)}°E)`;

        const district = address.state_district || address.county || address.city || "NER Sector";
        const state = address.state || "North Eastern Region";

        return NextResponse.json({
          success: true,
          data: {
            name: placeName,
            displayName: json.display_name || `${placeName}, ${district}, ${state}`,
            district,
            state,
            lat: latNum,
            lng: lonNum,
          },
        });
      }
    } catch {
      // Fallback
    }

    // Nearest known preset check or clean coordinate label
    return NextResponse.json({
      success: true,
      data: {
        name: `Slope Sector (${latNum.toFixed(3)}°N, ${lonNum.toFixed(3)}°E)`,
        displayName: `Inspected Coordinate [${latNum.toFixed(4)}, ${lonNum.toFixed(4)}], North Eastern Region`,
        district: "High-Risk Corridor",
        state: "NER",
        lat: latNum,
        lng: lonNum,
      },
    });
  }

  // ── 2. Place Search Mode ────────────────────────────────────────────────
  if (q && q.length >= 2) {
    const queryLower = q.toLowerCase();

    // First check local curated presets for immediate high-accuracy match
    const localMatches = NER_PRESET_TOWNS.filter(
      (t) =>
        t.name.toLowerCase().includes(queryLower) ||
        t.district.toLowerCase().includes(queryLower) ||
        t.state.toLowerCase().includes(queryLower)
    ).map((t) => ({
      id: `local-${t.name.toLowerCase().replace(/\s+/g, "-")}`,
      name: t.name,
      displayName: `${t.name}, ${t.district}, ${t.state}`,
      district: t.district,
      state: t.state,
      lat: t.lat,
      lng: t.lng,
      type: t.type,
    }));

    try {
      // Query OpenStreetMap Nominatim with NER bounding box bias
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        q
      )}&countrycodes=in&viewbox=88.0,29.5,97.5,21.5&bounded=0&limit=5&addressdetails=1`;

      const res = await fetch(url, {
        headers: {
          "User-Agent": "NER-Landslide-Early-Warning-System/1.0 (sih-ner-monitor)",
          "Accept-Language": "en",
        },
        signal: AbortSignal.timeout(4000),
      });

      if (res.ok) {
        const json = await res.json();
        const osmResults = json.map((item: any) => {
          const addr = item.address || {};
          return {
            id: `osm-${item.place_id}`,
            name: item.name || item.display_name.split(",")[0],
            displayName: item.display_name,
            district: addr.state_district || addr.county || addr.city || "NER",
            state: addr.state || "India",
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            type: item.type || "Location",
          };
        });

        // Deduplicate and combine (local matches first)
        const combined = [...localMatches];
        for (const osm of osmResults) {
          if (!combined.some((c) => Math.abs(c.lat - osm.lat) < 0.05 && Math.abs(c.lng - osm.lng) < 0.05)) {
            combined.push(osm);
          }
        }

        return NextResponse.json({
          success: true,
          data: combined.slice(0, 8),
        });
      }
    } catch {
      // Fallback to local matches
    }

    return NextResponse.json({
      success: true,
      data: localMatches,
    });
  }

  return NextResponse.json({ success: true, data: [] });
}
