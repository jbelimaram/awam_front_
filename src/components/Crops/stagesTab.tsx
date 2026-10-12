import { useState } from "react";
import StageTimeline from "./stageTimeline";
import IndicatorRow from "./IndicatorRow";
import type { Diagnosis, Severity, StageTimelineItem } from "../../types/diagnosis";
import type { CropObservation } from "../../types/crop";

/** Couleur du bloc d'interprétation selon la gravité. */
const READING_COLOR: Record<Severity, string> = {
  normal: "#15803d",
  watch: "#92400e",
  alert: "#991b1b",
  strong_alert: "#7f1d1d",
};
const READING_BG: Record<Severity, string> = {
  normal: "#f0fdf4",
  watch: "#fffbeb",
  alert: "#fef2f2",
  strong_alert: "#fef2f2",
};

/** Âge lisible à partir du nombre de jours : « 8 mois », « 2 ans ». */
function formatAge(days: number): string {
  if (days < 365) {
    const months = Math.max(1, Math.round(days / 30));
    return `${months} mois`;
  }
  const years = Math.floor(days / 365);
  return `${years} an${years > 1 ? "s" : ""}`;
}

/** Bloc d'interprétation : un titre court et une phrase claire. */
function InterpretationBlock({
  title,
  text,
  color,
  bg,
  prefix = "",
}: {
  title: string;
  text?: string | null;
  color: string;
  bg: string;
  prefix?: string;
}) {
  if (!text) return null;
  return (
    <div
      style={{
        background: bg,
        borderLeft: `3px solid ${color}`,
        borderRadius: 6,
        padding: "8px 11px",
        marginBottom: 7,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          marginBottom: 3,
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: 13, color: "#1f2937", lineHeight: 1.45 }}>
        {prefix}
        {text}
      </div>
    </div>
  );
}

interface StagesTabProps {
  diagnosis: Diagnosis | null;
  stages: StageTimelineItem[];
  observations: CropObservation[];
  onAddObservation: (content: string) => Promise<void>;
  onDeleteObservation: (id: number) => Promise<void>;
}

/**
 * Onglet Stades : frise du cycle, indices suivis au stade courant avec
 * leur verdict, risques identifiés, et observations de terrain.
 */
export default function StagesTab({
  diagnosis,
  stages = [],
  observations = [],
  onAddObservation,
  onDeleteObservation,
}: StagesTabProps) {
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!draft.trim() || saving) return;
    setSaving(true);
    try {
      await onAddObservation(draft.trim());
      setDraft("");
    } finally {
      setSaving(false);
    }
  };

  const indicators = diagnosis?.indicators ?? [];
  const risks = diagnosis?.risks ?? [];
  const days = diagnosis?.stage?.days_since_planting ?? null;

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }} translate="no">
      <StageTimeline stages={stages} />

      {diagnosis?.stage && (
        <>
          {/* ---- En-tête du stade : nom, période, âge ---- */}
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 10,
              margin: "14px 0 8px",
              flexWrap: "wrap",
            }}
          >
            <strong style={{ fontSize: 14, color: "#111827" }}>
              {diagnosis.stage.label}
            </strong>
            {diagnosis.stage.period ? (
              <span style={{ fontSize: 11, color: "#6b7280" }}>
                {diagnosis.stage.period}
              </span>
            ) : null}
            <span style={{ fontSize: 11, color: "#6b7280", marginLeft: "auto" }}>
              {days != null
                ? `${formatAge(days)} depuis la plantation`
                : "Date de plantation non renseignée"}
            </span>
          </div>

          {/* ---- Date de plantation manquante ---- */}
          {days == null && (
            <div
              style={{
                background: "#fffbeb",
                border: "1px solid #fcd34d",
                borderRadius: 7,
                padding: "8px 11px",
                fontSize: 12,
                color: "#92400e",
                marginBottom: 10,
                lineHeight: 1.45,
              }}
            >
              Les seuils de ce stade dépendent de l'âge des arbres. Sans date de
              plantation, la tranche la plus large est appliquée. Renseignez-la
              dans l'onglet Fiche pour un diagnostic précis.
            </div>
          )}

          {/* ---- Coupe ou récolte en cours ---- */}
          {diagnosis.cultural_drop && (
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #cbd5e1",
                borderRadius: 7,
                padding: "8px 11px",
                fontSize: 12,
                color: "#475569",
                marginBottom: 10,
                lineHeight: 1.45,
              }}
            >
              Une opération culturale (coupe ou récolte) explique la baisse des
              indices à ce stade. Aucune alerte n'est levée.
            </div>
          )}

          {indicators.length === 0 ? (
            <p style={{ fontSize: 13, color: "#6b7280" }}>
              Aucune mesure satellite disponible pour cette parcelle.
            </p>
          ) : (
            <>
              {/* ---- Indices du stade ---- */}
              <div style={{ borderTop: "1px solid #e5e7eb" }}>
                {indicators.map((indicator) => (
                  <IndicatorRow key={indicator.name} indicator={indicator} />
                ))}
              </div>

              {/* ---- Légende des couleurs ---- */}
              <div
                style={{
                  display: "flex",
                  gap: 14,
                  fontSize: 11,
                  color: "#6b7280",
                  margin: "7px 0 12px",
                  flexWrap: "wrap",
                }}
              >
                <span>
                  <span style={{ color: "#b42318" }}>●</span>
                  <span> Faible : à vérifier</span>
                </span>
                <span>
                  <span style={{ color: "#15803d" }}>●</span>
                  <span> Normal</span>
                </span>
                <span>
                  <span style={{ color: "#1d4ed8" }}>●</span>
                  <span> Excellent</span>
                </span>
              </div>

              {/* ---- Lecture globale des mesures ---- */}
              <InterpretationBlock
                title="Ce que montrent les mesures"
                text={diagnosis.reading}
                color={READING_COLOR[diagnosis.severity] ?? "#475569"}
                bg={READING_BG[diagnosis.severity] ?? "#f8fafc"}
              />

              {/* ---- Risques identifiés ---- */}
              {risks.map((risk, i) => (
                <div
                  key={`${risk.severity}-${i}`}
                  style={{ marginBottom: 10 }}
                >
                  <InterpretationBlock
                    title="Risque identifié"
                    text={risk.diagnosis}
                    color={READING_COLOR[risk.severity] ?? "#475569"}
                    bg={READING_BG[risk.severity] ?? "#f8fafc"}
                  />
                  <InterpretationBlock
                    title="À vérifier sur le terrain"
                    text={risk.measure}
                    color="#475569"
                    bg="#f8fafc"
                  />
                  <InterpretationBlock
                    title="Ce qu'il faut faire"
                    text={risk.action}
                    color="#1b4332"
                    bg="#f0fdf4"
                    prefix="→ "
                  />
                </div>
              ))}
            </>
          )}
        </>
      )}

      {/* ---- Observations de terrain ---- */}
      <div
        style={{
          marginTop: 16,
          borderTop: "1px solid #e5e7eb",
          paddingTop: 10,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "#6b7280",
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 7,
          }}
        >
          Observations de terrain
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submit();
            }}
            disabled={saving}
            placeholder="Ce que vous constatez sur place…"
            style={{
              flex: 1,
              padding: "7px 10px",
              borderRadius: 6,
              border: "1px solid #d1d5db",
              fontSize: 13,
              fontFamily: "inherit",
            }}
          />
          <button
            type="button"
            onClick={() => void submit()}
            disabled={saving || !draft.trim()}
            style={{
              padding: "7px 14px",
              borderRadius: 6,
              border: "none",
              background: "#1b4332",
              color: "#ffffff",
              fontSize: 12,
              fontWeight: 600,
              cursor: saving || !draft.trim() ? "not-allowed" : "pointer",
              opacity: saving || !draft.trim() ? 0.5 : 1,
            }}
          >
            Ajouter
          </button>
        </div>

        {observations.length === 0 && (
          <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>
            Aucune observation enregistrée.
          </p>
        )}

        {observations.map((o) => (
          <div
            key={o.id}
            style={{
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              fontSize: 12,
              color: "#374151",
              padding: "5px 0",
              borderBottom: "1px solid #f1f3f5",
            }}
          >
            <span style={{ color: "#6b7280", flexShrink: 0, minWidth: 48 }}>
              {new Date(o.observed_at).toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "2-digit",
              })}
            </span>
            <span style={{ flex: 1 }}>
              {o.content}
              {o.stage_label ? (
                <span style={{ color: "#9ca3af" }}> · {o.stage_label}</span>
              ) : null}
            </span>
            <button
              type="button"
              onClick={() => void onDeleteObservation(o.id)}
              title="Supprimer"
              aria-label="Supprimer cette observation"
              style={{
                background: "none",
                border: "none",
                color: "#b42318",
                cursor: "pointer",
                padding: 0,
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}