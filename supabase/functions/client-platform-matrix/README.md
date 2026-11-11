# client-platform-matrix (edge function, task project ggudrgzqleunhaiegyce)

Weekly "Client Platform Matrix" email, Mondays 13:00 UTC (pg_cron job `client-platform-matrix-weekly`).
Deployed v4 was only in Supabase; this folder is now the source of truth (v5).

**2026-11-07:** `index.ts` here = the deployed v5 (2026-11-03, data engine for health.gershon.ai +
relay send). Body: `{secret, format:"json"}` -> data; `{secret, html, subject, testTo?}` -> relay send
("GC Health"); `{secret, dry?, testTo?}` -> legacy self-built email. Always edit this file, then deploy it.

## Live feed contract (same on every app)
`POST https://<app>/api/matrix-stats`
- body `{"secret":"…","people":[{"key":"1","company":"Valos","emails":["a@valos.it"]}]}`
- auth: the app stores only `sha256(secret)` = `7031a38b…77569`; plain value is
  `cc_health_config.matrix_stats_secret`. Wrong secret -> `401 {"ok":false}`.
- reply `{"ok":true,"platform":"…","as_of":"ISO","results":[{"key","ok","note"}]}` (Social adds `others`).
- Client / Publish / Social Tracking / Events / ICP also accept the secret as `Authorization: Bearer <secret>` (curl tests).
- A column is live when `client_platform_columns.endpoint` is set. No redeploy needed.

| Column | Feed | State 2026-10-27 |
|---|---|---|
| Radar | radar project RPC `client_platform_stats` | live |
| Linalysis | linalysis.net/api/matrix-stats | live |
| Social | social.gershon.ai/api/matrix-stats | endpoint deployed; set `endpoint` (sql/2026-10-27_matrix_live_endpoints.sql) |
| NexaShare | nexashare.com/api/matrix-stats (D1 nexashare-db) | nexashare PR, then SQL |
| Pulse | pulse.gershoncrm.com/api/matrix-stats (KV PULSE_KV) | pulse PR, then SQL |
| Client | client.gershoncrm.com/api/matrix-stats (KV COMPANIES_KV, client numbers) | client PR #6, then sql/2026-11-11_health_live_feeds.sql block 1 |
| Publish | publish.gershon.ai/api/matrix-stats (Neon, ScheduledPost) | on main + live (v0.18.0); block 2 |
| Social Tracking | socialtracking.gershon.ai/api/matrix-stats (Neon, attainment) | on main (PR #2); deploy, then block 3 |
| Events | events.gershon.ai/api/matrix-stats (KV STORE, clients + graded events) | events-gershon-ai PR #3, then block 4 |
| ICP | icp.gershon.ai/api/matrix-stats (KV STORE, saved 12-point reports) | on main + live (v1.8.0); block 5 |

**2026-11-11:** the 5 remaining columns are switched on by `supabase/sql/2026-11-11_health_live_feeds.sql`
(supersedes blocks 5-7 of the 2026-10-27 file and PR #11). Order and checks: `docs/health-live-feeds.md`.

## Test
`POST /functions/v1/client-platform-matrix` with `{"secret":"<CRON_SECRET>","dry":true}` returns the HTML
without sending or writing anything. `testTo` sends to one address and skips the write-back.

## Once per week (v5.1, 2026-11-07, replaces PR #13)
A real send to report@ (relay or legacy) uses the Resend `Idempotency-Key` `client-matrix-<YYYY>-W<ww>` (ISO week, UTC).
A second non-dry send in the same window gets `{"ok":false,"skipped":true}` instead of a second e-mail.
Resend keeps keys for 24 hours, which covers same-day re-runs (the 2026-11-02 duplicate was 5 h apart).
`testTo` sends carry no key; `force:true` deliberately sends again.
