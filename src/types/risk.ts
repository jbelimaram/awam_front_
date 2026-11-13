import type { Alert } from "./alert";

/** Un facteur de risque : environnemental ou pratique agricole */
export interface RiskFactor {
  key: "climate" | "rain" | "soil" | "irrigation" | "tasks" | "yield";
  label: string;
  category: "environnement" | "pratique";
  /** Sur la période de l'anomalie */
  anomaly: string | null;
  /** Depuis le début du stade */
  stage: string | null;
  /** true : signalé ; false : normal ; null : affiché seulement (pas de référence validée) */
  flagged: boolean | null;
}

/** La fiche des facteurs de risque d'une alerte */
export interface RiskFactors {
  alert_id: number;
  anomaly_period: { start: string; end: string } | null;
  stage_period: { start: string; end: string } | null;
  stages: { crop: string | null; stage: string; start: string }[];
  factors: RiskFactor[];
  /** "environnementale" | "pratique" | "les_deux" | "aucune" ; null si la période est inconnue */
  decision: "environnementale" | "pratique" | "les_deux" | "aucune" | null;
  decision_label: string | null;
}

export interface AlertRiskFactors {
  alert: Alert;
  factors: RiskFactors;
}