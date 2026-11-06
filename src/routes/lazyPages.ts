import { lazy, type ComponentType } from "react";

/**
 * Pages chargées À LA DEMANDE : le code d'une page n'est téléchargé que
 * lorsqu'on l'ouvre (ou qu'on la précharge), au lieu d'être téléchargé en
 * entier à l'ouverture d'AWAM. Pendant ce court téléchargement, App.tsx
 * affiche l'indicateur de chargement (PageLoader).
 */

type PageModule = { default: ComponentType };

/** Indicateur, gardé pour la session : la page a déjà été rechargée une fois */
const RELOAD_FLAG = "awam:reloaded-after-update";

/**
 * Charge le code d'une page. Si le téléchargement échoue juste après une
 * mise à jour d'AWAM (le navigateur demande un ancien fichier, qui n'existe
 * plus), la page est rechargée UNE fois pour récupérer la nouvelle version.
 */
function withUpdateGuard(load: () => Promise<PageModule>): () => Promise<PageModule> {
  return () =>
    load()
      .then((module) => {
        sessionStorage.removeItem(RELOAD_FLAG);
        return module;
      })
      .catch((error: unknown) => {
        if (!sessionStorage.getItem(RELOAD_FLAG)) {
          sessionStorage.setItem(RELOAD_FLAG, "1");
          window.location.reload();
          // La page se recharge : on n'affiche rien d'ici là
          return new Promise<PageModule>(() => {});
        }
        throw error;
      });
}

/** Le code de chaque page, à télécharger à la demande */
const loaders = {
  login: withUpdateGuard(() => import("../pages/LoginPage")),
  register: withUpdateGuard(() => import("../pages/RegisterPage")),
  forgotPassword: withUpdateGuard(() => import("../pages/ForgotPasswordPage")),
  dashboard: withUpdateGuard(() => import("../pages/DashboardPage")),
  crops: withUpdateGuard(() => import("../pages/CropsPage")),
  employees: withUpdateGuard(() => import("../pages/EmployeesPage")),
  profile: withUpdateGuard(() => import("../pages/ProfilePage")),
  climate: withUpdateGuard(() => import("../pages/ClimatePage")),
  irrigation: withUpdateGuard(() => import("../pages/IrrigationPage")),
  conditions: withUpdateGuard(() => import("../pages/ConditionsPage")),
};

export const LoginPage = lazy(loaders.login);
export const RegisterPage = lazy(loaders.register);
export const ForgotPasswordPage = lazy(loaders.forgotPassword);
export const DashboardPage = lazy(loaders.dashboard);
export const CropsPage = lazy(loaders.crops);
export const EmployeesPage = lazy(loaders.employees);
export const ProfilePage = lazy(loaders.profile);
export const ClimatePage = lazy(loaders.climate);
export const IrrigationPage = lazy(loaders.irrigation);
export const ConditionsPage = lazy(loaders.conditions);

/** Préchargement d'une page par son adresse, ex. au survol d'un lien */
const BY_PATH: Record<string, () => Promise<PageModule>> = {
  "/": loaders.dashboard,
  "/cultures": loaders.crops,
  "/employes": loaders.employees,
  "/profile": loaders.profile,
  "/climat": loaders.climate,
  "/irrigation": loaders.irrigation,
  "/climat-cultures": loaders.conditions,
};

/** Pages principales, préchargées discrètement après l'ouverture */
export const MAIN_PATHS = ["/", "/cultures", "/employes", "/profile"];

export function preloadPath(path: string): void {
  // Une erreur de préchargement n'a pas d'effet : la page sera chargée au clic
  BY_PATH[path]?.().catch(() => {});
}