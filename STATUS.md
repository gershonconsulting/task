# task (task.gershon.ai) STATUS
Updated 2026-11-14. Version in main: 1.3.4 (package.json).

## Done
- v1.3.3 daily report: "last change" measured from the reported day (PR #20)
- v1.3.4 brand red #FE1B04 (dark #d11200, tint #fff5f5) (PR #18, was 1.3.2, renumbered)

## Open
- PR #19 (matrix live feeds) and #14 (matrix health cron): contain SQL that must not be run; left open
- Daily email runs as a Supabase function / cron route: if it needs a function deploy it is a manual step
- "Nicky"/"Nicolette Jones" owner alias needs data fix

## Deploy route
Cloudflare Pages Git integration (project gershon-task): merge to main auto-builds.
