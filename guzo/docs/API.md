# ጉዞ (Guzo) — API Endpoints

Backend is Supabase: PostgREST auto-exposes tables/views, RPCs are
Postgres functions, and realtime rides on the `supabase_realtime`
publication. All endpoints work with the anon key — **no account is
required**; anonymous actors are identified by a random per-install
`device_key` UUID.

Base URL: `https://<project>.supabase.co`

## Reads (REST)

| Method | Path | Purpose |
|---|---|---|
| GET | `/rest/v1/active_reports?select=*&order=created_at.desc` | Live map feed (non-expired, non-dismissed; hides `device_key`) |
| GET | `/rest/v1/tips?select=*&order=created_at.desc&limit=100` | Tips board |
| GET | `/rest/v1/tips?neighborhood=eq.Merkato&order=created_at.desc` | Tips filtered by neighborhood |
| GET | `/rest/v1/profiles?select=nickname,vehicle,reputation` | Public driver profiles |

## RPCs (`POST /rest/v1/rpc/<name>`)

| RPC | Body | Purpose |
|---|---|---|
| `submit_report` | `{p_type, p_lat, p_lng, p_device_key, p_note?, p_neighborhood?}` | File a report. Rate limit: 5 / device / 10 min. Returns the created row. |
| `vote_report` | `{p_report_id, p_voter_key, p_vote}` (`1` confirm / `-1` dismiss) | Community verification. One vote per device per report (re-vote flips). 3+ confirms → `high_priority` (+20 min life each); 3+ dismissals → hidden. |
| `reports_nearby` | `{p_lat, p_lng, p_radius_km?=5}` | Radius query with `distance_m` (PostGIS). |
| `reports_along_route` | `{p_points: [[lat,lng],…], p_corridor_km?=0.7}` | Route advisory: reports within a corridor of the polyline. MVP passes `[origin, destination]`. |
| `post_tip` | `{p_body, p_neighborhood, p_device_key, p_lat?, p_lng?, p_nickname?}` | Post to the tips board. Rate limit: 3 / device / 10 min. |
| `upvote_tip` | `{p_tip_id, p_voter_key}` | Idempotent upvote. |
| `register_device` | `{p_device_key, p_token, p_lat, p_lng, p_enabled, p_radius_km, p_language}` | Opt-in push registration (Expo token + last location). |
| `expire_reports` | — | Housekeeping sweep; scheduled via pg_cron, not called by clients. |

## Realtime (WebSocket)

| Channel | Event | Client behavior |
|---|---|---|
| `postgres_changes` on `public.reports` | INSERT / UPDATE | Merge pin into map; INSERT within alert radius fires a local notification |
| `postgres_changes` on `public.tips` | INSERT | Prepend to tips feed |

## Edge Functions

| Function | Trigger | Purpose |
|---|---|---|
| `notify-nearby` | Database Webhook on INSERT into `reports` | Server-side push: finds opted-in devices within their radius (default 2 km) and sends localized (am/en) Expo push notifications in batches of 100 |

## Auth model

- **Anonymous (default):** no auth at all; `device_key` scopes rate
  limits and vote dedupe.
- **Optional profile:** Supabase auth (anonymous sign-in or phone OTP in
  V2) + a `profiles` row; `submit_report` attaches `auth.uid()` when
  present so confirmed reports earn reputation.
- Writes go only through `security definer` RPCs; tables have no client
  insert/update policies.
