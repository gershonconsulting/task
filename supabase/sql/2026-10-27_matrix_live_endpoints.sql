-- Client Platform Matrix: switch columns to their live /api/matrix-stats feeds.
-- NOT APPLIED. Run in the task project (ggudrgzqleunhaiegyce) SQL editor, one block at a time,
-- only after the matching app endpoint answers. Each block is reversible (see ROLLBACK).
-- Check first: curl -X POST <endpoint> -d '{"secret":"x","people":[]}'  -> must be 401 {"ok":false}

-- 1) Social — endpoint already deployed (social.gershon.ai, verified 401 on a bad secret
--    2026-10-27; its hash matches cc_health_config.matrix_stats_secret). Safe to run now.
update client_platform_columns
   set endpoint = 'https://social.gershon.ai/api/matrix-stats', source = 'live'
 where key = 'social';

-- 2) NexaShare — run AFTER gershonconsulting/nexashare PR (nightly/2026-10-27-matrix-live) is deployed.
update client_platform_columns
   set endpoint = 'https://nexashare.com/api/matrix-stats', source = 'live'
 where key = 'nexashare';

-- 3) Pulse — run AFTER gershonconsulting/pulse PR (nightly/2026-10-27-matrix-live) is deployed.
update client_platform_columns
   set endpoint = 'https://pulse.gershoncrm.com/api/matrix-stats', source = 'live'
 where key = 'pulse';

-- 4) Events / ICP stay active = false until each app ships the same endpoint. Then, per app:
-- update client_platform_columns set endpoint = 'https://<host>/api/matrix-stats', source = 'live', active = true where key = '<key>';

-- 5) Client — run AFTER gershonconsulting/client PR (nightly/2026-10-28-matrix-stats) is merged
--    (client deploys on merge to main). Host: client.gershoncrm.com (the /api/* host other apps call).
update client_platform_columns
   set endpoint = 'https://client.gershoncrm.com/api/matrix-stats', source = 'live', active = true
 where key = 'client';

-- 6) Publish — run AFTER gershonconsulting/publish PR (nightly/2026-10-28-matrix-stats) is deployed
--    (social repo, branch deploy/publish).
update client_platform_columns
   set endpoint = 'https://publish.gershon.ai/api/matrix-stats', source = 'live', active = true
 where key = 'publish';

-- 7) Social Tracking — run AFTER gershonconsulting/socialtracking PR (nightly/2026-10-28-matrix-stats)
--    is deployed (social repo, branch deploy/socialtracking).
update client_platform_columns
   set endpoint = 'https://socialtracking.gershon.ai/api/matrix-stats', source = 'live', active = true
 where key = 'socialtracking';

-- ROLLBACK (any column): update client_platform_columns set endpoint = null, source = 'manual' where key = '<key>';
-- ROLLBACK 5-7 (back to hidden): update client_platform_columns set endpoint = null, source = 'pending', active = false where key in ('client','publish','socialtracking');
