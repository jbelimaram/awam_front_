/**
 * Types TypeScript alignés strictement sur les schémas Pydantic du backend AWAM.
 *
 * Règle de ce fichier : un type ici = une réponse ou un payload EXACT d'un
 * endpoint. Aucune donnée calculée, aucun libellé, aucune couleur — ça vit
 * dans /utils. Si un champ backend change, ce fichier doit changer avec lui.
 */

// ---------------------------------------------------------------------------
// GeoJSON minimal (local, pour ne pas dépendre de @types/geojson)
// ---------------------------------------------------------------------------

export interface GeoJsonGeometry {
  type: "Point" | "LineString" | "Polygon" | "MultiPolygon" | string;
  coordinates: unknown;
}

// ---------------------------------------------------------------------------
// Auth — schemas/auth.py
// ---------------------------------------------------------------------------

/** UserResponse — renvoyé par GET /auth/me */
export interface AuthUser {
  id: number;
  username: string;
  email: string;
  full_name?: string | null;
  role: "user" | "admin";
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

// ---------------------------------------------------------------------------
// Profil — schemas/profile.py
// ⚠️ Router monté SANS préfixe /api (app.include_router(profile_router))
// ---------------------------------------------------------------------------

/** ProfileResponse — renvoyé par GET /profile. Contient l'avatar, contrairement à AuthUser. */
export interface Profile {
  id: number;
  username: string;
  email: string;
  full_name?: string | null;
  role: "user" | "admin";
  avatar_url?: string | null;
  has_password: boolean;
}

// ---------------------------------------------------------------------------
// Ferme — schemas/farm.py, models/farm.py
// ---------------------------------------------------------------------------

/** FarmResponse */
export interface Farm {
  id: number;
  name: string;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

/** FarmCreate / FarmUpdate (les deux ont les mêmes champs, tous optionnels en update) */
export interface FarmPayload {
  name: string;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

// ---------------------------------------------------------------------------
// Lien Ferme–Employé — models/farm_employee.py
// ⚠️ Routes /api/farms/{id}/employees à créer côté backend : le modèle
// SQLAlchemy existe (role, hired_at, is_active) mais aucun schéma Pydantic
// ni router ne l'expose encore.
// ---------------------------------------------------------------------------

export type FarmEmployeeRole = "coordinateur" | "membre";

export interface FarmEmployee {
  id: number;
  farm_id: number;
  role: FarmEmployeeRole | null;
  hired_at: string | null;
  is_active: boolean;
  employee: Employee;
}

export interface FarmEmployeeCreatePayload {
  employee_id: number;
  role?: FarmEmployeeRole;
}

export interface FarmEmployeeUpdatePayload {
  role?: FarmEmployeeRole;
  is_active?: boolean;
}

// ---------------------------------------------------------------------------
// Parcelle — schemas/parcel.py, models/parcel.py
// ---------------------------------------------------------------------------

export type RasterStatus = "pending" | "ready" | "failed";

/** ParcelResponse — renvoyé par GET/POST/PUT /api/parcels. */
export interface Parcel {
  id: number;
  farm_id: number;
  name: string;
  culture_type?: string | null;
  area_ha?: number | null;
  /** État agronomique : "active" | "inactive". Indépendant de raster_status. */
  status: string;
  /** ⚠️ Toujours null via ce endpoint : _parcel_to_response() ne le remplit
   * jamais. Utiliser DashboardParcel.geometry (GET /api/dashboard/parcels)
   * pour obtenir la vraie géométrie. */
  geometry?: GeoJsonGeometry | null;
  cog_url?: string | null;
  sentinel_rgb_url?: string | null;
  sentinel_ndvi_url?: string | null;
  raster_status: RasterStatus;
}

/** ParcelCreate */
export interface ParcelCreatePayload {
  farm_id: number;
  name: string;
  geometry: GeoJsonGeometry;
  culture_type?: string | null;
  soil_type?: string | null;
  irrigation_type?: string | null;
}

/** ParcelUpdate.
 * ⚠️ "status" n'existe pas encore dans ce schéma côté backend (voir la
 * correction proposée : ajouter `status: Optional[Literal["active","inactive"]]`
 * dans app/schemas/parcel.py + le traiter dans update_parcel()). Le champ
 * est déclaré ici par anticipation ; tant que le backend ne l'accepte pas,
 * l'envoyer n'aura aucun effet (Pydantic l'ignorera silencieusement côté
 * serveur puisqu'il n'est pas dans ParcelUpdate).
 */
export interface ParcelUpdatePayload {
  name?: string;
  geometry?: GeoJsonGeometry;
  culture_type?: string | null;
  soil_type?: string | null;
  irrigation_type?: string | null;
  status?: "active" | "inactive";
}

/** Réponse de GET /api/parcels/{id}/raster_status */
export interface ParcelRasterStatusResponse {
  parcel_id: number;
  raster_status: RasterStatus | null;
}

/** Réponse de POST /api/parcels/{id}/refresh */
export interface ParcelRefreshResponse {
  parcel_id: number;
  task_id: string;
  status: "pending";
  force_refresh: boolean;
  message: string;
}

// ---------------------------------------------------------------------------
// Dashboard — api/routes/dashboard.py
// Vue enrichie : seule source fiable de la géométrie et de la surface réelle.
// ---------------------------------------------------------------------------

/** Un élément de GET /api/dashboard/parcels → parcelles[] */
export interface DashboardParcel {
  id: number;
  nom: string;
  farm_id: number;
  farm_name: string;
  geometry: GeoJsonGeometry | null;
  surface_m2: number;
  surface_ha: number;
  culture_type?: string | null;
  soil_type?: string | null;
  irrigation_type?: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/** Corps complet de GET /api/dashboard/parcels */
export interface DashboardParcelsResponse {
  total: number;
  surface_totale_m2: number;
  surface_totale_ha: number;
  parcelles: DashboardParcel[];
}

/** GET /api/dashboard/stats */
export interface DashboardStats {
  nb_parcelles: number;
  nb_fermes: number;
  surface_totale_m2: number;
  surface_totale_ha: number;
}

// ---------------------------------------------------------------------------
// Alertes — schemas/alert.py
// (Conservé dans les types car le modèle/endpoint existent ; à brancher ou
// non dans l'UI selon la décision prise sur la carte Alertes du Dashboard.)
// ---------------------------------------------------------------------------

/** AlertResponse. `severity` est une chaîne libre côté backend (pas d'enum Pydantic). */
export interface Alert {
  id: number;
  parcel_id: number;
  alert_type: string;
  severity: string;
  message: string;
  resolved: boolean;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Employés — schemas/employee.py
// ⚠️ GET /api/employees n'est filtré ni par utilisateur ni par ferme côté
// backend (db.query(Employee).order_by(...) sans WHERE). Pour "les employés
// de MA ferme", utiliser FarmEmployee via farmEmployeeService, pas Employee
// directement.
// ---------------------------------------------------------------------------

/** EmployeeResponse */
export interface Employee {
  id: number;
  full_name: string;
  phone?: string | null;
}

/** EmployeeCreate / EmployeeUpdate */
export interface EmployeePayload {
  full_name: string;
  phone?: string | null;
}

// ---------------------------------------------------------------------------
// Activités — schemas/activity.py, models/activity.py
// ---------------------------------------------------------------------------

/** ActivityResponse — inclut les employés liés (relation many-to-many). */
export interface Activity {
  id: number;
  parcel_id: number;
  activity_type: string;
  performed_at: string;
  employees: Employee[];
}

/** ActivityCreate.
 * ⚠️ employee_ids est obligatoire ET non vide côté backend
 * (validator employee_ids_not_empty lève une erreur sinon).
 * performed_at, si fourni, DOIT inclure un fuseau horaire (validator
 * performed_at_has_timezone) — utiliser toISOString() côté front.
 */
export interface ActivityCreatePayload {
  parcel_id: number;
  activity_type: string;
  performed_at?: string;
  employee_ids: number[];
}

/** ActivityUpdate — tous les champs optionnels, mais employee_ids, si
 * fourni, ne peut pas être un tableau vide (même validator que Create). */
export interface ActivityUpdatePayload {
  parcel_id?: number;
  activity_type?: string;
  performed_at?: string;
  employee_ids?: number[];
}

/**
 * `activity_type` est un champ texte libre côté backend (String(100), pas
 * d'enum). Cette liste est une contrainte VOLONTAIRE côté front, pour éviter
 * de saisir des types incohérents (fautes de frappe, variantes). Elle
 * reprend les tuiles du croquis : Irrigation, Fertilisation, Traitement,
 * Taille, Récolte, Plantation, Désherbage.
 */
export const ACTIVITY_TYPES = [
  "irrigation",
  "fertilisation",
  "traitement",
  "taille",
  "recolte",
  "plantation",
  "desherbage",
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

// ---------------------------------------------------------------------------
// Indices spectraux — schemas/indice_reading.py, models/indice_reading.py
// ---------------------------------------------------------------------------

/**
 * IndiceReadingResponse — une ligne = (parcelle, indice, scène Sentinel-2).
 * theoretical_min/max viennent directement du registre backend
 * (app/services/indices/registry.py), donc PAS besoin de les redéfinir
 * en dur côté front pour les bornes réelles : seule l'interprétation
 * (bandes de couleur) est ajoutée côté front, dans utils/indices.ts.
 */
export interface IndiceReading {
  id: number;
  parcel_id: number;
  indice_name: string;
  value: number | null;
  min_value: number | null;
  max_value: number | null;
  std_value: number | null;
  median_value: number | null;
  valid_pixels: number | null;
  cloud_pixels: number | null;
  total_pixels: number | null;
  /** 0 à 1. Un valid_ratio bas signale une scène très nuageuse : à signaler
   * visuellement plutôt qu'à masquer, car la valeur reste affichée telle quelle. */
  valid_ratio: number | null;
  theoretical_min: number | null;
  theoretical_max: number | null;
  is_valid: boolean | null;
  validation_error: string | null;
  scene_id: string | null;
  /** Format YYYY-MM-DD (date, pas datetime) */
  scene_date: string | null;
  cloud_cover: number | null;
  b2_key: string | null;
  recorded_at: string | null;
}

/**
 * Les 14 noms d'indices existant dans le registre backend
 * (app/services/indices/registry.py → INDICES_REGISTRY). Utilisé
 * uniquement pour le typage strict ; la liste RÉELLEMENT disponible
 * pour une parcelle donnée vient toujours de
 * GET /api/parcels/{id}/indices/available, jamais de cette constante.
 */
export const KNOWN_INDICE_NAMES = [
  "NDVI",
  "NDMI",
  "NDWI",
  "NDRE",
  "EVI",
  "SAVI",
  "MSAVI",
  "NBR",
  "REDEDGE",
  "VARI",
  "CARBONATE",
  "SI_SOIL",
  "PSRI",
  "FCOVER",
] as const;

export type KnownIndiceName = (typeof KNOWN_INDICE_NAMES)[number];

// ---------------------------------------------------------------------------
// Rasters — schemas/raster.py, models/raster.py
// ---------------------------------------------------------------------------

/**
 * Seuls ces 3 types sont exposables comme calque carte aujourd'hui
 * (RasterType côté backend). Les 10 autres indices existent en COG sur B2
 * mais n'ont pas d'entrée `raster` ni de route pour les servir en tuile :
 * ils ne sont visibles QUE via IndiceReading (courbe), pas sur la carte.
 */
export type RasterType = "mask" | "sentinel_rgb" | "sentinel_ndvi";

/** RasterResponse — élément de GET /api/raster/list */
export interface Raster {
  id: number;
  parcel_id: number;
  raster_type: RasterType;
  scene_date: string | null;
  /** ⚠️ URL B2 BRUTE, non signée. Si le bucket est privé, elle échoue (403).
   * Ne sert qu'à lire scene_date pour lister les dates de passage ; pour
   * afficher une image, utiliser RasterCurrent.url (signée). */
  url: string;
  created_at: string;
}

/** RasterCurrentResponse — réponse de GET /api/raster/current */
export interface RasterCurrent {
  /** URL signée, valable 1h (expires_in=3600 côté backend). */
  url: string | null;
  scene_date: string | null;
  bbox: [number, number, number, number] | null;
}

// ---------------------------------------------------------------------------
// Météo — schemas/weather.py
// ---------------------------------------------------------------------------

/** WeatherResponse */
export interface Weather {
  temperature: number | null;
  humidity: number | null;
  precipitation: number | null;
  wind_speed: number | null;
  weather_code: number | null;
}

// ---------------------------------------------------------------------------
// Couches vectorielles — schemas/vector.py, api/routes/vector_layers.py
// ⚠️ Router monté SANS préfixe /api (prefix="/vector" directement dans
// vector_layers.py, mais app.include_router(vector_layers_router) sans "/api")
// ---------------------------------------------------------------------------

export type VectorLayerId = "parcelles" | "points_interet";

export interface VectorFeature {
  type: "Feature";
  geometry: GeoJsonGeometry | null;
  /** Varie selon la couche : {id, nom, farm_id} pour "parcelles",
   * {id, nom} pour "points_interet". */
  properties: Record<string, unknown>;
}

export interface VectorFeatureCollection {
  type: "FeatureCollection";
  features: VectorFeature[];
}