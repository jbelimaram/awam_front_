import { useEffect, useState } from "react";
import { cropService } from "../Services/cropService";
import { diagnosisService } from "../Services/diagnosisService";
import type { Crop } from "../types/crop";
import type { Diagnosis } from "../types/diagnosis";

export interface CropDiagnosisItem {
  crop: Crop;
  diagnosis: Diagnosis;
}

interface UseCropDiagnosisResult {
  /** Une entrée par culture active dont le diagnostic a pu être calculé. */
  items: CropDiagnosisItem[];
  /** Nombre de cultures actives déclarées sur la parcelle. */
  activeCrops: number;
  loading: boolean;
}

/**
 * Diagnostic par culture de toutes les cultures EN COURS d'une parcelle.
 *
 * C'est la seule source de verdict du dashboard : seuils du document
 * agronomique, par culture, stade et âge. Une culture dont le diagnostic
 * échoue est simplement ignorée, sans bloquer les autres.
 */
export function useCropDiagnosis(parcelId: number | null): UseCropDiagnosisResult {
  const [items, setItems] = useState<CropDiagnosisItem[]>([]);
  const [activeCrops, setActiveCrops] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (parcelId == null) {
      setItems([]);
      setActiveCrops(0);
      return;
    }

    let cancelled = false;
    setLoading(true);

    cropService
      .listByParcel(parcelId)
      .then(async (crops) => {
        const active = crops.filter((c) => c.status === "active");
        if (!cancelled) setActiveCrops(active.length);

        const results = await Promise.all(
          active.map((crop) =>
            diagnosisService
              .get(crop.id)
              .then((diagnosis): CropDiagnosisItem => ({ crop, diagnosis }))
              .catch(() => null)
          )
        );
        if (!cancelled) {
          setItems(results.filter((r): r is CropDiagnosisItem => r !== null));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setItems([]);
          setActiveCrops(0);
        }
      })
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [parcelId]);

  return { items, activeCrops, loading };
}