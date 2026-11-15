# Health: switch on the last 5 live feeds of the Client Platform Matrix

health.gershon.ai/matrix shows Client, Publish, Social Tracking, Events and ICP as not connected.
The matrix data comes from the task edge function `client-platform-matrix` (v5.1), which calls each
column's `endpoint`. These 5 rows in `client_platform_columns` are `source = 'pending'`,
`active = false`, no endpoint. SQL: `supabase/sql/2026-11-11_health_live_feeds.sql` (one block
per column). It supersedes blocks 5-7 of `2026-10-27_matrix_live_endpoints.sql` and PR #11.

Executors: **Ariel** = merges and deploys. **Charles** = Supabase / Cloudflare dashboards.
Secrets are named, never written down: `cc_health_config.matrix_stats_secret` (what the matrix
sends to the apps) and `cc_health_config.matrix_cron_secret` (what calls the matrix function).

## State on 2026-11-11

| Column | Endpoint | Where the code is | Deployed? |
|---|---|---|---|
| client | client.gershoncrm.com/api/matrix-stats | client PR #6 (open, merges clean) | no |
| publish | publish.gershon.ai/api/matrix-stats | publish main (v0.11.1+) | yes, v0.18.0 live 2026-11-10 |
| socialtracking | socialtracking.gershon.ai/api/matrix-stats | socialtracking main (PR #2, merged 2026-11-09) | not confirmed |
| events | events.gershon.ai/api/matrix-stats | events-gershon-ai PR #3 (open, merges clean) | no |
| icp | icp.gershon.ai/api/matrix-stats | ICP main (v1.6.0+) | yes, v1.8.0 live 2026-11-10 |

All five use the same auth: body `secret` (or `Authorization: Bearer`), SHA-256 compared with
`7031a38b...77569` in code; wrong secret -> `401 {"ok":false}`.

## Order

1. **Ariel** – merge client PR #6 (deploys on merge to main).
2. **Ariel** – merge events-gershon-ai PR #3 (push to main deploys via Workers Builds).
   **Charles** – Workers Builds shows "failure" on events main today (also before #3); open the
   build log in the Cloudflare dashboard and confirm the deploy actually went out.
3. **Ariel** – deploy socialtracking main if not live yet (empty commit on the social repo,
   branch `deploy/socialtracking`). Olivier's OK is needed for this deploy, as for every deploy.
4. For each column, check the endpoint (step "Verify" below). Only then:
5. **Charles** – in the task project SQL editor, run block 0 (pre-check), then the block of each
   column that passed, then block 6 (post-check). Columns that did not pass stay pending.
6. **Charles** – run the matrix data call once and check the column is live (below).
7. Open health.gershon.ai/matrix: the 5 columns show LIVE.

## Verify (per endpoint, before its SQL block)

Bad secret must be refused:

```
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://<host>/api/matrix-stats \
  -H "Content-Type: application/json" -d '{"secret":"wrong","people":[]}'
# expect 401
```

Right secret must answer (value of `cc_health_config.matrix_stats_secret`, read in the dashboard,
never pasted into code, a ticket or a chat):

```
curl -s -X POST https://<host>/api/matrix-stats -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MATRIX_STATS_SECRET" -d '{"people":[]}'
# expect 200 {"ok":true,"platform":"<key>","as_of":"...","results":[]}
```

## After the SQL

`POST https://ggudrgzqleunhaiegyce.supabase.co/functions/v1/client-platform-matrix` with
`{"secret": $MATRIX_CRON_SECRET, "format": "json"}` (read-only, sends nothing):
- `columns[]` lists the 5 keys with `live: true`, `pending: false`;
- `live_errors` has no entry for them.
If a column is listed in `live_errors`, run its ROLLBACK line (bottom of the SQL file) and recheck
its endpoint.
