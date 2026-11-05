import { createContext } from "react";

/** Ce que demande une confirmation */
export interface ConfirmOptions {
  /** La question, ex. « Supprimer la parcelle « P2 » ? » */
  title: string;
  /** Une ou plusieurs phrases d'explication, chacune son paragraphe */
  message?: string | string[];
  /** Le bouton qui confirme, ex. « Supprimer » (par défaut) */
  confirmLabel?: string;
  /** Le bouton qui renonce (par défaut : « Annuler ») */
  cancelLabel?: string;
  /** « danger » : action définitive, bouton rouge (par défaut) ; « neutral » : bouton vert */
  tone?: "danger" | "neutral";
}

export type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

export const ConfirmContext = createContext<ConfirmFn | undefined>(undefined);