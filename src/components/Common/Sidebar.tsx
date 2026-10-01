import { useLocation, useNavigate } from "react-router-dom";

interface SidebarProps {
  collapsed: boolean;
}

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  path: string;
}

const MENU_ITEMS: MenuItem[] = [
  { id: "dashboard", label: "Tableau de bord", icon: "📊", path: "/" },
  { id: "parcelles", label: "Parcelles", icon: "🗺️", path: "/parcelles" },
  { id: "agenda", label: "Agenda", icon: "📅", path: "/agenda" },
  { id: "alertes", label: "Alertes", icon: "🔔", path: "/alertes" },
  { id: "profil", label: "Mon profil", icon: "👤", path: "/profile" },
];

export default function Sidebar({ collapsed }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside
      style={{
        width: collapsed ? 64 : 240,
        background: "#ffffff",
        borderRight: "1px solid #e5e7eb",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "16px 0",
        fontFamily: "system-ui, sans-serif",
        transition: "width 0.2s ease",
        overflow: "hidden",
      }}
    >
      <nav style={{ display: "flex", flexDirection: "column", gap: 4, padding: "0 8px" }}>
        {MENU_ITEMS.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              title={collapsed ? item.label : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 12px",
                borderRadius: 8,
                border: "none",
                background: isActive ? "#1b4332" : "transparent",
                color: isActive ? "#ffffff" : "#111827",
                cursor: "pointer",
                fontSize: 14,
                textAlign: "left",
                width: "100%",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.background = "#f3f4f6";
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = "transparent";
              }}
            >
              <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}