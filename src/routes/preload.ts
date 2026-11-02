import { MAIN_PATHS, preloadPath } from "./lazyPages";

/**
 * Préchargement DISCRET des pages principales, pour que leur première
 * ouverture soit immédiate :
 *   - seulement après l'affichage de la première page ;
 *   - pendant les moments calmes du navigateur (requestIdleCallback) ;
 *   - une page à la fois, avec une petite pause entre chacune ;
 *   - jamais en mode « économie de données » ni sur une connexion lente,
 *     pour ne pas consommer le forfait mobile : les pages se chargent alors
 *     simplement au clic.
 */

interface NetworkInformation {
  saveData?: boolean;
  effectiveType?: string;
}

function connectionAllowsPreload(): boolean {
  const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
  if (!connection) return true;
  if (connection.saveData) return false;
  return !["slow-2g", "2g"].includes(connection.effectiveType ?? "");
}

/** Attendre un moment calme du navigateur */
function whenIdle(callback: () => void): void {
  const w = window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number };
  if (w.requestIdleCallback) w.requestIdleCallback(callback, { timeout: 4000 });
  else window.setTimeout(callback, 1500);
}

let started = false;

/** Lance le préchargement des pages principales, une seule fois par visite */
export function preloadMainPagesWhenIdle(): void {
  if (started || !connectionAllowsPreload()) return;
  started = true;
  const queue = MAIN_PATHS.filter((path) => path !== window.location.pathname);
  const next = () => {
    const path = queue.shift();
    if (!path) return;
    preloadPath(path);
    whenIdle(next);
  };
  // Laisser d'abord la page actuelle s'afficher entièrement
  window.setTimeout(() => whenIdle(next), 1500);
}