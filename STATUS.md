# task (task.gershon.ai) STATUS
Updated 2026-11-17. Version in main: 1.3.8 (package.json). v1.3.8 = Client Platform Matrix once per report week (function v5.3) + one resend when Resend accepts then fails a Task e-mail.

## Done
- v1.3.8 internal e-mails: matrix function v5.3 (one week label/key "client-matrix-2026-W46", durable marker matrix_last_sent_week, force needs the week id, retry 2s/8s); task daily/Friday e-mails resent once if Resend marks them "failed" (key <key>:retry1), stable keys per day/recipient; scripts/matrix-once-check.ts, scripts/resend-failed-retry-check.ts
- v1.3.7 daily report (PR open, stacked on #22): weekend reported day (ET Sat/Sun) = "Weekend — not scored", all marks neutral, no red; unchanged Completion % = – not ✗ ("x/6 measures met · n unchanged"); subject/header/body share summary.scoreLine; scripts/daily-weekend-check.ts
- v1.3.3 daily report: "last change" measured from the reported day (PR #20)
- v1.3.4 brand red #FE1B04 (dark #d11200, tint #fff5f5) (PR #18, was 1.3.2, renumbered)
- v1.3.6 Resend retry (PR open): 429/5xx/network retried 3x (1s/4s/10s) with the same Idempotency-Key; src/lib/resendSend.ts, scripts/resend-retry-check.ts
- v1.3.5 daily report wording (PR #21, merged): weekend note only when the reported ET day is Sat/Sun; "No task changes yesterday" instead of "Work moved" at 0 activity; score labelled "x/6 measures met"

## Open
- ❌ Overdue row still ✗ when unchanged and > 0 (earlier explicit rule: any overdue is red); change only on Olivier's OK
- ❌ PR #19 (matrix live feeds) and #14 (matrix health cron) merged 2026-11-15 as files only: their SQL (supabase/sql/2026-11-07_matrix_health_fallback.sql, 2026-11-11_health_live_feeds.sql) is NOT applied; running it is a separate step needing Olivier's OK
- Daily email runs as a Supabase function / cron route: if it needs a function deploy it is a manual step
- "Nicky"/"Nicolette Jones" owner alias needs data fix

## Deploy route
Cloudflare Pages Git integration (project gershon-task): merge to main auto-builds.
