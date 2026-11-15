# task (task.gershon.ai) STATUS
Updated 2026-11-15. Version in main: 1.3.4 (package.json); 1.3.5 on branch nightly/2026-11-15-task-daily-wording.

## Done
- v1.3.3 daily report: "last change" measured from the reported day (PR #20)
- v1.3.4 brand red #FE1B04 (dark #d11200, tint #fff5f5) (PR #18, was 1.3.2, renumbered)
- v1.3.5 daily report wording (PR open, not merged): weekend note only when the reported ET day is Sat/Sun; "No task changes yesterday" instead of "Work moved" at 0 activity; score labelled "x/6 measures met"

## Open
- PR #19 (matrix live feeds) and #14 (matrix health cron): contain SQL that must not be run; left open
- Daily email runs as a Supabase function / cron route: if it needs a function deploy it is a manual step
- "Nicky"/"Nicolette Jones" owner alias needs data fix

## Deploy route
Cloudflare Pages Git integration (project gershon-task): merge to main auto-builds.
