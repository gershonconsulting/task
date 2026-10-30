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

-- 4) Client / Publish / Social Tracking / Events / ICP stay active = false until each app
--    ships the same endpoint. Then, per app:
-- update client_platform_columns set endpoint = 'https://<host>/api/matrix-stats', source = 'live', active = true where key = '<key>';

-- ROLLBACK (any column): update client_platform_columns set endpoint = null, source = 'manual' where key = '<key>';
