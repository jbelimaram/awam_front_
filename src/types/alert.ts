/**
 * Alerte d'une culture. Deux types (alert_type) :
 *
 *   « diagnostic_satellite » : un épisode d'anomalie détecté par le diagnostic
 *   satellite (app/services/alert_service.py côté back) ;
 *     alert        → « Anomalie détectée » : signal anormal confirmé sur deux images
 *     strong_alert → « Anomalie persistante » : perte de vigueur confirmée sur deux images
 *
 *   « besoin_eau » : le besoin en eau des 7 derniers jours n'est pas couvert
 *   (app/services/water_alert_service.py), vérifié chaque matin ;
 *     besoin_non_couvert → « Besoin non couvert »
 */
export type AlertSeverity = "alert" | "strong_alert" | "besoin_non_couvert" | "anomalie_vegetation";

/** Types d'alertes */
export const ALERT_TYPE_SATELLITE = "diagnostic_satellite";
export const ALERT_TYPE_WATER = "besoin_eau";
export const ALERT_TYPE_VEGETATION = "anomalie_vegetation";

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


/** La page Alertes : alertes actives, clôturées sur 30 jours, et compteurs */
export interface AlertsOverview {
  active: Alert[];
  closed: Alert[];
  /** Nombre de jours des alertes clôturées affichées */
  closed_days: number;
  active_count: number;
  closed_count: number;
  /** Cultures qui ont au moins une alerte active */
  crops_concerned: number;
}