import { api } from "./api";
import type { Weather } from "../types/weather";

// api/routes/weather.py, monté sous /api
export const weatherService = {
  get: (latitude: number, longitude: number): Promise<Weather> =>
    api.get<Weather>(`/api/weather?latitude=${latitude}&longitude=${longitude}`),
};