import { useEffect, useState } from "react";
import { indiceService } from "../Services/indiceService";
import type { IndiceReading } from "../types/indice";

interface UseIndiceSeriesResult {
  readings: IndiceReading[];
  availableIndices: string[];
  loading: boolean;
  error: string | null;
}

/**
 * Charge la liste des indices disponibles pour une parcelle, puis la série
 * temporelle de l'indice choisi, triée par date d'image satellite.
 */
export function useIndiceSeries(
  parcelId: number | null,
  indiceName: string | null
): UseIndiceSeriesResult {
  const [availableIndices, setAvailableIndices] = useState<string[]>([]);
  const [readings, setReadings] = useState<IndiceReading[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (parcelId == null) {
      setAvailableIndices([]);
      return;
    }
    let cancelled = false;
    indiceService
      .available(parcelId)
      .then((names) => !cancelled && setAvailableIndices(names))
      .catch(() => !cancelled && setAvailableIndices([]));
    return () => {
      cancelled = true;
    };
  }, [parcelId]);

  useEffect(() => {
    if (parcelId == null || !indiceName) {
      setReadings([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    indiceService
      .listByParcel(parcelId, indiceName)
      .then((data) => {
        if (cancelled) return;
        const sorted = [...data].sort((a, b) =>
          (a.scene_date ?? "").localeCompare(b.scene_date ?? "")
        );
        setReadings(sorted);
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Erreur de chargement."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [parcelId, indiceName]);

  return { readings, availableIndices, loading, error };
}