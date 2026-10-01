import { useEffect, useState } from "react";
import { weatherService } from "../Services/weatherService";
import type { Weather } from "../types/weather";

interface UseWeatherResult {
  weather: Weather | null;
  loading: boolean;
  error: string | null;
}

export function useWeather(
  latitude: number | null | undefined,
  longitude: number | null | undefined
): UseWeatherResult {
  const [weather, setWeather] = useState<Weather | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (latitude == null || longitude == null) {
      setWeather(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    weatherService
      .get(latitude, longitude)
      .then((data) => {
        if (!cancelled) setWeather(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message ?? "Erreur météo.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [latitude, longitude]);

  return { weather, loading, error };
}