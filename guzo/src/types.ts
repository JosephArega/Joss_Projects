export type ReportType =
  | 'traffic'
  | 'police'
  | 'blocked'
  | 'pothole'
  | 'flood'
  | 'accident'
  | 'fuel'
  | 'tip';

export type ReportStatus = 'active' | 'high_priority' | 'dismissed' | 'expired';

export interface Report {
  id: string;
  type: ReportType;
  lat: number;
  lng: number;
  note?: string | null;
  neighborhood?: string | null;
  confirmations: number;
  dismissals: number;
  status: ReportStatus;
  created_at: string;
  expires_at: string;
  author_nickname?: string | null;
}

export interface Tip {
  id: string;
  body: string;
  neighborhood: string;
  lat?: number | null;
  lng?: number | null;
  nickname?: string | null;
  upvotes: number;
  created_at: string;
}

export type VehicleType =
  | 'car'
  | 'minibus'
  | 'taxi'
  | 'truck'
  | 'bajaj'
  | 'motorbike'
  | 'other';

export type Lang = 'en' | 'am';
export type Calendar = 'gc' | 'ec';

export interface Settings {
  lang: Lang;
  calendar: Calendar;
  darkMap: boolean;
  notifyEnabled: boolean;
  notifyRadiusKm: number;
  nickname: string;
  vehicle: VehicleType;
}

export interface LatLng {
  latitude: number;
  longitude: number;
}
