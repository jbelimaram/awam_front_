import { useEffect, type ReactNode } from "react";

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  /** Petite ligne sous le titre, ex. le nom de la parcelle */
  subtitle?: string;
  children: ReactNode;
  /** Boutons du pied, toujours visibles même si le contenu défile */
  footer?: ReactNode;
  /** Largeur maximale de la fenêtre, en px */
  width?: number;
}

/** Case active : contour vert AWAM, au lieu du contour noir du navigateur */
const FOCUS_CSS = `
.awam-dialog input:focus, .awam-dialog select:focus, .awam-dialog textarea:focus {
  outline: none; border-color: #3B6D11 !important; box-shadow: 0 0 0 3px rgba(59, 109, 17, 0.15);
}
.awam-dialog .awam-field:focus-within {
  border-color: #3B6D11 !important; box-shadow: 0 0 0 3px rgba(59, 109, 17, 0.15);
}
/* Dans un cadre de champ, c'est le cadre qui porte le contour, pas la saisie */
.awam-dialog .awam-field input:focus, .awam-dialog .awam-field textarea:focus { box-shadow: none; }
`;

/**
 * Fenêtre claire d'AWAM : le style commun de toutes les fenêtres.
 *
 * Fond blanc, coins arrondis, en-tête (titre, sous-titre, croix), contenu
 * qui défile si besoin, et pied fixe avec les actions. Se ferme par la
 * croix, par Échap, ou par un clic à côté.
 */
export default function Dialog({ isOpen, onClose, title, subtitle, children, footer, width = 400 }: DialogProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 500, background: "rgba(17, 24, 39, 0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        // Centrée sur la zone de contenu (à droite de la barre latérale, sous
        // la barre du haut) ; sans le cadre commun, sur tout l'écran
        padding:
          "calc(var(--awam-content-top, 0px) + 16px) 16px 16px calc(var(--awam-content-left, 0px) + 16px)",
        boxSizing: "border-box",
      }}
    >
      <style>{FOCUS_CSS}</style>
      <div
        className="awam-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: width, maxHeight: "100%", display: "flex", flexDirection: "column",
          background: "#fff", borderRadius: 16, boxShadow: "0 20px 50px rgba(0,0,0,0.18)",
          fontFamily: "system-ui, sans-serif", overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 16px", borderBottom: "1px solid #eef0ee" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#111827" }}>{title}</div>
            {subtitle && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 1 }}>{subtitle}</div>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            style={{ border: "none", background: "transparent", fontSize: 18, lineHeight: 1, color: "#9ca3af", cursor: "pointer", padding: 2 }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: "12px 16px", overflowY: "auto", flex: 1 }}>{children}</div>

        {footer && (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "10px 16px", borderTop: "1px solid #eef0ee", background: "#fafbfa" }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}