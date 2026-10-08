import type { StageTimelineItem } from "../../types/diagnosis";

/**
 * Frise des stades de l'espèce, du premier au dernier du cycle.
 * Le stade courant est mis en avant ; les périodes de coupe ou récolte
 * sont signalées, car les baisses d'indices y sont normales.
 */
export default function StageTimeline({ stages }: { stages: StageTimelineItem[] }) {
  if (stages.length === 0) return null;

  const currentIndex = stages.findIndex((s) => s.is_current);

  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        overflowX: "auto",
        paddingBottom: 6,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {stages.map((stage, i) => {
        const passed = currentIndex >= 0 && i < currentIndex;
        const current = stage.is_current;

        return (
          <div
            key={`${stage.stage}-${i}`}
            style={{
              flex: "1 0 auto",
              minWidth: 96,
              padding: "7px 9px",
              borderRadius: 7,
              border: `1px solid ${current ? "#1b4332" : "#e5e7eb"}`,
              background: current ? "#1b4332" : passed ? "#f1f5f3" : "#ffffff",
              color: current ? "#ffffff" : passed ? "#6b7280" : "#374151",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.25 }}>
              {stage.label}
            </div>
            <div style={{ fontSize: 10, opacity: current ? 0.85 : 0.65, marginTop: 2 }}>
              {stage.period}
            </div>
            {stage.cultural_drop && (
              <div style={{ fontSize: 9, marginTop: 3, opacity: current ? 0.85 : 0.6 }}>
                ✂ coupe / récolte
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}