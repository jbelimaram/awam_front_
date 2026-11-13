import type { RiskFactor, RiskFactors } from "../../types/risk";

const day = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("fr-FR");

/** Couleurs de la décision */
const DECISION: Record<string, { bg: string; border: string; text: string }> = {
  environnementale: { bg: "#E6F1FB", border: "#B5D4F4", text: "#0C447C" },
  pratique: { bg: "#FAEEDA", border: "#FAC775", text: "#633806" },
  les_deux: { bg: "#FCEBEB", border: "#F7C1C1", text: "#791F1F" },
  aucune: { bg: "#f3f4f6", border: "#e5e7eb", text: "#374151" },
};

const th: React.CSSProperties = {
  textAlign: "left", fontWeight: 600, color: "#27500A", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.03em",
  padding: "7px 10px", background: "#EAF3DE", borderBottom: "1px solid #C0DD97",
};
const td: React.CSSProperties = { padding: "7px 10px", borderBottom: "1px solid #eef0ee", fontSize: 12.5, color: "#111827", verticalAlign: "top" };

function State({ f }: { f: RiskFactor }) {
  const s =
    f.flagged === true
      ? { label: "Signalé", bg: "#FCEBEB", color: "#791F1F" }
      : f.flagged === false
        ? { label: "Normal", bg: "#EAF3DE", color: "#27500A" }
        : { label: "Affiché", bg: "#f3f4f6", color: "#6b7280" };
  return (
    <span style={{ display: "inline-block", fontSize: 11, fontWeight: 600, borderRadius: 999, padding: "2px 8px", background: s.bg, color: s.color, whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
}

/**
 * La fiche des facteurs de risque d'une alerte : la décision (origine
 * probable), puis tous les facteurs, environnementaux et pratiques, sur la
 * période de l'anomalie et depuis le début du stade, avec leur état.
 */
export default function RiskFactorSheet({ f }: { f: RiskFactors }) {
  if (!f.decision || !f.anomaly_period || !f.stage_period) {
    return <p style={{ fontSize: 12.5, color: "#6b7280", margin: 0 }}>{f.decision_label}</p>;
  }
  const d = DECISION[f.decision];
  const groups: [string, string, RiskFactor[]][] = [
    ["environnement", "🌍 Facteurs environnementaux", f.factors.filter((x) => x.category === "environnement")],
    ["pratique", "🧑‍🌾 Pratiques agricoles", f.factors.filter((x) => x.category === "pratique")],
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 14px", borderRadius: 10, background: d.bg, border: `1px solid ${d.border}` }}>
        <span aria-hidden style={{ fontSize: 20 }}>⚖️</span>
        <div>
          <div style={{ fontSize: 12, color: d.text }}>Origine probable</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: d.text }}>{f.decision_label}</div>
        </div>
      </div>
      {f.stages.length > 0 && (
        <div style={{ fontSize: 12, color: "#6b7280" }}>
          Stades : {f.stages.map((s) => `${s.crop ?? ""} ${s.stage.toLowerCase()} depuis le ${day(s.start)}`).join(" · ")}
        </div>
      )}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...th, width: "18%" }}>Facteur</th>
              <th style={th}>Période de l'anomalie<br /><span style={{ textTransform: "none", fontWeight: 400 }}>{day(f.anomaly_period.start)} → {day(f.anomaly_period.end)}</span></th>
              <th style={th}>Depuis le début du stade<br /><span style={{ textTransform: "none", fontWeight: 400 }}>{day(f.stage_period.start)} → {day(f.stage_period.end)}</span></th>
              <th style={{ ...th, width: "10%" }}>État</th>
            </tr>
          </thead>
          <tbody>
            {groups.map(([key, title, items]) => [
              <tr key={key}>
                <td colSpan={4} style={{ ...td, background: "#f6f7f6", fontWeight: 600, color: "#4b5563", fontSize: 12 }}>{title}</td>
              </tr>,
              ...items.map((x) => (
                <tr key={x.key}>
                  <td style={td}>{x.label}</td>
                  {x.stage === null ? (
                    <td style={td} colSpan={2}>{x.anomaly ?? "—"}</td>
                  ) : (
                    <>
                      <td style={td}>{x.anomaly ?? "—"}</td>
                      <td style={td}>{x.stage}</td>
                    </>
                  )}
                  <td style={td}><State f={x} /></td>
                </tr>
              )),
            ])}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 11.5, color: "#6b7280", margin: 0 }}>
        L'origine est identifiée à partir des facteurs anormaux présents au même moment ; elle ne prouve pas la cause. Vérifier sur le terrain.
      </p>
    </div>
  );
}