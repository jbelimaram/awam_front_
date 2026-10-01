import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export default function Header({ onToggleSidebar }: HeaderProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <header
      style={{
        height: 56,
        background: "#1b4332",
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 16px",
        fontFamily: "system-ui, sans-serif",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        zIndex: 100,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={onToggleSidebar}
          style={{
            background: "transparent",
            border: "none",
            color: "#ffffff",
            fontSize: 20,
            cursor: "pointer",
            padding: 8,
          }}
          title="Menu"
        >
          ☰
        </button>
        <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: 0.5 }}>
          🌾 AWAM
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {user?.email && (
          <span style={{ fontSize: 14, opacity: 0.85 }}>{user.email}</span>
        )}
        <button
          onClick={handleLogout}
          style={{
            background: "transparent",
            border: "1px solid #ffffff88",
            color: "#ffffff",
            borderRadius: 6,
            padding: "6px 12px",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Déconnexion
        </button>
      </div>
    </header>
  );
}