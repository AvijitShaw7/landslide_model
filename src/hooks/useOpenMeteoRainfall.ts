"use client";

/**
 * useOpenMeteoRainfall
 *
 * Client-side hook that:
 *  1. On initial mount and intervals, calls the server-side route `/api/rainfall`.
 *  2. On response receiving `success: true`, immediately updates state:
 *     isOnline = true, isLoading = false, isMLInference = true/false.
 *  3. Merges live rainfall & ML risk scores into NER zones.
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
  isMLInference: boolean;
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
  const [isMLInference, setIsMLInference] = useState(false);
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
        const itemMap = new Map<string, any>();

        if (Array.isArray(json.data)) {
          for (const item of json.data) {
            itemMap.set(item.id, item);
            liveMap.set(item.id, {
              rainfall24h: item.rainfall24h,
              currentPrecipitation: item.currentPrecipitation ?? 0,
              fetchedAt: item.fetchedAt || json.timestamp,
              source: item.source || "live",
              isMLInference: item.isMLInference ?? false,
              modelType: item.modelType,
              featureContributions: item.featureContributions,
              isSimulated: item.isSimulated ?? false,
            });
          }
        }

        const mlActive = Boolean(json.isMLInference);
        setIsMLInference(mlActive);

        // Merge live data and ML inference into base zone definitions
        const updatedBaseZones: NERZone[] = NER_ZONES.map((zone) => {
          const live = liveMap.get(zone.id);
          const liveItem = itemMap.get(zone.id);

          if (!live) {
            return {
              ...zone,
              lastUpdated: json.timestamp || new Date().toISOString(),
            };
          }

          // Use ML model output if available, otherwise heuristic formula
          const newScore = typeof liveItem?.riskScore === "number"
            ? liveItem.riskScore
            : computeRiskScore(live.rainfall24h, zone.soilMoisture, zone.slope);

          const newRisk = liveItem?.risk || scoreToRiskLevel(newScore);
          const newTrigger = liveItem?.trigger || buildTrigger(
            live.rainfall24h,
            live.currentPrecipitation,
            zone.soilMoisture,
            zone.slope
          );

          return {
            ...zone,
            rainfall24h: live.rainfall24h,
            riskScore: newScore,
            risk: newRisk,
            trigger: newTrigger,
            isMLInference: liveItem?.isMLInference ?? mlActive,
            modelType: liveItem?.modelType,
            rainfall72h: liveItem?.rainfall72h,
            api15d: liveItem?.api15d,
            lithologyIndex: liveItem?.lithologyIndex,
            featureContributions: liveItem?.featureContributions,
            isSimulated: liveItem?.isSimulated ?? false,
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
              isMLInference: cz.isMLInference,
              modelType: cz.modelType,
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
        console.log("[Weather & ML API] Fresh data synced", new Date().toLocaleTimeString());
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
          isMLInference: false,
          modelType: "Heuristic Fallback",
        });
      }
      setRainfallMap(fallbackMap);
      setIsMLInference(false);
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
        isMLInference: newZone.isMLInference,
        modelType: newZone.modelType,
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
    isMLInference,
    lastFetched,
    errors,
    refetch: doFetch,
    addCustomZone,
  };
}
