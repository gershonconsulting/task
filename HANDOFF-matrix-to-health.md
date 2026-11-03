# HANDOFF — Client Platform Matrix moves to health.gershon.ai (for Ariel)

Decision (Olivier, 2026-11-02): the weekly Client Platform Matrix email is a feature of **health.gershon.ai**.
Olivier said "go" on 2026-11-02 19:20 ET. The chat session that built this could not deploy (its permission
guard blocks secret-store writes and production deploys), so the four go-live steps below are yours.

## ❌ URGENT — leaked trigger secret
The live `client-platform-matrix` edge function (task project `ggudrgzqleunhaiegyce`, live version 4) accepts the
secret `cpm_3bf7…` (see commit 832c670 on this branch). That commit is in a PUBLIC repo. With it, anyone can make
v4 email the matrix — including client email addresses — to ANY address (`testTo`). Steps 1+2 below close this.

## What is built and tested (14/14 local checks)
- `supabase/functions/client-platform-matrix/index.ts` (this branch) — data engine:
  `format:"json"` returns the computed matrix; `{html, subject}` relays health.gershon.ai's email; legacy email
  kept as fallback; secret read from `cc_health_config.matrix_cron_secret` (never in code); `testTo` only
  `@gershonconsulting.com`.
- `health-gershon-ai/worker.template.js` (this branch) — health.gershon.ai worker with a new **Platform matrix**
  tab (`/matrix`, signed in, read live), `/api/matrix` (signed in), and `/api/matrix-report`
  (POST `{secret, dry?, testTo?}`, builds the email in the health design and relays it). Placeholders:
  `__DATA__`, `__PW_HASH__`, `__SIGN_KEY__`, `__MATRIX_SECRET__`.
- data.json for health is the Project doc `claude/gershon-health/data.json` (health.gershon.ai Project) — client
  data, do NOT commit it to this public repo.

## ❌ Go-live steps, in this order (2→4 back to back; the Monday cron is `0 13 * * 1`)
1. Generate a new secret (e.g. `cpm2_` + 48 hex) and store it:
   `insert into cc_health_config(key,value) values('matrix_cron_secret','<NEW>') on conflict(key) do update set value=excluded.value;`
2. Deploy `client-platform-matrix` from this branch (verify_jwt = false). Old secret now refused.
3. Build health: replace `const DATA = __DATA__;` with data.json, `"__MATRIX_SECRET__"` with `<NEW>`,
   `"__PW_HASH__"` with sha256('gershon-health-v1'+random code), `"__SIGN_KEY__"` with 32 random hex bytes.
   Zip `_worker.js` → Cloudflare Pages project `gershon-health` → Create deployment → Production.
   (New SIGN_KEY signs Olivier out once; his account in AUTH_KV is untouched.)
4. Re-point pg_cron job 3 `client-platform-matrix-weekly`:
   `select cron.alter_job(3, command := $$ select net.http_post(url := 'https://health.gershon.ai/api/matrix-report', headers := '{"Content-Type":"application/json"}'::jsonb, body := '{"secret":"<NEW>"}'::jsonb, timeout_milliseconds := 60000); $$);`

## Verify
- `https://health.gershon.ai/api/health` → `features` includes `matrix-report`.
- POST old secret to the edge function → 401.
- POST `{secret:<NEW>, dry:true}` to `https://health.gershon.ai/api/matrix-report` → HTML "Client Platform Matrix · week of …".
- Signed in, `https://health.gershon.ai/matrix` shows the live table.
- Optional: POST `{secret:<NEW>, testTo:"olivier@gershonconsulting.com"}` for one real test email.
- Then merge this branch into `main`.
