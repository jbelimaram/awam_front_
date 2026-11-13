import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { alertService } from "../../Services/alertService";
import { subscribeParcelEvents } from "../../hooks/useParcelEvents";
import type { Alert } from "../../types/alert";
import { alertLevelStyle } from "../../utils/alertLevels";

/** « aujourd'hui », « hier », « il y a 3 j » */
function sinceLabel(iso?: string | null): string {
  if (!iso) return "";
  const start = new Date(`${iso.slice(0, 10)}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((today.getTime() - start.getTime()) / 86_400_000);
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return "hier";
  return `il y a ${days} j`;
}

/**
 * Cloche des alertes, dans la barre du haut.
 *
 * Le panneau montre l'ESSENTIEL de chaque alerte, en deux lignes : la cause,
 * puis la culture, la parcelle et la ferme ; à droite, depuis quand et le
 * niveau. Un clic sur une alerte ouvre la page Alertes, sur cette alerte :
 * c'est là qu'on voit le détail et qu'on agit (planifier, clôturer). En bas,
 * « Voir toutes les alertes » ouvre la page.
 *
 * Chaque niveau a sa couleur, son symbole ET son mot : la couleur seule ne
 * suffit pas (daltonisme, écran au soleil sur le terrain). Le panneau se met
 * à jour en temps réel (événement « alerts » envoyé par le back).
 */
/** Les alertes de la plus récente à la plus ancienne, par date d'ouverture */
const newestFirst = (list: Alert[]) => [...list].sort((a, b) => b.created_at.localeCompare(a.created_at));
export default function AlertsBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(() => {
    alertService.count().then((r) => setCount(r.open)).catch(() => {});
    if (open) alertService.list("open").then((l) => setAlerts(newestFirst(l))).catch(() => setAlerts([]));
  }, [open]);

  // Chargement, puis mise à jour en temps réel
  useEffect(() => {
    refresh();
    return subscribeParcelEvents((event) => {
      if (event.kind === "alerts") refresh();
    });
  }, [refresh]);

  // Fermeture au clic en dehors du panneau
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  /** Vers la page Alertes, sur l'alerte choisie (ou sur toutes) */
  const goTo = (alertId?: number) => {
    setOpen(false);
    navigate("/alertes", { state: alertId ? { alertId } : null });
  };

  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) alertService.list("open").then((l) => setAlerts(newestFirst(l))).catch(() => setAlerts([]));
        }}
        title={count ? `${count} alerte${count > 1 ? "s" : ""} en cours` : "Aucune alerte en cours"}
        aria-label={`Alertes : ${count} en cours`}
        style={{ position: "relative", background: "transparent", border: "none", fontSize: 17, cursor: "pointer", padding: 4 }}
      >
        🔔
        {count > 0 && (
          <span
            style={{
              position: "absolute", top: -2, right: -4, minWidth: 16, height: 16, padding: "0 4px", borderRadius: 8,
              background: "#dc2626", color: "#fff", fontSize: 10, fontWeight: 700, lineHeight: "16px", textAlign: "center",
            }}
          >
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Alertes"
          style={{
            position: "absolute", right: 0, top: 38, width: 380, maxWidth: "92vw", maxHeight: "70vh",
            display: "flex", flexDirection: "column", background: "#fff", border: "1px solid #e5e7eb",
            borderRadius: 12, boxShadow: "0 12px 32px rgba(0,0,0,0.12)", zIndex: 1000,
            fontFamily: "system-ui, sans-serif", overflow: "hidden",
          }}
        >
          {/* En-tête */}
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #f3f4f6" }}>
            <strong style={{ fontSize: 15, color: "#111827" }}>Alertes</strong>
            <span style={{ fontSize: 12, color: "#6b7280" }}>
              {count} active{count > 1 ? "s" : ""}
            </span>
          </div>

          {/* Liste */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {alerts === null && <p style={{ padding: 16, margin: 0, fontSize: 13, color: "#9ca3af" }}>Chargement…</p>}
            {alerts !== null && alerts.length === 0 && (
              <p style={{ padding: "20px 16px", margin: 0, fontSize: 13, color: "#15803d", textAlign: "center" }}>✓ Aucune alerte en cours.</p>
            )}

            {alerts?.map((a) => {
              const lv = alertLevelStyle(a.severity);
              return (
                <div key={a.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <button
                    type="button"
                    onClick={() => goTo(a.id)}
                    style={{
                      display: "flex", gap: 10, width: "100%", alignItems: "flex-start", textAlign: "left",
                      background: "transparent", border: "none", padding: "12px 16px", cursor: "pointer",
                    }}
                  >
                    {/* Niveau : couleur ET symbole */}
                    <span
                      aria-hidden
                      style={{
                        width: 30, height: 30, flexShrink: 0, borderRadius: "50%", background: lv.bg, color: lv.color,
                        display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700,
                      }}
                    >
                      {lv.symbol}
                    </span>

                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {a.cause ?? a.severity_label}
                      </span>
                      <span style={{ display: "block", fontSize: 12, color: "#6b7280", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {a.crop_label ?? "Culture"} · {a.parcel_name} · {a.farm_name}
                      </span>
                    </span>

                    <span style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                      <span style={{ fontSize: 11, color: "#9ca3af" }}>{sinceLabel(a.first_scene_date ?? a.last_scene_date ?? a.created_at)}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: lv.color, background: lv.bg, borderRadius: 999, padding: "1px 8px" }}>
                        {a.severity_label}
                      </span>
                    </span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Vers la page Alertes */}
          <button
            type="button"
            onClick={() => goTo()}
            style={{
              border: "none", borderTop: "1px solid #f3f4f6", background: "#EAF3DE", color: "#27500A",
              padding: "10px 16px", fontSize: 12.5, fontWeight: 600, textAlign: "left", cursor: "pointer",
            }}
          >
            Voir toutes les alertes →
          </button>
        </div>
      )}
    </div>
  );
}