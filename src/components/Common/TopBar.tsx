import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useSelection } from "../../hooks/useSelection";
import { useWeather } from "../../hooks/useWeather";
import { weatherCodeToLabel, weatherCodeToIcon } from "../../utils/weatherCodeToLabel";

/** Fil d'Ariane cliquable : Accueil > Ferme > Parcelle */
function Breadcrumb() {
  const { farms, selectedFarmId, selectedParcel, selectFarm, selectParcel } = useSelection();
  const farm = farms.find((f) => f.id === selectedFarmId);

  // Chaque niveau ramène à l'étape correspondante de la sélection
  const items: { label: string; onClick: (() => void) | null }[] = [
    {
      label: "Accueil",
      onClick:
        selectedFarmId !== null || selectedParcel
          ? () => {
              selectParcel(null);
              selectFarm(null);
            }
          : null,
    },
  ];

  if (farm) {
    items.push({
      label: farm.name,
      onClick: selectedParcel ? () => selectParcel(null) : null,
    });
  }

  if (selectedParcel) {
    items.push({ label: selectedParcel.nom, onClick: null });
  }

  return (
    <nav aria-label="Fil d'Ariane" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, minWidth: 0 }}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        const common: React.CSSProperties = {
          fontWeight: isLast ? 600 : 400,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          maxWidth: 220,
        };

        return (
          <span key={`${item.label}-${i}`} style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            {i > 0 && <span style={{ opacity: 0.45 }}>›</span>}
            {item.onClick ? (
              <button
                type="button"
                onClick={item.onClick}
                title={`Revenir à ${item.label}`}
                style={{
                  ...common,
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  color: "#1b4332",
                  fontSize: 14,
                  fontFamily: "inherit",
                  textDecoration: "underline",
                  textUnderlineOffset: 3,
                  textDecorationColor: "rgba(27,67,50,0.35)",
                }}
              >
                {item.label}
              </button>
            ) : (
              <span style={{ ...common, opacity: isLast ? 1 : 0.7, color: "#111827" }}>
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}

/** Météo de la ferme sélectionnée */
function WeatherChip() {
  const { farms, selectedFarmId } = useSelection();
  const farm = farms.find((f) => f.id === selectedFarmId);
  const { weather, loading } = useWeather(farm?.latitude, farm?.longitude);

  const hasCoords = farm != null && farm.latitude != null && farm.longitude != null;
  const ready = hasCoords && !loading && weather != null;

  return (
    <span
      key={selectedFarmId ?? "none"}
      translate="no"
      title={
        ready
          ? `${weatherCodeToLabel(weather.weather_code)} · vent ${weather.wind_speed ?? "—"} km/h · pluie ${weather.precipitation ?? 0} mm`
          : undefined
      }
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontSize: 13,
        whiteSpace: "nowrap",
        minWidth: 1,
      }}
    >
      {!hasCoords ? null : !ready ? (
        <span style={{ opacity: 0.6 }}>…</span>
      ) : (
        <>
          <span style={{ fontSize: 16 }}>{weatherCodeToIcon(weather.weather_code)}</span>
          <span>{`${weather.temperature ?? "—"}°C`}</span>
          <span style={{ opacity: 0.6 }}>{`· ${weather.humidity ?? "—"}%`}</span>
        </>
      )}
    </span>
  );
}

/** Menu de l'avatar : profil, agenda, déconnexion */
function UserMenu() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Ferme le menu au clic en dehors
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const initials = (user?.full_name || user?.username || user?.email || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate("/login", { replace: true });
  };

  const itemStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    textAlign: "left",
    padding: "9px 14px",
    border: "none",
    background: "transparent",
    fontSize: 14,
    cursor: "pointer",
    color: "#111827",
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={user?.email ?? "Mon compte"}
        style={{
          width: 34,
          height: 34,
          borderRadius: "50%",
          border: "1px solid rgba(0,0,0,0.1)",
          background: "#1b4332",
          color: "#ffffff",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {initials || "👤"}
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            right: 0,
            top: 42,
            minWidth: 210,
            background: "#ffffff",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
            overflow: "hidden",
            zIndex: 200,
          }}
        >
          <div style={{ padding: "10px 14px", borderBottom: "1px solid #e5e7eb" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>
              {user?.full_name || user?.username}
            </div>
            <div style={{ fontSize: 12, color: "#6b7280", wordBreak: "break-all" }}>{user?.email}</div>
          </div>
          <button type="button" style={itemStyle} onClick={() => { setOpen(false); navigate("/profile"); }}>
            👤 Mon profil
          </button>
          <button type="button" style={itemStyle} onClick={() => { setOpen(false); navigate("/profile#agenda"); }}>
            📅 Mon agenda
          </button>
          <button type="button" style={{ ...itemStyle, borderTop: "1px solid #e5e7eb", color: "#b42318" }} onClick={handleLogout}>
            ↩ Déconnexion
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Barre supérieure du dashboard : fil d'Ariane à gauche,
 * météo / notifications / avatar à droite.
 */
export default function TopBar() {
  return (
    <header
      style={{
        height: 56,
        flexShrink: 0,
        background: "#ffffff",
        borderBottom: "1px solid #e5e7eb",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "0 16px",
        fontFamily: "system-ui, sans-serif",
        color: "#111827",
        zIndex: 100,
      }}
    >
      <Breadcrumb />

      <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
        <WeatherChip />

        {/* Alertes : branchées plus tard sur /api/parcels/{id}/alerts */}
        <button
          type="button"
          disabled
          title="Notifications (bientôt disponible)"
          style={{
            background: "transparent",
            border: "none",
            fontSize: 17,
            cursor: "not-allowed",
            opacity: 0.4,
            padding: 4,
          }}
        >
          🔔
        </button>

        <UserMenu />
      </div>
    </header>
  );
}