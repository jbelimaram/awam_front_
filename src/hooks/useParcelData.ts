import { useCallback, useEffect, useMemo, useState } from "react";
import { farmService } from "../Services/farmService";
import { parcelService } from "../Services/parcelService";
import { dashboardService } from "../Services/dashboardService";
import type { Farm, FarmPayload } from "../types/farm";
import type { DashboardParcel } from "../types/dashboard";
import type { ParcelCreatePayload, ParcelUpdatePayload } from "../types/parcel";

interface UseParcelDataResult {
  // Données brutes
  farms: Farm[];
  parcels: DashboardParcel[];

  // Dérivées de la sélection
  parcelsForSelectedFarm: DashboardParcel[];
  selectedFarm: Farm | null;
  selectedParcel: DashboardParcel | null;

  // Sélection
  selectedFarmId: number | null;
  selectedParcelId: number | null;
  selectFarm: (farmId: number | null) => void;
  selectParcel: (parcelId: number | null) => void;

  // Chargement / erreurs, distincts par source
  farmsLoading: boolean;
  parcelsLoading: boolean;
  farmsError: string | null;
  parcelsError: string | null;

  // Rafraîchissement ciblé
  refetchFarms: () => Promise<void>;
  refetchParcels: () => Promise<void>;

  // CRUD ferme
  createFarm: (payload: FarmPayload) => Promise<Farm>;
  updateFarm: (id: number, payload: Partial<FarmPayload>) => Promise<Farm>;
  removeFarm: (id: number) => Promise<void>;

  // CRUD parcelle
  createParcel: (payload: ParcelCreatePayload) => Promise<void>;
  updateParcel: (id: number, payload: ParcelUpdatePayload) => Promise<void>;
  removeParcel: (id: number) => Promise<void>;
}

/**
 * Source unique de vérité pour "quelle ferme / quelle parcelle est
 * sélectionnée" + leur CRUD, partagée par Sidebar, ParcelSelectors,
 * ParcelMapCardd, ParcelInfoCard, ParcelFormModal, etc.
 *
 * Deux sources de données INDÉPENDANTES (une ferme peut exister sans
 * aucune parcelle, donc on ne peut pas dériver l'une de l'autre) :
 *   - farmService.list()         -> fermes (CRUD complet)
 *   - dashboardService.parcels() -> parcelles, avec géométrie exploitable
 *     (parcelService.list() ne convient pas ici : geometry y est
 *     toujours null, voir ParcelResponse).
 *
 * parcelService.create/update/remove restent les endpoints utilisés pour
 * écrire ; dashboardService sert uniquement à LIRE la vue enrichie.
 */
export function useParcelData(): UseParcelDataResult {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [parcels, setParcels] = useState<DashboardParcel[]>([]);

  const [farmsLoading, setFarmsLoading] = useState<boolean>(true);
  const [parcelsLoading, setParcelsLoading] = useState<boolean>(true);
  const [farmsError, setFarmsError] = useState<string | null>(null);
  const [parcelsError, setParcelsError] = useState<string | null>(null);

  const [selectedFarmId, setSelectedFarmId] = useState<number | null>(null);
  const [selectedParcelId, setSelectedParcelId] = useState<number | null>(null);

  const refetchFarms = useCallback(async () => {
    setFarmsLoading(true);
    setFarmsError(null);
    try {
      const data = await farmService.list();
      setFarms(data);
    } catch (err) {
      setFarmsError(
        err instanceof Error ? err.message : "Impossible de charger les fermes."
      );
    } finally {
      setFarmsLoading(false);
    }
  }, []);

  const refetchParcels = useCallback(async () => {
    setParcelsLoading(true);
    setParcelsError(null);
    try {
      const response = await dashboardService.parcels();
      setParcels(response.parcelles);
    } catch (err) {
      setParcelsError(
        err instanceof Error ? err.message : "Impossible de charger les parcelles."
      );
    } finally {
      setParcelsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetchFarms();
    refetchParcels();
  }, [refetchFarms, refetchParcels]);

  // Sélectionne automatiquement la première ferme dès qu'elle est connue,
  // pour que l'écran ne reste pas vide sans raison visible. Ne se déclenche
  // qu'une fois (tant qu'aucune ferme n'est encore sélectionnée).
  useEffect(() => {
    if (selectedFarmId === null && farms.length > 0) {
      setSelectedFarmId(farms[0].id);
    }
  }, [farms, selectedFarmId]);

  const parcelsForSelectedFarm = useMemo<DashboardParcel[]>(() => {
    if (selectedFarmId === null) return [];
    return parcels.filter((p) => p.farm_id === selectedFarmId);
  }, [parcels, selectedFarmId]);

  const selectedFarm = useMemo<Farm | null>(
    () => farms.find((f) => f.id === selectedFarmId) ?? null,
    [farms, selectedFarmId]
  );

  const selectedParcel = useMemo<DashboardParcel | null>(
    () => parcels.find((p) => p.id === selectedParcelId) ?? null,
    [parcels, selectedParcelId]
  );

  const selectFarm = useCallback((farmId: number | null) => {
    setSelectedFarmId(farmId);
    // Changer de ferme invalide toute sélection de parcelle précédente :
    // une parcelle d'une autre ferme n'a plus de sens à rester "sélectionnée".
    setSelectedParcelId(null);
  }, []);

  const selectParcel = useCallback((parcelId: number | null) => {
    setSelectedParcelId(parcelId);
  }, []);

  // ------------------------------------------------------------------
  // CRUD ferme
  // ------------------------------------------------------------------

  const createFarm = useCallback(
    async (payload: FarmPayload): Promise<Farm> => {
      const farm = await farmService.create(payload);
      await refetchFarms();
      return farm;
    },
    [refetchFarms]
  );

  const updateFarm = useCallback(
    async (id: number, payload: Partial<FarmPayload>): Promise<Farm> => {
      const farm = await farmService.update(id, payload);
      await refetchFarms();
      return farm;
    },
    [refetchFarms]
  );

  const removeFarm = useCallback(
    async (id: number): Promise<void> => {
      await farmService.remove(id);
      if (selectedFarmId === id) {
        setSelectedFarmId(null);
        setSelectedParcelId(null);
      }
      await refetchFarms();
      // La suppression d'une ferme supprime ses parcelles en cascade
      // côté base (ondelete="CASCADE") : la liste des parcelles doit
      // être rafraîchie aussi.
      await refetchParcels();
    },
    [refetchFarms, refetchParcels, selectedFarmId]
  );

  // ------------------------------------------------------------------
  // CRUD parcelle
  // ------------------------------------------------------------------

  const createParcel = useCallback(
    async (payload: ParcelCreatePayload): Promise<void> => {
      await parcelService.create(payload);
      await refetchParcels();
    },
    [refetchParcels]
  );

  const updateParcel = useCallback(
    async (id: number, payload: ParcelUpdatePayload): Promise<void> => {
      await parcelService.update(id, payload);
      await refetchParcels();
    },
    [refetchParcels]
  );

  const removeParcel = useCallback(
    async (id: number): Promise<void> => {
      await parcelService.remove(id);
      if (selectedParcelId === id) {
        setSelectedParcelId(null);
      }
      await refetchParcels();
    },
    [refetchParcels, selectedParcelId]
  );

  return {
    farms,
    parcels,
    parcelsForSelectedFarm,
    selectedFarm,
    selectedParcel,
    selectedFarmId,
    selectedParcelId,
    selectFarm,
    selectParcel,
    farmsLoading,
    parcelsLoading,
    farmsError,
    parcelsError,
    refetchFarms,
    refetchParcels,
    createFarm,
    updateFarm,
    removeFarm,
    createParcel,
    updateParcel,
    removeParcel,
  };
}