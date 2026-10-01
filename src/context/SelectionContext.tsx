import { createContext, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { farmService } from "../Services/farmService";
import { dashboardService } from "../Services/dashboardService";
import type { Farm } from "../types/farm";
import type { DashboardParcel } from "../types/dashboard";

export interface SelectionContextType {
  farms: Farm[];
  parcels: DashboardParcel[];
  selectedFarmId: number | null;
  selectedParcelId: number | null;
  selectedParcel: DashboardParcel | null;
  parcelsForSelectedFarm: DashboardParcel[];
  loadingFarms: boolean;
  loadingParcels: boolean;
  selectFarm: (farmId: number | null) => void;
  selectParcel: (parcelId: number | null) => void;
  refreshFarms: (selectNewestId?: number) => Promise<void>;
  refreshParcels: (selectNewestId?: number) => Promise<void>;
}

export const SelectionContext = createContext<SelectionContextType | undefined>(undefined);

interface SelectionProviderProps {
  children: ReactNode;
}

export function SelectionProvider({ children }: SelectionProviderProps) {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [parcels, setParcels] = useState<DashboardParcel[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<number | null>(null);
  const [selectedParcelId, setSelectedParcelId] = useState<number | null>(null);
  const [loadingFarms, setLoadingFarms] = useState(false);
  const [loadingParcels, setLoadingParcels] = useState(false);

  const refreshFarms = useCallback(async (selectNewestId?: number) => {
    setLoadingFarms(true);
    try {
      const data = await farmService.list();
      setFarms(data);
      if (selectNewestId) {
        setSelectedFarmId(selectNewestId);
      } else {
        setSelectedFarmId((prev) => (prev !== null && data.some((f) => f.id === prev) ? prev : data[0]?.id ?? null));
      }
    } catch (e) {
      console.error("Erreur chargement fermes", e);
    } finally {
      setLoadingFarms(false);
    }
  }, []);

  const refreshParcels = useCallback(async (selectNewestId?: number) => {
    setLoadingParcels(true);
    try {
      const data = await dashboardService.parcels();
      setParcels(data.parcelles);
      if (selectNewestId) {
        setSelectedParcelId(selectNewestId);
      } else {
        setSelectedParcelId((prev) =>
          prev !== null && data.parcelles.some((p) => p.id === prev) ? prev : null
        );
      }
    } catch (e) {
      console.error("Erreur chargement parcelles", e);
    } finally {
      setLoadingParcels(false);
    }
  }, []);

  useEffect(() => {
    refreshFarms();
    refreshParcels();
  }, [refreshFarms, refreshParcels]);

  const parcelsForSelectedFarm = useMemo(
    () => parcels.filter((p) => p.farm_id === selectedFarmId),
    [parcels, selectedFarmId]
  );

  // Sélectionne automatiquement la première parcelle de la ferme active
  // quand aucune parcelle de cette ferme n'est déjà sélectionnée.
  useEffect(() => {
    if (selectedParcelId !== null && parcelsForSelectedFarm.some((p) => p.id === selectedParcelId)) {
      return;
    }
    setSelectedParcelId(parcelsForSelectedFarm[0]?.id ?? null);
  }, [parcelsForSelectedFarm, selectedParcelId]);

  const selectedParcel = useMemo(
    () => parcels.find((p) => p.id === selectedParcelId) ?? null,
    [parcels, selectedParcelId]
  );

  const value: SelectionContextType = {
    farms,
    parcels,
    selectedFarmId,
    selectedParcelId,
    selectedParcel,
    parcelsForSelectedFarm,
    loadingFarms,
    loadingParcels,
    selectFarm: setSelectedFarmId,
    selectParcel: setSelectedParcelId,
    refreshFarms,
    refreshParcels,
  };

  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}