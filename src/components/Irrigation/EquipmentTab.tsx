import { useCallback, useEffect, useState } from "react";
import { cropService } from "../../Services/cropService";
import { irrigationService } from "../../Services/irrigationService";
import { useToast } from "../../hooks/useToast";
import type { Crop } from "../../types/crop";
import type { Equipment } from "../../types/irrigation";
import EquipmentFormModal from "./EquipmentFormModal";
import { KIND_META, SOURCE_LABELS, keyFacts } from "./equipmentDisplay";

const chip = (background: string, color: string): React.CSSProperties => ({
  fontSize: 11.5, borderRadius: 999, padding: "2px 9px", background, color, whiteSpace: "nowrap",
});

/**
 * Onglet « Équipements » : les équipements d'irrigation de la parcelle, en
 * cartes, avec leurs cultures desservies et leurs valeurs clés ; ajout,
 * modification et suppression dans une fenêtre claire.
 */
export default function EquipmentTab({ parcelId, parcelName }: { parcelId: number; parcelName: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<Equipment[] | null>(null);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [editing, setEditing] = useState<Equipment | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const [equipment, parcelCrops] = await Promise.all([
        irrigationService.listEquipment(parcelId),
        cropService.listByParcel(parcelId),
      ]);
      setItems(equipment);
      setCrops(parcelCrops);
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Équipements indisponibles.");
      setItems([]);
    }
  }, [parcelId, showToast]);

  useEffect(() => {
    setItems(null);
    load();
  }, [load]);

  const remove = async (e: Equipment) => {
    if (!window.confirm(`Supprimer « ${e.name} » ?`)) return;
    try {
      await irrigationService.removeEquipment(e.id);
      showToast("success", `${e.name} supprimé.`);
      load();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Suppression impossible.");
    }
  };

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <strong style={{ fontSize: 15, color: "#111827", marginRight: "auto" }}>Équipements · {parcelName}</strong>
        <button
          type="button"
          onClick={() => { setEditing(null); setFormOpen(true); }}
          style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "#1b4332", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
        >
          ＋ Équipement
        </button>
      </div>

      {items === null ? (
        <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>Chargement…</p>
      ) : items.length === 0 ? (
        <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
          Aucun équipement sur cette parcelle. Ajoutez un arrosoir, le tuyau du puits ou un goutte-à-goutte.
        </p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
          {items.map((e) => {
            const meta = KIND_META[e.kind];
            return (
              <div
                key={e.id}
                style={{
                  border: "1px solid #eef0ee", borderRadius: 12, padding: "12px 14px", background: "#fff",
                  opacity: e.active ? 1 : 0.6,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    aria-hidden
                    style={{
                      width: 32, height: 32, borderRadius: "50%", background: meta.tint, display: "inline-flex",
                      alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0,
                    }}
                  >
                    {meta.icon}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {e.name}
                    </span>
                    <span style={{ display: "block", fontSize: 11.5, color: "#6b7280" }}>
                      {meta.label} · {SOURCE_LABELS[e.water_source]}
                      {e.has_meter ? " · compteur" : ""} · {e.active ? "en service" : "hors service"}
                    </span>
                  </span>
                  <button
                    type="button" title="Modifier" onClick={() => { setEditing(e); setFormOpen(true); }}
                    style={{ border: "none", background: "transparent", cursor: "pointer", color: "#374151", fontSize: 13 }}
                  >
                    ✎
                  </button>
                  <button
                    type="button" title="Supprimer" onClick={() => remove(e)}
                    style={{ border: "none", background: "transparent", cursor: "pointer", color: "#b42318", fontSize: 13 }}
                  >
                    🗑
                  </button>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 9 }}>
                  {e.crops.map((c) => (
                    <span key={c.id} style={chip("#EAF3DE", "#27500A")}>{c.label}</span>
                  ))}
                  {e.crops.length === 0 && <span style={chip("#f3f4f6", "#6b7280")}>Aucune culture desservie</span>}
                  {keyFacts(e).map((f) => (
                    <span key={f} style={chip(meta.tint, meta.text)}>{f}</span>
                  ))}
                </div>
                {e.notes && <p style={{ fontSize: 12, color: "#6b7280", margin: "8px 0 0" }}>{e.notes}</p>}
              </div>
            );
          })}
        </div>
      )}

      <EquipmentFormModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        parcelId={parcelId}
        parcelName={parcelName}
        crops={crops}
        equipment={editing}
        onSaved={(saved) => {
          showToast("success", editing ? `${saved.name} modifié.` : `${saved.name} ajouté.`);
          load();
        }}
      />
    </div>
  );
}