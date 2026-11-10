import { api } from "./api";
import type {
  Equipment,
  EquipmentPayload,
  ParcelWaterBalance,
  Watering,
  WateringHistoryItem,
  WateringQuantity,
} from "../types/irrigation";

// api/routes/irrigation.py, monté sous /api
export const irrigationService = {
  // ---- Équipements ----
  /** Équipements d'une parcelle : en service d'abord */
  listEquipment: (parcelId: number): Promise<Equipment[]> =>
    api.get<Equipment[]>(`/api/parcels/${parcelId}/equipment`),

  createEquipment: (payload: EquipmentPayload & { parcel_id: number; name: string; kind: string }): Promise<Equipment> =>
    api.post<Equipment>("/api/equipment", payload),

  updateEquipment: (id: number, payload: EquipmentPayload): Promise<Equipment> =>
    api.put<Equipment>(`/api/equipment/${id}`, payload),

  removeEquipment: (id: number): Promise<void> => api.delete<void>(`/api/equipment/${id}`),

  // ---- Arrosages ----
  /** Arrosages à faire (tous), puis faits sur les N derniers jours */
  listWaterings: (parcelId: number, days = 60): Promise<Watering[]> =>
    api.get<Watering[]>(`/api/parcels/${parcelId}/waterings?days=${days}`),

  /** Planifier un arrosage, ou enregistrer un arrosage déjà fait */
  createWatering: (
    payload: WateringQuantity & {
      parcel_id: number;
      status: "a_realiser" | "realisee";
      planned_for?: string | null;
      planned_time?: string | null;
      performed_at?: string | null;
      crop_id?: number | null;
      employee_ids: number[];
    },
  ): Promise<Watering> => api.post<Watering>("/api/waterings", payload),

  updateWatering: (
    id: number,
    payload: WateringQuantity & {
      planned_for?: string | null;
      planned_time?: string | null;
      performed_at?: string | null;
      crop_id?: number | null;
      employee_ids?: number[];
    },
  ): Promise<Watering> => api.put<Watering>(`/api/waterings/${id}`, payload),

  /** « Marquer réalisé » : date réelle, employés, et quantité réelle */
  completeWatering: (id: number, payload: WateringQuantity & { performed_at: string; employee_ids: number[] }): Promise<Watering> =>
    api.post<Watering>(`/api/waterings/${id}/complete`, payload),

    /** Historique des arrosages FAITS de toute la ferme, sur les N derniers jours */
  farmHistory: (farmId: number, days = 90): Promise<WateringHistoryItem[]> =>
    api.get<WateringHistoryItem[]>(`/api/farms/${farmId}/irrigation-history?days=${days}`),


  // ---- Suivi ----
  /** Pour chaque culture en cours : bilan des 7 derniers jours et des N dernières semaines */
  waterBalance: (parcelId: number, weeks = 8): Promise<ParcelWaterBalance> =>
    api.get<ParcelWaterBalance>(`/api/parcels/${parcelId}/water-balance?weeks=${weeks}`),


  /** La suppression passe par la tâche : son eau part avec elle */
  removeWatering: (id: number): Promise<void> => api.delete<void>(`/api/activities/${id}`),
};