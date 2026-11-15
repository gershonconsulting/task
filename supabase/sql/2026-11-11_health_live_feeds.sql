-- Client Platform Matrix (health.gershon.ai): switch the last 5 columns to their live feeds.
-- Columns: client, publish, socialtracking, events, icp.
-- NOT APPLIED. Run in the task project (ggudrgzqleunhaiegyce) SQL editor.
--
-- SUPERSEDES blocks 5-7 of 2026-10-27_matrix_live_endpoints.sql (client, publish,
-- socialtracking; never run) and blocks 8-9 of open PR #11 (events, icp). Same endpoints,
-- same values; #11 can be closed without merging once this PR is merged.
--
-- How the matrix uses a column (supabase/functions/client-platform-matrix/index.ts, v5.1):
--   * it reads only rows with active = true (order by sort);
--   * when endpoint is set it POSTs {"secret": <matrix_stats_secret>, "people": [...]} to it
--     and expects 200 {"ok":true,"results":[{"key","ok","note"}]}; the column then shows LIVE;
--   * source = 'pending' marks the column "not connected yet" (grey dashes).
-- Secret: by NAME only. cc_health_config.matrix_stats_secret holds the plain value; each app
-- stores only its SHA-256 (7031a38b...77569) in code. No secret value is in this file.
--
-- Every block is idempotent (sets fixed values; running it twice changes nothing).
-- Run a block ONLY after its endpoint answers 401 {"ok":false} to a wrong secret and 200 to
-- the right one (see docs/health-live-feeds.md). Blocks are independent: run them one by one.

-- 0) Pre-check (read-only): the 5 rows must exist. Expect 5 rows, today source = 'pending',
--    active = false, endpoint = null.
select key, label, source, active, endpoint, sort
  from client_platform_columns
 where key in ('client', 'publish', 'socialtracking', 'events', 'icp')
 order by sort;

-- 1) Client (client.gershoncrm.com, KV COMPANIES_KV, client numbers).
--    Endpoint: gershonconsulting/client PR #6 (open). Client deploys on merge to main.
update client_platform_columns
   set endpoint = 'https://client.gershoncrm.com/api/matrix-stats', source = 'live', active = true
 where key = 'client';

-- 2) Publish (publish.gershon.ai, Neon ScheduledPost).
--    Endpoint: on publish main since v0.11.1 (PR #10); live build is v0.18.0 (deployed 2026-11-10).
update client_platform_columns
   set endpoint = 'https://publish.gershon.ai/api/matrix-stats', source = 'live', active = true
 where key = 'publish';

-- 3) Social Tracking (socialtracking.gershon.ai, Neon attainment).
--    Endpoint: on socialtracking main (PR #2, merged 2026-11-09). Deploy = social repo,
--    branch deploy/socialtracking. Check the 401 first: the merge may not be deployed yet.
update client_platform_columns
   set endpoint = 'https://socialtracking.gershon.ai/api/matrix-stats', source = 'live', active = true
 where key = 'socialtracking';

-- 4) Events (events.gershon.ai, KV STORE, clients + graded events).
--    Endpoint: gershonconsulting/events-gershon-ai PR #3 (open). Push to main deploys
--    (Workers Builds).
update client_platform_columns
   set endpoint = 'https://events.gershon.ai/api/matrix-stats', source = 'live', active = true
 where key = 'events';

-- 5) ICP (icp.gershon.ai, KV STORE, saved 12-point reports).
--    Endpoint: on ICP main since v1.6.0 (PR #2); live build is v1.8.0 (deployed 2026-11-10).
update client_platform_columns
   set endpoint = 'https://icp.gershon.ai/api/matrix-stats', source = 'live', active = true
 where key = 'icp';

-- 6) Post-check (read-only): every block you ran shows source = 'live', active = true.
select key, label, source, active, endpoint
  from client_platform_columns
 where key in ('client', 'publish', 'socialtracking', 'events', 'icp')
 order by sort;

-- ROLLBACK (one column back to hidden, exactly as before this file):
-- update client_platform_columns set endpoint = null, source = 'pending', active = false where key = '<key>';
-- ROLLBACK (all 5):
-- update client_platform_columns set endpoint = null, source = 'pending', active = false
--  where key in ('client', 'publish', 'socialtracking', 'events', 'icp');
