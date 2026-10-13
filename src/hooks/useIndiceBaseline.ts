import { useEffect, useState } from "react";
import { indiceService } from "../Services/indiceService";
import type { IndiceBaseline } from "../types/indice";

/**
 * Plage habituelle de l'indice choisi pour une parcelle, calculée par le
 * back sur l'historique des années précédentes. Rechargée à chaque
 * changement de parcelle ou d'indice.
 */
export function useIndiceBaseline(parcelId: number | null, indiceName: string | null) {
  const [baseline, setBaseline] = useState<IndiceBaseline | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (parcelId == null || !indiceName) {
      setBaseline(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    indiceService
      .baseline(parcelId, indiceName)
      .then((b) => !cancelled && setBaseline(b))
      .catch(() => !cancelled && setBaseline(null))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [parcelId, indiceName]);

  return { baseline, loading };
}