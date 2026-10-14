import { useEffect, useState } from "react";

/**
 * Notifications en temps réel envoyées par le back (GET /api/events,
 * app/api/routes/events.py) quand un worker termine un traitement.
 *
 *   "rasters" : image satellite de la carte régénérée
 *   "indices" : indices du jour calculés
 *   "history" : un lot de l'historique de 3 ans enregistré
 *   "failed"  : l'analyse a échoué
 */
export type ParcelEventKind = "rasters" | "indices" | "history" | "failed";

export interface ParcelEvent {
  parcel_id: number;
  kind: ParcelEventKind;
  scene_date?: string | null;
}

type Listener = (event: ParcelEvent) => void;

const API_URL = import.meta.env.VITE_API_URL;

// UNE seule connexion pour toute la page, partagée par tous les composants.
// Elle s'ouvre au premier abonné et se ferme quand il n'y en a plus.
const listeners = new Set<Listener>();
let source: EventSource | null = null;

function openConnection() {
  if (source || typeof EventSource === "undefined") return;
  // withCredentials : le cookie de session authentifie la connexion.
  // En cas de coupure, le navigateur se reconnecte seul.
  source = new EventSource(`${API_URL}/api/events`, { withCredentials: true });
  source.addEventListener("parcel", (message) => {
    try {
      const event = JSON.parse((message as MessageEvent).data) as ParcelEvent;
      listeners.forEach((listener) => listener(event));
    } catch {
      // Message illisible : ignoré, la page reste dans son état actuel
    }
  });
}

function closeConnection() {
  source?.close();
  source = null;
}

/** S'abonne à tous les événements ; renvoie la fonction de désabonnement. */
export function subscribeParcelEvents(listener: Listener): () => void {
  listeners.add(listener);
  openConnection();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) closeConnection();
  };
}

/**
 * Compteur qui augmente à chaque événement reçu pour CETTE parcelle et
 * de l'un des types demandés. À placer dans les dépendances d'un
 * chargement : quand il change, les données sont relues.
 */
export function useParcelEventTick(parcelId: number | null, kinds: ParcelEventKind[]): number {
  const [tick, setTick] = useState(0);
  const kindsKey = kinds.join(",");

  useEffect(() => {
    if (parcelId == null) return;
    const wanted = new Set(kindsKey.split(","));
    return subscribeParcelEvents((event) => {
      if (event.parcel_id === parcelId && wanted.has(event.kind)) {
        setTick((t) => t + 1);
      }
    });
  }, [parcelId, kindsKey]);

  return tick;
}