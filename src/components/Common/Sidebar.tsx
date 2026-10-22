import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useSelection } from "../../hooks/useSelection";
import { useToast } from "../../hooks/useToast";
import { farmService } from "../../Services/farmService";
import FarmFormModal from "../Dashboard/FarmFormModal";
import type { Farm } from "../../types/farm";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onAddFarm: () => void;
}

/**
 * Colonne de navigation : logo, « Fermes » (page principale, avec la
 * liste repliable des fermes et l'ajout), « Cultures », et déconnexion.
 *
 * Chaque ferme porte en permanence ✎ pour la modifier et 🗑 pour la
 * supprimer (après confirmation : la suppression efface aussi ses parcelles).
 */
export default function Sidebar({ collapsed, onToggle, onAddFarm }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const { farms, selectedFarmId, selectFarm, parcels, loadingFarms, refreshFarms, refreshParcels } =
    useSelection();
  const { showToast } = useToast();

  // Ferme ouverte dans le formulaire de modification
  const [editingFarm, setEditingFarm] = useState<Farm | null>(null);
  // Ferme en cours de suppression : ses boutons sont désactivés
  const [deletingFarmId, setDeletingFarmId] = useState<number | null>(null);

  /**
   * Supprime une ferme après confirmation. Le back efface aussi tout ce
   * qui en dépend : parcelles, cultures, indices, historique, images,
   * interventions et affectations d'employés.
   */
  const handleDeleteFarm = async (farm: Farm, parcelCount: number) => {
    const detail =
      parcelCount > 0
        ? `Ses ${parcelCount} parcelle${parcelCount > 1 ? "s" : ""} seront supprimée${parcelCount > 1 ? "s" : ""}, ` +
          "avec leurs cultures, leurs indices, leur historique et leurs interventions."
        : "Elle ne contient aucune parcelle.";
    if (!window.confirm(`Supprimer la ferme « ${farm.name} » ?\n\n${detail}\n\nCette action est définitive.`)) {
      return;
    }

    setDeletingFarmId(farm.id);
    try {
      await farmService.remove(farm.id);
      showToast("success", `Ferme « ${farm.name} » supprimée.`);
      // Ferme affichée supprimée : la sélection passe à une ferme restante
      if (farm.id === selectedFarmId) selectFarm(null);
      await Promise.all([refreshFarms(), refreshParcels()]);
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Suppression de la ferme impossible.");
    } finally {
      setDeletingFarmId(null);
    }
  };

  // Groupe « Fermes » déplié par défaut : la ferme sélectionnée reste visible
  const [farmsOpen, setFarmsOpen] = useState(true);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  // « Fermes » remplace l'ancienne « Page principale » : même page (/)
  const onFarmsPage = location.pathname === "/";

  /**
   * Clic sur « Fermes » :
   * - depuis une autre page, ouvre la page des fermes, liste dépliée ;
   * - sur la page des fermes, déplie ou replie la liste.
   * Barre réduite en icônes : on l'élargit d'abord, sinon les noms des
   * fermes resteraient invisibles.
   */
  const handleFarmsClick = () => {
    if (collapsed) onToggle();
    if (!onFarmsPage) {
      navigate("/");
      setFarmsOpen(true);
      return;
    }
    setFarmsOpen((open) => (collapsed ? true : !open));
  };

  const itemStyle = (active: boolean): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: collapsed ? "10px 0" : "9px 12px",
    justifyContent: collapsed ? "center" : "flex-start",
    borderRadius: 8,
    border: "none",
    background: active ? "#1b4332" : "transparent",
    color: active ? "#ffffff" : "#111827",
    cursor: "pointer",
    fontSize: 14,
    textAlign: "left",
    width: "100%",
  });

  /** Ferme de la liste : décalée sous l'entrée « Fermes ». */
  const subItemStyle = (active: boolean): React.CSSProperties => ({
    ...itemStyle(active),
    padding: "7px 12px 7px 38px",
    fontSize: 13,
  });

  const showFarms = farmsOpen && !collapsed;

  return (
    <aside
      style={{
        width: collapsed ? 64 : 240,
        flexShrink: 0,
        background: "#ffffff",
        borderRight: "1px solid #e5e7eb",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        fontFamily: "system-ui, sans-serif",
        transition: "width 0.2s ease",
        overflow: "hidden",
      }}
    >
      {/* Logo + repli */}
      <div
        style={{
          height: 56,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          padding: collapsed ? 0 : "0 12px 0 16px",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        {!collapsed && (
          <span style={{ fontSize: 17, fontWeight: 700, color: "#1b4332", letterSpacing: 0.5 }}>
            🌾 AWAM
          </span>
        )}
        <button
          type="button"
          onClick={onToggle}
          title={collapsed ? "Déplier le menu" : "Replier le menu"}
          style={{ background: "transparent", border: "none", fontSize: 18, cursor: "pointer", padding: 6, color: "#111827" }}
        >
          ☰
        </button>
      </div>

      {/* Menu : défile si la liste des fermes devient longue */}
      <nav
        className="scrollbar-hidden"
        style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4, padding: "12px 8px" }}
      >
        {/* ---- Fermes : page principale + liste repliable ---- */}
        <button
          type="button"
          style={itemStyle(onFarmsPage)}
          onClick={handleFarmsClick}
          title="Fermes"
          aria-expanded={showFarms}
        >
          <span style={{ fontSize: 17 }}>🌱</span>
          {!collapsed && (
            <>
              <span style={{ flex: 1 }}>Fermes</span>
              <span style={{ fontSize: 11, opacity: 0.7 }}>{farmsOpen ? "▾" : "▸"}</span>
            </>
          )}
        </button>

        {showFarms && (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {loadingFarms && (
              <p style={{ fontSize: 13, color: "#6b7280", padding: "4px 12px 4px 38px", margin: 0 }}>
                Chargement…
              </p>
            )}

            {!loadingFarms && farms.length === 0 && (
              <p style={{ fontSize: 13, color: "#6b7280", padding: "4px 12px 4px 38px", margin: 0 }}>
                Aucune ferme pour l'instant.
              </p>
            )}

            {farms.map((farm) => {
              const isActive = farm.id === selectedFarmId;
              const count = parcels.filter((p) => p.farm_id === farm.id).length;
              const deleting = deletingFarmId === farm.id;
              const actionStyle: React.CSSProperties = {
                background: "transparent",
                border: "none",
                padding: "2px 4px",
                fontSize: 12,
                lineHeight: 1,
                cursor: deleting ? "wait" : "pointer",
                color: isActive ? "#ffffff" : "#374151",
                borderRadius: 4,
              };
              // Une ligne = un bouton de sélection + les actions : un bouton
              // ne peut pas en contenir d'autres
              return (
                <div
                  key={farm.id}
                  style={{
                    ...subItemStyle(isActive),
                    padding: 0,
                    gap: 0,
                    opacity: deleting ? 0.6 : 1,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => selectFarm(farm.id)}
                    disabled={deleting}
                    style={{
                      ...subItemStyle(isActive),
                      background: "transparent",
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {farm.name}
                    </span>
                    <span style={{ fontSize: 11, opacity: isActive ? 0.8 : 0.55 }}>{count}</span>
                  </button>

                  <span style={{ display: "flex", alignItems: "center", gap: 2, paddingRight: 8 }}>
                    <button
                      type="button"
                      title={`Modifier la ferme « ${farm.name} »`}
                      aria-label={`Modifier la ferme ${farm.name}`}
                      onClick={() => setEditingFarm(farm)}
                      disabled={deleting}
                      style={actionStyle}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      title={`Supprimer la ferme « ${farm.name} »`}
                      aria-label={`Supprimer la ferme ${farm.name}`}
                      onClick={() => handleDeleteFarm(farm, count)}
                      disabled={deleting}
                      style={{ ...actionStyle, color: isActive ? "#fecaca" : "#b42318" }}
                    >
                      {deleting ? "…" : "🗑"}
                    </button>
                  </span>
                </div>
              );
            })}

            <button
              type="button"
              onClick={onAddFarm}
              title="Ajouter une ferme"
              style={{ ...subItemStyle(false), color: "#1b4332", fontWeight: 600 }}
            >
              <span style={{ fontSize: 14 }}>＋</span>
              <span>Ajouter une ferme</span>
            </button>
          </div>
        )}

        {/* ---- Cultures ---- */}
        <button
          type="button"
          style={itemStyle(location.pathname === "/cultures")}
          onClick={() => navigate("/cultures")}
          title="Cultures"
        >
          <span style={{ fontSize: 17 }}>🌿</span>
          {!collapsed && <span>Cultures</span>}
        </button>

        {/* ---- Employés ---- */}
        <button
          type="button"
          style={itemStyle(location.pathname === "/employes")}
          onClick={() => navigate("/employes")}
          title="Employés"
        >
          <span style={{ fontSize: 17 }}>👥</span>
          {!collapsed && <span>Employés</span>}
        </button>
      </nav>

      <div style={{ flexShrink: 0, borderTop: "1px solid #e5e7eb", padding: 8 }}>
        <button
          type="button"
          onClick={handleLogout}
          title="Déconnexion"
          style={{ ...itemStyle(false), color: "#b42318" }}
        >
          <span style={{ fontSize: 16 }}>↩</span>
          {!collapsed && <span>Déconnexion</span>}
        </button>
      </div>

      {/* Modification d'une ferme : même formulaire que la création */}
      <FarmFormModal
        isOpen={editingFarm !== null}
        farm={editingFarm}
        onClose={() => setEditingFarm(null)}
        onSaved={async (farmId) => {
          setEditingFarm(null);
          await refreshFarms(farmId);
        }}
      />
    </aside>
  );
}