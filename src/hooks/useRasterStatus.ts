import { useCallback, useEffect, useRef, useState } from "react";
import { parcelService } from "../Services/parcelService";
import type { RasterStatus } from "../types/parcel";

const POLL_INTERVAL_MS = 5000; // 5s : assez réactif sans matraquer le backend

interface UseRasterStatusResult {
  rasterStatus: RasterStatus | null;
  loading: boolean;
  error: string | null;
  /** Incrémente à chaque passage "pending" -> "ready" : sert de signal pour
   * que ParcelMapCard sache qu'il doit redemander une nouvelle URL signée. */
  readyTick: number;
}

/**
 * Suit raster_status d'une parcelle et relance un polling tant qu'il vaut
 * "pending" (traitement Celery en cours après création/modification de
 * géométrie). S'arrête dès que "ready" ou "failed", ou si parcelId change.
 */
export function useRasterStatus(parcelId: number | null): UseRasterStatusResult {
  const [rasterStatus, setRasterStatus] = useState<RasterStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [readyTick, setReadyTick] = useState(0);

  const previousStatusRef = useRef<RasterStatus | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPending = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    clearPending();
    previousStatusRef.current = null;
    setRasterStatus(null);
    setError(null);

    if (parcelId === null) {
      return;
    }

    let cancelled = false;

    const poll = async () => {
      setLoading(true);
      try {
        const response = await parcelService.rasterStatus(parcelId);
        if (cancelled) return;

        const status = response.raster_status;
        setError(null);

        // "pending" -> autre chose : on notifie qu'une nouvelle image est
        // probablement disponible, pour que ParcelMapCard redemande son URL.
        if (previousStatusRef.current === "pending" && status !== "pending") {
          setReadyTick((t) => t + 1);
        }
        previousStatusRef.current = status;
        setRasterStatus(status);

        if (status === "pending") {
          timeoutRef.current = setTimeout(poll, POLL_INTERVAL_MS);
        }
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Impossible de vérifier l'état des rasters."
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    poll();

    return () => {
      cancelled = true;
      clearPending();
    };
  }, [parcelId, clearPending]);

  return { rasterStatus, loading, error, readyTick };
}