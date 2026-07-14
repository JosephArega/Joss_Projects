import { Report, Tip } from '../types';

// Demo-mode data so the app is fully explorable before a backend exists.
const minutesAgo = (m: number) => new Date(Date.now() - m * 60000).toISOString();
const minutesAhead = (m: number) => new Date(Date.now() + m * 60000).toISOString();

export const SAMPLE_REPORTS: Report[] = [
  {
    id: 'demo-1', type: 'traffic', lat: 9.0204, lng: 38.8016,
    note: 'Standstill toward CMC, minibuses turning around',
    neighborhood: 'Megenagna', confirmations: 5, dismissals: 0,
    status: 'high_priority', created_at: minutesAgo(6), expires_at: minutesAhead(24),
    author_nickname: 'AbebeT',
  },
  {
    id: 'demo-2', type: 'police', lat: 9.0009, lng: 38.7902,
    note: 'Checking bolo and seatbelts',
    neighborhood: 'Bole Medhanealem', confirmations: 3, dismissals: 0,
    status: 'high_priority', created_at: minutesAgo(12), expires_at: minutesAhead(18),
  },
  {
    id: 'demo-3', type: 'accident', lat: 9.0107, lng: 38.744,
    note: 'Two cars, right lane blocked near the roundabout',
    neighborhood: 'Mexico', confirmations: 2, dismissals: 0,
    status: 'active', created_at: minutesAgo(4), expires_at: minutesAhead(26),
  },
  {
    id: 'demo-4', type: 'flood', lat: 8.996, lng: 38.74,
    note: 'Deep water after the rain, low cars avoid',
    neighborhood: 'Sarbet', confirmations: 1, dismissals: 0,
    status: 'active', created_at: minutesAgo(9), expires_at: minutesAhead(21),
  },
  {
    id: 'demo-5', type: 'pothole', lat: 9.0179, lng: 38.8319,
    note: 'Big one in the middle lane',
    neighborhood: 'CMC', confirmations: 2, dismissals: 1,
    status: 'active', created_at: minutesAgo(18), expires_at: minutesAhead(12),
  },
  {
    id: 'demo-6', type: 'blocked', lat: 9.0345, lng: 38.75,
    note: 'Road works — one lane only',
    neighborhood: 'Piassa', confirmations: 4, dismissals: 0,
    status: 'high_priority', created_at: minutesAgo(15), expires_at: minutesAhead(15),
  },
  {
    id: 'demo-7', type: 'fuel', lat: 8.943, lng: 38.763,
    note: 'Long queue at Total Saris, ~40 cars',
    neighborhood: 'Saris', confirmations: 1, dismissals: 0,
    status: 'active', created_at: minutesAgo(22), expires_at: minutesAhead(8),
  },
  {
    id: 'demo-8', type: 'tip', lat: 9.035, lng: 38.739,
    note: 'Anbessa Gebeya side street is faster than the main road right now',
    neighborhood: 'Merkato', confirmations: 0, dismissals: 0,
    status: 'active', created_at: minutesAgo(3), expires_at: minutesAhead(27),
  },
];

export const SAMPLE_TIPS: Tip[] = [
  {
    id: 'tip-1',
    body: 'Bole road toward the airport is one-way after 6pm this week because of the summit — use Gerji side.',
    neighborhood: 'Bole Medhanealem', nickname: 'AbebeT', upvotes: 14,
    created_at: minutesAgo(45),
  },
  {
    id: 'tip-2',
    body: 'መገናኛ አካባቢ ከቀኑ 11 ሰዓት በኋላ በጣም ይጨናነቃል — በ ሲኤምሲ በኩል ይሂዱ።',
    neighborhood: 'Megenagna', nickname: 'ሾፌርX', upvotes: 9,
    created_at: minutesAgo(90),
  },
  {
    id: 'tip-3',
    body: 'Parking near Piassa Cathedral is full on Sundays before 9am — Arada Building lot usually has space.',
    neighborhood: 'Piassa', nickname: null, upvotes: 6,
    created_at: minutesAgo(150),
  },
  {
    id: 'tip-4',
    body: 'ቃሊቲ መውጫ ላይ የጭነት መኪኖች ወረፋ አለ — ጠዋት ከ1 ሰዓት በፊት ይለፉ።',
    neighborhood: 'Kality', nickname: 'TruckerB', upvotes: 4,
    created_at: minutesAgo(200),
  },
  {
    id: 'tip-5',
    body: 'New speed bumps on the CMC–Summit road, unpainted and hard to see at night.',
    neighborhood: 'CMC', nickname: null, upvotes: 11,
    created_at: minutesAgo(300),
  },
];
