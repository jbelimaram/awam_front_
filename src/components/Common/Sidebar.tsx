import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useSelection } from "../../hooks/useSelection";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onAddFarm: () => void;
}

/**
 * Colonne de navigation : logo, sections du dashboard, liste des fermes
 * (avec « + » pour en créer une) et déconnexion.
 */
export default function Sidebar({ collapsed, onToggle, onAddFarm }: SidebarProps) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { farms, selectedFarmId, selectFarm, parcels, loadingFarms } = useSelection();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
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

      <nav style={{ display: "flex", flexDirection: "column", gap: 4, padding: "12px 8px" }}>
        <button
          type="button"
          style={itemStyle(location.pathname === "/")}
          onClick={() => navigate("/")}
          title="Page principale"
        >
          <span style={{ fontSize: 17 }}>📊</span>
          {!collapsed && <span>Page principale</span>}
        </button>
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

      {/* Fermes */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "0 8px" }}>
        {!collapsed && (
          <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.6, padding: "12px 12px 6px" }}>
            Fermes
          </div>
        )}

        {loadingFarms && !collapsed && (
          <p style={{ fontSize: 13, color: "#6b7280", padding: "4px 12px" }}>Chargement…</p>
        )}

        {!loadingFarms && farms.length === 0 && !collapsed && (
          <p style={{ fontSize: 13, color: "#6b7280", padding: "4px 12px" }}>Aucune ferme pour l'instant.</p>
        )}

        {farms.map((farm) => {
          const isActive = farm.id === selectedFarmId;
          const count = parcels.filter((p) => p.farm_id === farm.id).length;
          return (
            <button
              key={farm.id}
              type="button"
              onClick={() => selectFarm(farm.id)}
              title={collapsed ? farm.name : undefined}
              style={{ ...itemStyle(isActive), marginBottom: 2 }}
            >
              <span style={{ fontSize: 15 }}>🌱</span>
              {!collapsed && (
                <>
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {farm.name}
                  </span>
                  <span style={{ fontSize: 11, opacity: isActive ? 0.8 : 0.55 }}>{count}</span>
                </>
              )}
            </button>
          );
        })}

        <button
          type="button"
          onClick={onAddFarm}
          title="Ajouter une ferme"
          style={{
            ...itemStyle(false),
            color: "#1b4332",
            fontWeight: 600,
            border: "1px dashed #cbd5e1",
            marginTop: 4,
          }}
        >
          <span style={{ fontSize: 16 }}>＋</span>
          {!collapsed && <span>Ajouter une ferme</span>}
        </button>
      </div>

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