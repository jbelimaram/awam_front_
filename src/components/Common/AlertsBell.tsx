import { useCallback, useEffect, useRef, useState } from "react";
import { alertService } from "../../Services/alertService";
import { subscribeParcelEvents } from "../../hooks/useParcelEvents";
import { useToast } from "../../hooks/useToast";
import type { Alert } from "../../types/alert";
import { ALERT_LEVEL_HELP, ALERT_LEVEL_STYLE, alertLevelStyle, formatAlertDate } from "../../utils/alertLevels";

/**
 * Cloche des alertes, dans la barre du haut.
 *
 * Affiche le nombre d'alertes ouvertes sur toutes les parcelles, et au clic
 * la liste : ferme, parcelle, plante, niveau, cause probable, ce qui
 * l'indique, action conseillée et historique date par date. Se met à jour
 * en temps réel (événement « alerts » envoyé par le back).
 *
 * Chaque niveau a sa couleur, son symbole ET son mot : la couleur seule ne
 * suffit pas (daltonisme, écran au soleil sur le terrain).
 */

export default function AlertsBell() {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(() => {
    alertService.count().then((r) => setCount(r.open)).catch(() => {});
    if (open) alertService.list("open").then(setAlerts).catch(() => setAlerts([]));
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

  const resolve = async (alert: Alert, resolution: "treated" | "false_alarm") => {
    setBusyId(alert.id);
    try {
      await alertService.resolve(alert.id, resolution);
      showToast(
        "success",
        resolution === "false_alarm"
          ? "Alerte fermée : fausse alerte. Merci, cette réponse aide à fiabiliser les alertes."
          : "Alerte fermée : problème vérifié et traité.",
      );
      setAlerts((list) => (list ? list.filter((a) => a.id !== alert.id) : list));
      setCount((n) => Math.max(n - 1, 0));
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Impossible de fermer l'alerte.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) alertService.list("open").then(setAlerts).catch(() => setAlerts([]));
        }}
        title={count ? `${count} alerte${count > 1 ? "s" : ""} en cours` : "Aucune alerte en cours"}
        aria-label={`Alertes : ${count} en cours`}
        style={{
          position: "relative",
          background: "transparent",
          border: "none",
          fontSize: 17,
          cursor: "pointer",
          padding: 4,
        }}
      >
        🔔
        {count > 0 && (
          <span
            style={{
              position: "absolute",
              top: -2,
              right: -4,
              minWidth: 16,
              height: 16,
              padding: "0 4px",
              borderRadius: 8,
              background: "#dc2626",
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              lineHeight: "16px",
              textAlign: "center",
            }}
          >
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Alertes en cours"
          style={{
            position: "absolute",
            right: 0,
            top: 36,
            width: 400,
            maxWidth: "90vw",
            maxHeight: "70vh",
            overflowY: "auto",
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
            zIndex: 1000,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div style={{ padding: "12px 14px", borderBottom: "1px solid #f3f4f6", fontWeight: 600, fontSize: 14 }}>
            Alertes en cours
          </div>

          {alerts === null && <p style={{ padding: 14, margin: 0, fontSize: 13, color: "#6b7280" }}>Chargement…</p>}
          {alerts !== null && alerts.length === 0 && (
            <p style={{ padding: 14, margin: 0, fontSize: 13, color: "#15803d" }}>✓ Aucune alerte en cours.</p>
          )}

          {alerts?.map((a) => {
            const lv = alertLevelStyle(a.severity);
            return (
              <div key={a.id} style={{ padding: "12px 14px", borderBottom: "1px solid #f3f4f6" }}>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "2px 8px",
                    borderRadius: 6,
                    background: lv.bg,
                    color: lv.color,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  <span aria-hidden>{lv.symbol}</span>
                  {a.severity_label}
                </div>

                <div style={{ marginTop: 6, fontSize: 13, fontWeight: 600, color: "#111827" }}>
                  {a.crop_label ?? "Culture"} · {a.parcel_name}
                  <span style={{ fontWeight: 400, color: "#6b7280" }}> · {a.farm_name}</span>
                </div>

                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#6b7280" }}>{ALERT_LEVEL_HELP[a.severity]}</p>

                <dl style={{ margin: "8px 0 0", fontSize: 12, display: "grid", gridTemplateColumns: "auto 1fr", gap: "3px 8px" }}>
                  <dt style={{ color: "#6b7280" }}>Cause probable</dt>
                  <dd style={{ margin: 0, color: "#111827" }}>{a.cause ?? "—"}</dd>
                  {a.evidence && (
                    <>
                      <dt style={{ color: "#6b7280" }}>Ce qui l'indique</dt>
                      <dd style={{ margin: 0, color: "#111827" }}>{a.evidence}</dd>
                    </>
                  )}
                  {a.action && (
                    <>
                      <dt style={{ color: "#6b7280" }}>À faire</dt>
                      <dd style={{ margin: 0, color: "#111827" }}>{a.action}</dd>
                    </>
                  )}
                </dl>

                {a.history.length > 0 && (
                  <div style={{ marginTop: 8, fontSize: 12 }}>
                    <div style={{ color: "#6b7280", marginBottom: 2 }}>Historique</div>
                    {a.history.map((h) => {
                      const hl = ALERT_LEVEL_STYLE[h.severity] ?? ALERT_LEVEL_STYLE.normal;
                      return (
                        <div key={h.scene_date} style={{ display: "flex", gap: 8 }}>
                          <span style={{ color: "#6b7280", minWidth: 78 }}>{formatAlertDate(h.scene_date)}</span>
                          <span style={{ color: hl.color, fontWeight: 600 }}>
                            <span aria-hidden>{hl.symbol}</span> {h.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <p style={{ margin: "8px 0 0", fontSize: 11, color: "#9ca3af" }}>
                  Indication satellite, à confirmer sur place. Image du {formatAlertDate(a.last_scene_date)}
                  {a.valid_ratio != null && `, parcelle observée à ${Math.round(a.valid_ratio * 100)} %`}.
                </p>

                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <button
                    type="button"
                    disabled={busyId === a.id}
                    onClick={() => resolve(a, "treated")}
                    style={{ flex: 1, padding: "6px 8px", fontSize: 12, borderRadius: 6, border: "1px solid #15803d", background: "#15803d", color: "#fff", cursor: "pointer" }}
                  >
                    Problème vérifié et traité
                  </button>
                  <button
                    type="button"
                    disabled={busyId === a.id}
                    onClick={() => resolve(a, "false_alarm")}
                    style={{ flex: 1, padding: "6px 8px", fontSize: 12, borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", color: "#374151", cursor: "pointer" }}
                  >
                    Fausse alerte
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}