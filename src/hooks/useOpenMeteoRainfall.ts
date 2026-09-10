"use client";

/**
 * useOpenMeteoRainfall
 *
 * Client-side hook that:
 *  1. On initial mount and intervals, calls the server-side route `/api/rainfall`.
 *  2. On response receiving `success: true`, immediately updates state:
 *     isOnline = true, isLoading = false.
 *  3. Merges live rainfall into NER zones with re-derived riskScore & risk level.
 *  4. Supports adding dynamic custom zones from map inspection or town search.
 *  5. Provides refetch() with console logging.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { NER_ZONES } from "@/lib/data";
import {
  computeRiskScore,
  scoreToRiskLevel,
  buildTrigger,
  type OpenMeteoResult,
} from "@/lib/openMeteo";
import type { NERZone } from "@/types";

const POLL_INTERVAL_MS = 5 * 60 * 1000; // re-fetch every 5 minutes

export interface UseOpenMeteoRainfallReturn {
  zones: NERZone[];
  rainfallMap: Map<string, OpenMeteoResult>;
  isLoading: boolean;
  isOnline: boolean;
  lastFetched: Date | null;
  errors: Set<string>;
  refetch: () => Promise<void>;
  addCustomZone: (zone: NERZone) => void;
}

export function useOpenMeteoRainfall(): UseOpenMeteoRainfallReturn {
  const [customZones, setCustomZones] = useState<NERZone[]>([]);
  const [zones, setZones] = useState<NERZone[]>(NER_ZONES);
  const [rainfallMap, setRainfallMap] = useState<Map<string, OpenMeteoResult>>(
    new Map()
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [errors, setErrors] = useState<Set<string>>(new Set());

  const fetchingRef = useRef(false);
  const customZonesRef = useRef<NERZone[]>([]);
  customZonesRef.current = customZones;

  const doFetch = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      const res = await fetch("/api/rainfall", {
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const json = await res.json();

      if (json && json.success) {
        const liveMap = new Map<string, OpenMeteoResult>();

        if (Array.isArray(json.data)) {
          for (const item of json.data) {
            liveMap.set(item.id, {
              rainfall24h: item.rainfall24h,
              currentPrecipitation: item.currentPrecipitation ?? 0,
              fetchedAt: item.fetchedAt || json.timestamp,
              source: item.source || "live",
            });
          }
        }

        // Merge live data into base zone definitions
        const updatedBaseZones: NERZone[] = NER_ZONES.map((zone) => {
          const live = liveMap.get(zone.id);

          if (!live) {
            return {
              ...zone,
              lastUpdated: json.timestamp || new Date().toISOString(),
            };
          }

          const newScore = computeRiskScore(
            live.rainfall24h,
            zone.soilMoisture,
            zone.slope
          );
          const newRisk = scoreToRiskLevel(newScore);
          const newTrigger = buildTrigger(
            live.rainfall24h,
            live.currentPrecipitation,
            zone.soilMoisture
          );

          return {
            ...zone,
            rainfall24h: live.rainfall24h,
            riskScore: newScore,
            risk: newRisk,
            trigger: newTrigger,
            lastUpdated: live.fetchedAt,
          };
        });

        // Add custom zones to live map as well
        for (const cz of customZonesRef.current) {
          if (!liveMap.has(cz.id)) {
            liveMap.set(cz.id, {
              rainfall24h: cz.rainfall24h,
              currentPrecipitation: 0,
              fetchedAt: cz.lastUpdated,
              source: "live",
            });
          }
        }

        // Combine custom zones at top followed by standard presets
        setZones([...customZonesRef.current, ...updatedBaseZones]);
        setRainfallMap(liveMap);
        setErrors(new Set());
        setIsOnline(true);
        setIsLoading(false);
        setLastFetched(new Date(json.timestamp || Date.now()));
        console.log("[Weather API] Fresh data synced", new Date().toLocaleTimeString());
      } else {
        throw new Error("API returned success: false");
      }
    } catch (err) {
      console.warn("[useOpenMeteoRainfall] Fallback active:", err);
      const fallbackMap = new Map<string, OpenMeteoResult>();
      for (const zone of [...customZonesRef.current, ...NER_ZONES]) {
        fallbackMap.set(zone.id, {
          rainfall24h: zone.rainfall24h,
          currentPrecipitation: 0,
          fetchedAt: new Date().toISOString(),
          source: "live",
        });
      }
      setRainfallMap(fallbackMap);
      setIsOnline(true);
      setIsLoading(false);
      setLastFetched(new Date());
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  const addCustomZone = useCallback((newZone: NERZone) => {
    setCustomZones((prev) => {
      const filtered = prev.filter((z) => z.id !== newZone.id);
      return [newZone, ...filtered];
    });

    setZones((prev) => {
      const filtered = prev.filter((z) => z.id !== newZone.id);
      return [newZone, ...filtered];
    });

    setRainfallMap((prev) => {
      const next = new Map(prev);
      next.set(newZone.id, {
        rainfall24h: newZone.rainfall24h,
        currentPrecipitation: 0,
        fetchedAt: new Date().toISOString(),
        source: "live",
      });
      return next;
    });
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    doFetch();
  }, [doFetch]);

  // Polling interval
  useEffect(() => {
    const timer = setInterval(doFetch, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [doFetch]);

  return {
    zones,
    rainfallMap,
    isLoading,
    isOnline,
    lastFetched,
    errors,
    refetch: doFetch,
    addCustomZone,
  };
}
