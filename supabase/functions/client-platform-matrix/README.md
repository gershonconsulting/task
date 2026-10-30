# client-platform-matrix (edge function, task project ggudrgzqleunhaiegyce)

Weekly "Client Platform Matrix" email, Mondays 13:00 UTC (pg_cron job `client-platform-matrix-weekly`).
Deployed v4 was only in Supabase; this folder is now the source of truth (v5).

## Live feed contract (same on every app)
`POST https://<app>/api/matrix-stats`
- body `{"secret":"…","people":[{"key":"1","company":"Valos","emails":["a@valos.it"]}]}`
- auth: the app stores only `sha256(secret)` = `7031a38b…77569`; plain value is
  `cc_health_config.matrix_stats_secret`. Wrong secret -> `401 {"ok":false}`.
- reply `{"ok":true,"platform":"…","as_of":"ISO","results":[{"key","ok","note"}]}` (Social adds `others`).
- A column is live when `client_platform_columns.endpoint` is set. No redeploy needed.

| Column | Feed | State 2026-10-27 |
|---|---|---|
| Radar | radar project RPC `client_platform_stats` | live |
| Linalysis | linalysis.net/api/matrix-stats | live |
| Social | social.gershon.ai/api/matrix-stats | endpoint deployed; set `endpoint` (sql/2026-10-27_matrix_live_endpoints.sql) |
| NexaShare | nexashare.com/api/matrix-stats (D1 nexashare-db) | nexashare PR, then SQL |
| Pulse | pulse.gershoncrm.com/api/matrix-stats (KV PULSE_KV) | pulse PR, then SQL |
| Client, Publish, Social Tracking, Events, ICP | none yet (KV / Neon, not reachable from here) | inactive |

## Test
`POST /functions/v1/client-platform-matrix` with `{"secret":"<CRON_SECRET>","dry":true}` returns the HTML
without sending or writing anything. `testTo` sends to one address and skips the write-back.
