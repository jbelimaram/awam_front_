/**
 * Alerte : un ÉPISODE d'anomalie sur une culture, détecté par le diagnostic
 * satellite (app/services/alert_service.py côté back).
 *
 *   alert        → « Anomalie détectée » : signal anormal confirmé sur deux images
 *   strong_alert → « Anomalie persistante » : perte de vigueur confirmée sur deux images
 */
export type AlertSeverity = "alert" | "strong_alert";

/** Raison de fermeture */
export type AlertResolution = "treated" | "false_alarm" | "auto";

export interface AlertHistoryItem {
  scene_date: string;
  /** Niveau du diagnostic de cette image : normal, watch, alert, strong_alert */
  severity: string;
  label: string;
}

export interface Alert {
  id: number;
  parcel_id: number;
  alert_type: string;
  severity: AlertSeverity;
  severity_label: string;
  message: string;
  resolved: boolean;
  created_at: string;
  crop_id?: number | null;
  crop_label?: string | null;
  parcel_name?: string | null;
  farm_id?: number | null;
  farm_name?: string | null;
  /** Cause probable, ce qui l'indique, ce qu'il faut faire */
  cause?: string | null;
  evidence?: string | null;
  action?: string | null;
  /** Part de la parcelle observée sur la dernière image (0 à 1) */
  valid_ratio?: number | null;
  first_scene_date?: string | null;
  last_scene_date?: string | null;
  resolution?: AlertResolution | null;
  resolution_label?: string | null;
  resolved_at?: string | null;
  /** Dernière création, mise à jour ou fermeture */
  updated_at?: string | null;
  /** Niveau de chaque image de l'épisode */
  history: AlertHistoryItem[];
}