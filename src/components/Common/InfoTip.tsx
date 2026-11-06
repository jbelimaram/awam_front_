import { useId, useRef, useState, type ReactNode } from "react";

/**
 * Petite icône ⓘ qui affiche une explication au passage de la souris, ou
 * au clavier (touche Tab). Réutilisable dans toute l'app.
 */
export default function InfoTip({ text, width = 250 }: { text: ReactNode; width?: number }) {
  const [open, setOpen] = useState(false);
  // L'info-bulle s'ouvre vers la gauche si elle dépasserait à droite de l'écran
  const [toLeft, setToLeft] = useState(false);
  const anchor = useRef<HTMLSpanElement>(null);
  const id = useId();
  const show = () => {
    const rect = anchor.current?.getBoundingClientRect();
    setToLeft(!!rect && rect.left + width + 16 > window.innerWidth);
    setOpen(true);
  };
  return (
    <span
      ref={anchor}
      style={{ position: "relative", display: "inline-flex", verticalAlign: "middle" }}
      onMouseEnter={show}
      onMouseLeave={() => setOpen(false)}
    >
      <span
        tabIndex={0}
        role="button"
        aria-describedby={open ? id : undefined}
        aria-label="Explication"
        onFocus={show}
        onBlur={() => setOpen(false)}
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center", width: 15, height: 15,
          borderRadius: "50%", border: "1px solid #9ca3af", color: "#6b7280", fontSize: 10, fontWeight: 700,
          cursor: "help", fontFamily: "Georgia, serif", lineHeight: 1, outline: "none",
        }}
      >
        i
      </span>
      {open && (
        <span
          id={id}
          role="tooltip"
          style={{
            position: "absolute", top: "calc(100% + 6px)", zIndex: 50, width,
            ...(toLeft ? { right: -8 } : { left: -8 }),
            background: "#1f2937", color: "#f9fafb", borderRadius: 8, padding: "8px 10px",
            fontSize: 12, lineHeight: 1.5, fontWeight: 400, boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            whiteSpace: "normal", textAlign: "left",
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
}