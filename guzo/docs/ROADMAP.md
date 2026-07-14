# ጉዞ (Guzo) — MVP vs V2 Roadmap

## MVP (this codebase)

**Goal: useful on day one in Addis with zero accounts and weak connectivity.**

- ✅ Live map centered on Addis Ababa (OSM tiles, dark tile option)
- ✅ 8 quick-tap report types via bottom-sheet panel (2 taps to report)
- ✅ Report at GPS position or long-press anywhere on the map
- ✅ Community verification: confirm/dismiss, 3+ confirms = high priority
  (amber ring), 3+ dismissals hides the report
- ✅ Auto-fade: 30 min base life, +20 min per confirmation, client +
  server sweeps
- ✅ Tips board geotagged to Addis neighborhoods, with upvotes
- ✅ Route advisory: destination search (EN/አማ), straight-line corridor
  check against active reports
- ✅ Nearby alerts (opt-in): foreground local notifications + server push
  via edge function (2 km default radius)
- ✅ Anonymous posting (per-install device key), optional
  nickname/vehicle profile
- ✅ Amharic ⇄ English toggle everywhere; Ethiopian calendar option
- ✅ Offline cache of last-known reports and tips
- ✅ Per-device rate limits (5 reports / 3 tips per 10 min)

## V2

**Trust & safety**
- Phone-OTP profiles; reputation-weighted verification (trusted drivers
  need fewer confirms)
- Report photos (Supabase Storage) with size caps for slow networks
- Moderation queue + auto-flagging of abusive text; block-list
- Vote weighting by distance (only nearby devices can confirm)

**Navigation**
- Real routing (OSRM / Valhalla on OSM Ethiopia extract) replacing the
  straight-line corridor; turn-by-turn with report-aware rerouting
- Driving mode: fullscreen, voice alerts in Amharic ("በ500 ሜትር ፖሊስ አለ")
- Offline map tiles for Addis (MBTiles bundle)

**Community**
- Neighborhood chat rooms; reply threads on tips
- Weekly "top scout" leaderboard per sub-city; badges
- Minibus/taxi lane intelligence: fares, queue lengths at terminals

**Data & reach**
- Historical heatmaps (rush-hour patterns per corridor)
- SMS/USSD gateway for feature phones (report + query without data)
- Telegram bot mirror of the feed (huge existing driver community)
- City partnership API: anonymized pothole/flood exports for AACRA

**Platform**
- iOS TestFlight + Play Store release via EAS
- Broadcast-channel realtime (drop table-level realtime), report
  clustering at low zoom, battery-aware location updates
