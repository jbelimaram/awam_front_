import { useCallback, useEffect, useState } from "react";
import { cropService } from "../../Services/cropService";
import { employeeService } from "../../Services/employeeService";
import { irrigationService } from "../../Services/irrigationService";
import { useToast } from "../../hooks/useToast";
import type { Crop } from "../../types/crop";
import type { Employee } from "../../types/employee";
import type { Equipment, Watering } from "../../types/irrigation";
import { isoDay, shortDay } from "../Planning/planningUtils";
import WateringFormModal, { type WateringMode } from "./WateringFormModal";
import { KIND_META, fmt } from "./equipmentDisplay";
import { useConfirm } from "../../hooks/useConfirm";

/** Nombre de jours d'arrosages faits affichés */
const DONE_DAYS = 60;

const chip = (background: string, color: string): React.CSSProperties => ({
  fontSize: 11.5, borderRadius: 999, padding: "2px 9px", background, color, whiteSpace: "nowrap",
});
const iconButton: React.CSSProperties = { border: "none", background: "transparent", cursor: "pointer", fontSize: 13 };

/** « 20 arrosoirs », « 07:00 → 07:45 · 45 min », « compteur », « estimé » */
function howMeasured(w: Watering): string | null {
  if (w.method === "arrosoirs" && w.can_count) return `${w.can_count} arrosoir${w.can_count > 1 ? "s" : ""}`;
  if (w.method === "duree" && w.start_time && w.end_time) {
    return `${w.start_time.slice(0, 5)} → ${w.end_time.slice(0, 5)}${w.duration_min ? ` · ${fmt(w.duration_min, 0)} min` : ""}`;
  }
  if (w.method === "duree" && w.duration_min) return `${fmt(w.duration_min, 0)} min`;
  if (w.method === "compteur") return "lu au compteur";
  if (w.method === "volume") return "estimé";
  return null;
}

/** « 810 L · 0,17 mm » */
const waterLabel = (w: Watering) =>
  w.volume_l === null ? null : `${fmt(w.volume_l, 0)} L${w.depth_mm !== null ? ` · ${fmt(w.depth_mm, 2)} mm` : ""}`;

const doneAt = (w: Watering) =>
  w.performed_at
    ? `${shortDay(isoDay(new Date(w.performed_at)))} · ${new Date(w.performed_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
    : "";

/**
 * Onglet « Arrosages » : les arrosages à faire, puis ceux faits récemment,
 * avec l'équipement, la quantité d'eau (L et mm) et les employés ;
 * nouvel arrosage, modification et « Marquer réalisé ».
 */
export default function WateringsTab({
  parcelId, parcelName, parcelAreaM2,
}: { parcelId: number; parcelName: string; parcelAreaM2: number | null }) {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [items, setItems] = useState<Watering[] | null>(null);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [modal, setModal] = useState<{ mode: WateringMode; watering: Watering | null } | null>(null);

  const load = useCallback(async () => {
    try {
      const [w, e, c, emp] = await Promise.all([
        irrigationService.listWaterings(parcelId, DONE_DAYS),
        irrigationService.listEquipment(parcelId),
        cropService.listByParcel(parcelId),
        employeeService.list(),
      ]);
      setItems(w);
      setEquipment(e);
      setCrops(c);
      setEmployees(emp);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Arrosages indisponibles.");
      setItems([]);
    }
  }, [parcelId, showToast]);

  useEffect(() => {
    setItems(null);
    load();
  }, [load]);

  const remove = async (w: Watering) => {
    const day = w.planned_for ?? (w.performed_at ? w.performed_at.slice(0, 10) : null);
    if (!(await confirm({
      title: "Supprimer cet arrosage ?",
      message: `${w.equipment_name ?? "Sans équipement"}${day ? ` · ${shortDay(day)}` : ""}. L'arrosage et son eau seront retirés de l'historique.`,
    }))) return;
    try {
      await irrigationService.removeWatering(w.id);
      showToast("success", "Arrosage supprimé.");
      load();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Suppression impossible.");
    }
  };

  const today = isoDay(new Date());
  const planned = (items ?? []).filter((w) => w.status === "a_realiser");
  const done = (items ?? []).filter((w) => w.status !== "a_realiser");

  const row = (w: Watering, isPlanned: boolean) => {
    const meta = w.equipment_kind ? KIND_META[w.equipment_kind] : null;
    const late = isPlanned && w.planned_for !== null && w.planned_for < today;
    const water = waterLabel(w);
    const how = howMeasured(w);
    return (
      <div
        key={w.id}
        style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", border: "1px solid #eef0ee", borderRadius: 10, background: "#fff" }}
      >
        <div style={{ width: 92, flexShrink: 0 }}>
          {isPlanned ? (
            <>
              <div style={{ fontSize: 13, fontWeight: 600, color: late ? "#A32D2D" : "#111827" }}>{w.planned_for ? shortDay(w.planned_for) : "—"}</div>
              <div style={{ fontSize: 11.5, color: late ? "#A32D2D" : "#3B6D11" }}>
                {late ? "en retard" : w.planned_time ? w.planned_time.slice(0, 5) : "heure libre"}
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{doneAt(w).split(" · ")[0]}</div>
              <div style={{ fontSize: 11.5, color: "#6b7280" }}>à {doneAt(w).split(" · ")[1]}</div>
            </>
          )}
        </div>
        <span
          aria-hidden
          style={{
            width: 30, height: 30, borderRadius: "50%", background: meta ? meta.tint : "#f3f4f6", flexShrink: 0,
            display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 14,
          }}
        >
          {meta ? meta.icon : "💧"}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>
            {w.equipment_name ?? "Sans équipement"}
            <span style={{ fontWeight: 400, color: "#6b7280" }}> · {w.crop_label ?? "toute la parcelle"}</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 4 }}>
            {water ? (
              <span style={chip("#E6F1FB", "#0C447C")}>{isPlanned ? `≈ ${water} prévus` : water}</span>
            ) : (
              <span style={chip("#f3f4f6", "#6b7280")}>{isPlanned ? "quantité à la réalisation" : "quantité inconnue"}</span>
            )}
            {how && <span style={chip("#f6f7f6", "#4b5563")}>{how}</span>}
            {w.employees.map((e) => (
              <span key={e.id} style={chip("#EEEDFE", "#3C3489")}>{e.full_name}</span>
            ))}
          </div>
        </div>
        {isPlanned && (
          <button
            type="button"
            onClick={() => setModal({ mode: "complete", watering: w })}
            style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #639922", background: "#EAF3DE", color: "#27500A", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
          >
            ✓ Réalisé
          </button>
        )}
        <button type="button" title="Modifier" onClick={() => setModal({ mode: "edit", watering: w })} style={{ ...iconButton, color: "#374151" }}>
          ✎
        </button>
        <button type="button" title="Supprimer" onClick={() => remove(w)} style={{ ...iconButton, color: "#b42318" }}>
          🗑
        </button>
      </div>
    );
  };

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <strong style={{ fontSize: 15, color: "#111827", marginRight: "auto" }}>Arrosages · {parcelName}</strong>
        <button
          type="button"
          onClick={() => setModal({ mode: "create", watering: null })}
          style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "#1b4332", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
        >
          ＋ Arrosage
        </button>
      </div>

      {items === null ? (
        <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>Chargement…</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <section>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
              📅 À faire <span style={{ fontWeight: 400, color: "#9ca3af" }}>· {planned.length}</span>
            </div>
            {planned.length === 0 ? (
              <p style={{ fontSize: 12.5, color: "#6b7280", margin: 0 }}>Aucun arrosage prévu.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{planned.map((w) => row(w, true))}</div>
            )}
          </section>
          <section>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
              ✓ Faits <span style={{ fontWeight: 400, color: "#9ca3af" }}>· {DONE_DAYS} derniers jours · {done.length}</span>
            </div>
            {done.length === 0 ? (
              <p style={{ fontSize: 12.5, color: "#6b7280", margin: 0 }}>Aucun arrosage fait sur cette période.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{done.map((w) => row(w, false))}</div>
            )}
          </section>
        </div>
      )}

      <WateringFormModal
        isOpen={modal !== null}
        onClose={() => setModal(null)}
        mode={modal?.mode ?? "create"}
        parcelId={parcelId}
        parcelName={parcelName}
        parcelAreaM2={parcelAreaM2}
        equipment={equipment}
        crops={crops}
        employees={employees}
        watering={modal?.watering ?? null}
        onSaved={() => {
          showToast("success", modal?.mode === "complete" ? "Arrosage réalisé." : modal?.mode === "edit" ? "Arrosage modifié." : "Arrosage enregistré.");
          load();
        }}
      />
    </div>
  );
}