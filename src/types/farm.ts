export interface Farm {
  id: number;
  name: string;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface FarmPayload {
  name: string;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}