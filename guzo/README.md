# ጉዞ (Guzo)

**Community-driven real-time traffic intelligence for drivers in Addis
Ababa** — a hyperlocal Waze built for Addis roads, culture, and
connectivity. Drivers share live reports (traffic, checkpoints,
potholes, floods, accidents, fuel queues, shortcuts), verify each
other's reports, and get route advisories — anonymously, in Amharic or
English.

| | |
|---|---|
| Frontend | React Native (Expo SDK 51, TypeScript) |
| Map | `react-native-maps` + OpenStreetMap tiles (CartoDB dark variant) |
| Backend | Supabase — Postgres + PostGIS, RPCs, Realtime, Edge Functions |
| Push | Expo Notifications (foreground local + server push) |
| Offline | AsyncStorage cache of last-known reports/tips |

## Quick start

```bash
cd guzo
npm install
npm start          # Expo dev server → scan QR with Expo Go
```

**Demo mode:** with no `.env`, the app runs fully against bundled sample
data (reports around Megenagna, Bole, Mexico…), so every screen works
immediately.

**Live mode:**

1. Create a Supabase project, then run `supabase/schema.sql` (and
   optionally `supabase/seed.sql`) in the SQL editor.
2. `cp .env.example .env` and fill in `EXPO_PUBLIC_SUPABASE_URL` +
   `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
3. For background push: deploy the edge function
   (`supabase functions deploy notify-nearby`), add a Database Webhook
   on INSERT into `reports` pointing at it, and set an EAS `projectId`
   in `app.json`.

## Component structure

```
guzo/
├── App.tsx                      # providers + bottom-tab navigation
├── src/
│   ├── screens/
│   │   ├── HomeMapScreen.tsx    # live map, filter chips, FAB, verify card
│   │   ├── TipsScreen.tsx       # tips feed + neighborhood filter + composer
│   │   ├── RouteScreen.tsx      # "Where are you going?" advisory
│   │   └── SettingsScreen.tsx   # language/calendar/alerts/profile
│   ├── components/
│   │   ├── ReportSheet.tsx      # bottom-sheet quick-tap report panel
│   │   ├── ReportMarker.tsx     # color-coded map pin (amber ring = verified)
│   │   ├── ReportDetailCard.tsx # confirm ("still there") / dismiss ("gone")
│   │   ├── TipCard.tsx          # tip + geotag + upvote
│   │   └── Chip.tsx             # filter/selector pill
│   ├── hooks/
│   │   ├── useReports.ts        # fetch + realtime + auto-fade + submit/vote
│   │   ├── useTips.ts           # tips feed + post/upvote
│   │   └── useLocation.ts       # foreground GPS
│   ├── state/SettingsContext.tsx# persisted app settings
│   ├── i18n/                    # en.json / am.json + tiny translate()
│   ├── lib/
│   │   ├── supabase.ts          # client (null ⇒ demo mode)
│   │   ├── identity.ts          # anonymous per-install device key
│   │   ├── notifications.ts     # permissions, proximity alerts, push reg
│   │   ├── offlineCache.ts      # AsyncStorage report/tip cache
│   │   ├── ethiopianDate.ts     # Gregorian → Ethiopian calendar
│   │   ├── geo.ts               # haversine + corridor distance
│   │   └── time.ts              # localized relative time
│   ├── constants/               # report types, Addis places, sample data
│   └── types.ts
├── supabase/
│   ├── schema.sql               # tables, triggers, RLS, RPCs (PostGIS)
│   ├── seed.sql                 # demo rows
│   └── functions/notify-nearby/ # push edge function
├── docs/
│   ├── UI_MOCKUPS.md            # screen-by-screen mockups (+ mockups.html)
│   ├── API.md                   # endpoint list
│   └── ROADMAP.md               # MVP vs V2
└── assets/icon.svg              # steering wheel + Ethiopian star
```

## Key behaviors

- **Community verification** — a report with 3+ "still there" votes
  becomes *high priority* (amber ring, `verify.highPriority` badge);
  3+ "gone" votes (majority) hides it. Each confirmation extends its
  life by 20 minutes.
- **Auto-fade** — reports expire 30 minutes after creation; the client
  sweeps every 30 s and a pg_cron job marks rows `expired`.
- **Anonymous-first** — a random UUID minted on first launch scopes
  rate limits and vote dedupe; no login, ever, for basic use.
- **Localization** — every string lives in `src/i18n/{en,am}.json`
  (the Amharic file doubles as the i18n template); one-tap EN ⇄ አማ
  toggle on the map header; Ethiopian calendar (ዓ.ም.) date option.

## Docs

- [UI mockups](docs/UI_MOCKUPS.md) · [API endpoints](docs/API.md) ·
  [MVP vs V2 roadmap](docs/ROADMAP.md)
