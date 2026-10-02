import { useCallback, useRef, useState } from "react";
import { indiceService } from "../Services/indiceService";
import type { IndiceReading } from "../types/indice";

export interface ParcelIndicesSummary {
  /** Dernière valeur connue de chaque indice, pour la date d'image la plus récente. */
  readings: IndiceReading[];
  /** Date de l'image satellite utilisée (AAAA-MM-JJ). */
  sceneDate: string | null;
  loading: boolean;
}

const EMPTY: ParcelIndicesSummary = { readings: [], sceneDate: null, loading: false };

/**
 * Charge à la demande les derniers indices d'une parcelle, pour l'infobulle
 * affichée au survol de la carte. Les résultats sont gardés en mémoire :
 * survoler plusieurs fois la même parcelle ne relance pas d'appel réseau.
 */
export function useParcelIndices() {
  const cache = useRef(new Map<number, ParcelIndicesSummary>());
  const inFlight = useRef(new Set<number>());
  const [, forceRender] = useState(0);

  const get = useCallback((parcelId: number | null): ParcelIndicesSummary => {
    if (parcelId == null) return EMPTY;
    return cache.current.get(parcelId) ?? EMPTY;
  }, []);

  const load = useCallback((parcelId: number) => {
    if (cache.current.has(parcelId) || inFlight.current.has(parcelId)) return;
    inFlight.current.add(parcelId);
    cache.current.set(parcelId, { ...EMPTY, loading: true });
    forceRender((n) => n + 1);

    indiceService
      .listByParcel(parcelId)
      .then((all) => {
        // On ne garde que la dernière image disponible
        const dates = all.map((r) => r.scene_date).filter(Boolean) as string[];
        const latest = dates.length ? dates.sort()[dates.length - 1] : null;
        const readings = latest
          ? all.filter((r) => r.scene_date === latest && r.is_valid !== false)
          : [];
        cache.current.set(parcelId, { readings, sceneDate: latest, loading: false });
      })
      .catch(() => {
        cache.current.set(parcelId, { ...EMPTY, loading: false });
      })
      .finally(() => {
        inFlight.current.delete(parcelId);
        forceRender((n) => n + 1);
      });
  }, []);

  /** Vide le cache d'une parcelle (après un rafraîchissement des indices). */
  const invalidate = useCallback((parcelId: number) => {
    cache.current.delete(parcelId);
    forceRender((n) => n + 1);
  }, []);

  return { get, load, invalidate };
}