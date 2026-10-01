import { useSelection } from "../../hooks/useSelection";
import { useWeather } from "../../hooks/useWeather";

export default function WeatherWidget() {
  const { farms, selectedFarmId } = useSelection();
  const farm = farms.find((f) => f.id === selectedFarmId);
  const { weather, loading } = useWeather(farm?.latitude, farm?.longitude);

  if (!farm || farm.latitude == null || farm.longitude == null) {
    return (
      <span style={{ fontSize: 13, color: "#ffffffaa" }}>
        Position de la ferme non définie
      </span>
    );
  }

  if (loading || !weather) {
    return <span style={{ fontSize: 13, color: "#ffffffaa" }}>…</span>;
  }

  return (
    <span style={{ fontSize: 13, color: "#ffffff" }}>
      🌡️ {weather.temperature ?? "—"}°C · 💧 {weather.humidity ?? "—"}%
    </span>
  );
}