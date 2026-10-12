import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useSelection } from "../../hooks/useSelection";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onAddFarm: () => void;
}

/**
 * Colonne de navigation : logo, « Fermes » (page principale, avec la
 * liste repliable des fermes et l'ajout), « Cultures », et déconnexion.
 */
export default function Sidebar({ collapsed, onToggle, onAddFarm }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const { farms, selectedFarmId, selectFarm, parcels, loadingFarms } = useSelection();

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
              return (
                <button
                  key={farm.id}
                  type="button"
                  onClick={() => selectFarm(farm.id)}
                  style={subItemStyle(isActive)}
                >
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {farm.name}
                  </span>
                  <span style={{ fontSize: 11, opacity: isActive ? 0.8 : 0.55 }}>{count}</span>
                </button>
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
    </aside>
  );
}