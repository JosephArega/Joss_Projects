import { LatLng } from '../types';
import { haversineKm } from '../lib/geo';

/** Meskel Square — default map center. */
export const ADDIS_CENTER: LatLng = { latitude: 9.0107, longitude: 38.7613 };

export const ADDIS_REGION = {
  ...ADDIS_CENTER,
  latitudeDelta: 0.09,
  longitudeDelta: 0.09,
};

export interface Place {
  name: string;
  nameAm: string;
  subCity: string;
  lat: number;
  lng: number;
}

/** Addis Ababa's 11 sub-cities (ክፍለ ከተማ). */
export const SUB_CITIES: { en: string; am: string }[] = [
  { en: 'Addis Ketema', am: 'አዲስ ከተማ' },
  { en: 'Akaki Kality', am: 'አቃቂ ቃሊቲ' },
  { en: 'Arada', am: 'አራዳ' },
  { en: 'Bole', am: 'ቦሌ' },
  { en: 'Gullele', am: 'ጉለሌ' },
  { en: 'Kirkos', am: 'ቂርቆስ' },
  { en: 'Kolfe Keranio', am: 'ኮልፌ ቀራንዮ' },
  { en: 'Lideta', am: 'ልደታ' },
  { en: 'Nifas Silk-Lafto', am: 'ንፋስ ስልክ ላፍቶ' },
  { en: 'Yeka', am: 'የካ' },
  { en: 'Lemi Kura', am: 'ለሚ ኩራ' },
];

/**
 * Well-known driver landmarks/neighborhoods with approximate coordinates.
 * Used for tip geotags, route destinations, and auto-labelling reports.
 */
export const PLACES: Place[] = [
  { name: 'Bole Medhanealem', nameAm: 'ቦሌ መድኃኔዓለም', subCity: 'Bole', lat: 9.0086, lng: 38.7869 },
  { name: 'Bole Airport', nameAm: 'ቦሌ አየር ማረፊያ', subCity: 'Bole', lat: 8.9806, lng: 38.7998 },
  { name: 'Kazanchis', nameAm: 'ካዛንቺስ', subCity: 'Kirkos', lat: 9.0157, lng: 38.769 },
  { name: 'Merkato', nameAm: 'መርካቶ', subCity: 'Addis Ketema', lat: 9.035, lng: 38.739 },
  { name: 'Piassa', nameAm: 'ፒያሳ', subCity: 'Arada', lat: 9.0345, lng: 38.75 },
  { name: 'CMC', nameAm: 'ሲኤምሲ', subCity: 'Yeka', lat: 9.0179, lng: 38.8319 },
  { name: 'Megenagna', nameAm: 'መገናኛ', subCity: 'Yeka', lat: 9.0204, lng: 38.8016 },
  { name: 'Mexico', nameAm: 'ሜክሲኮ', subCity: 'Lideta', lat: 9.0107, lng: 38.744 },
  { name: 'Meskel Square', nameAm: 'መስቀል አደባባይ', subCity: 'Kirkos', lat: 9.0107, lng: 38.7613 },
  { name: 'Sarbet', nameAm: 'ሳር ቤት', subCity: 'Nifas Silk-Lafto', lat: 8.996, lng: 38.74 },
  { name: 'Gerji', nameAm: 'ገርጂ', subCity: 'Bole', lat: 8.999, lng: 38.818 },
  { name: 'Ayat', nameAm: 'አያት', subCity: 'Lemi Kura', lat: 9.027, lng: 38.877 },
  { name: 'Summit', nameAm: 'ሰሚት', subCity: 'Bole', lat: 8.996, lng: 38.856 },
  { name: 'Kality', nameAm: 'ቃሊቲ', subCity: 'Akaki Kality', lat: 8.906, lng: 38.756 },
  { name: 'Jemo', nameAm: 'ጀሞ', subCity: 'Kolfe Keranio', lat: 8.949, lng: 38.692 },
  { name: 'Lebu', nameAm: 'ለቡ', subCity: 'Nifas Silk-Lafto', lat: 8.955, lng: 38.708 },
  { name: 'Lideta', nameAm: 'ልደታ', subCity: 'Lideta', lat: 9.011, lng: 38.729 },
  { name: 'Arat Kilo', nameAm: 'አራት ኪሎ', subCity: 'Arada', lat: 9.033, lng: 38.763 },
  { name: 'Sidist Kilo', nameAm: 'ስድስት ኪሎ', subCity: 'Gullele', lat: 9.041, lng: 38.762 },
  { name: 'Shiro Meda', nameAm: 'ሽሮ ሜዳ', subCity: 'Gullele', lat: 9.057, lng: 38.757 },
  { name: 'Saris', nameAm: 'ሳሪስ', subCity: 'Akaki Kality', lat: 8.943, lng: 38.763 },
  { name: 'Gotera', nameAm: 'ጎተራ', subCity: 'Kirkos', lat: 8.977, lng: 38.748 },
  { name: 'Old Airport', nameAm: 'የድሮ አየር ማረፊያ', subCity: 'Nifas Silk-Lafto', lat: 8.988, lng: 38.725 },
  { name: 'Torhailoch', nameAm: 'ጦር ኃይሎች', subCity: 'Kolfe Keranio', lat: 9.008, lng: 38.712 },
  { name: 'Haya Hulet', nameAm: 'ሃያ ሁለት', subCity: 'Bole', lat: 9.013, lng: 38.783 },
  { name: 'Kotebe', nameAm: 'ኮተቤ', subCity: 'Yeka', lat: 9.033, lng: 38.842 },
  { name: 'Asko', nameAm: 'አስኮ', subCity: 'Kolfe Keranio', lat: 9.064, lng: 38.69 },
];

export function nearestNeighborhood(lat: number, lng: number): string {
  let best = PLACES[0];
  let bestKm = Number.POSITIVE_INFINITY;
  for (const p of PLACES) {
    const km = haversineKm(lat, lng, p.lat, p.lng);
    if (km < bestKm) {
      bestKm = km;
      best = p;
    }
  }
  return best.name;
}

export function placeLabel(p: Place, lang: 'en' | 'am'): string {
  return lang === 'am' ? p.nameAm : p.name;
}
