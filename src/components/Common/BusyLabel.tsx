import type { ReactNode } from "react";

/**
 * Contenu d'un bouton pendant une opération : le petit cercle qui tourne,
 * puis le texte d'attente (« Enregistrement… »). Sans `text`, le cercle
 * seul (petits boutons d'icône). Hors opération, le contenu habituel.
 * Le bouton garde sa couleur ; la souris devient « en cours » (index.css).
 */
export default function BusyLabel({ busy, text, children }: { busy: boolean; text?: string; children?: ReactNode }) {
  if (!busy) return <>{children}</>;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
      <span className="awam-spinner" aria-hidden />
      {text && <span>{text}</span>}
    </span>
  );
}