# HANDOFF — Client Platform Matrix moves to health.gershon.ai

Decision (Olivier, 2026-11-02): the weekly Client Platform Matrix email is a feature of **health.gershon.ai**.

## ✅ DONE 2026-11-02 ~20:15 ET — nothing left to run
1. ✅ New trigger secret stored in `cc_health_config.matrix_cron_secret` (task project). Never in code.
2. ✅ `client-platform-matrix` edge function v5 deployed from this branch. The old (leaked) secret now returns 401;
   `testTo` is limited to `@gershonconsulting.com`.
3. ✅ health.gershon.ai deployed (Cloudflare Pages `gershon-health`, Production): Platform matrix tab at `/matrix`
   (signed in, read live), `/api/matrix`, `/api/matrix-report`. Verified: dry run renders
   "Client Platform Matrix · week of Nov 2, 2026" from live data (7 clients, 5 platforms, all LIVE).
4. ✅ pg_cron job 3 `client-platform-matrix-weekly` (Mondays 13:00 UTC) now calls
   `https://health.gershon.ai/api/matrix-report`. First email from health.gershon.ai: Monday 2026-11-09, 9:00 ET.

## Source
- Edge function: `supabase/functions/client-platform-matrix/index.ts` (this branch).
- health.gershon.ai worker: `health-gershon-ai/worker.template.js` (this branch) — the master copy lives in the
  health.gershon.ai Project docs (`claude/gershon-health/worker.template.js` + `data.json`). data.json is client
  data — never commit it to this public repo.

## ❌ Still open
- Merge this branch into `main` (needs a reviewer's merge).
