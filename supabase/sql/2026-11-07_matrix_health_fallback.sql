-- 2026-11-07 nightly — Client Platform Matrix: health first, task function as fallback.
-- NOT APPLIED. Prepared for review. Run only after Olivier picks option B (see HANDOFF.txt).
--
-- Today (read from cron.job on 2026-11-07):
--   job 3 client-platform-matrix-weekly, '0 13 * * 1', active
--   -> net.http_post https://health.gershon.ai/api/matrix-report {secret} (secret inline in the job)
--   health then calls functions/v1/client-platform-matrix (v5, deployed 2026-11-03) for data
--   ({format:"json"}) and to relay the send ({html, subject}).
-- pg_net is fire-and-forget: job 3 "succeeded" means only that the request was queued.
-- Nothing checks health's answer, and net._http_response rows are deleted after ~6 h.
--
-- This file:
--   1. keeps job 3 pointed at health, but reads the secret from cc_health_config
--      (no secret in the job text) and records the pg_net request id;
--   2. adds job "client-platform-matrix-fallback" at Monday 13:15 UTC: if health's
--      answer is missing, non-2xx or not {"ok":true}, it calls the task edge function's
--      legacy self-built send ({secret} only -> it builds and sends the e-mail itself).
-- Known trade-off: if health sent the e-mail but answered non-2xx, report@ gets two.

create table if not exists public.matrix_send_log (
  id          bigserial primary key,
  week        text not null,                 -- e.g. 2026-W46 (ISO week, UTC)
  target      text not null,                 -- 'health' | 'task-fallback'
  request_id  bigint,                        -- net.http_post id
  created_at  timestamptz not null default now(),
  checked_at  timestamptz,
  status_code int,
  ok          boolean,
  note        text
);

-- 1. Job 3: same schedule, same target, secret from config, request id logged.
select cron.alter_job(
  job_id  := 3,
  command := $cmd$
    insert into public.matrix_send_log (week, target, request_id)
    select to_char(now() at time zone 'utc', 'IYYY-"W"IW'), 'health',
           net.http_post(
             url := 'https://health.gershon.ai/api/matrix-report',
             headers := '{"Content-Type":"application/json"}'::jsonb,
             body := jsonb_build_object('secret', (select value from public.cc_health_config where key = 'matrix_cron_secret')),
             timeout_milliseconds := 60000
           );
  $cmd$
);

-- 2. Fallback 15 minutes later.
select cron.schedule(
  'client-platform-matrix-fallback',
  '15 13 * * 1',
  $cmd$
    with last as (
      select l.id, l.request_id, r.status_code, r.content, r.timed_out, r.error_msg
      from public.matrix_send_log l
      left join net._http_response r on r.id = l.request_id
      where l.target = 'health'
        and l.week = to_char(now() at time zone 'utc', 'IYYY-"W"IW')
      order by l.id desc limit 1
    ),
    verdict as (
      select id, status_code,
             coalesce(status_code between 200 and 299
                      and coalesce((content::jsonb ->> 'ok')::boolean, false), false) as ok,
             coalesce(error_msg, case when timed_out then 'timed out' end,
                      case when status_code is null then 'no response row' end) as note
      from last
    ),
    upd as (
      update public.matrix_send_log m
         set checked_at = now(), status_code = v.status_code, ok = v.ok, note = v.note
        from verdict v where m.id = v.id
      returning v.ok
    )
    insert into public.matrix_send_log (week, target, request_id, note)
    select to_char(now() at time zone 'utc', 'IYYY-"W"IW'), 'task-fallback',
           net.http_post(
             url := 'https://ggudrgzqleunhaiegyce.supabase.co/functions/v1/client-platform-matrix',
             headers := '{"Content-Type":"application/json"}'::jsonb,
             body := jsonb_build_object('secret', (select value from public.cc_health_config where key = 'matrix_cron_secret')),
             timeout_milliseconds := 60000
           ),
           'health failed or no answer'
    where not coalesce((select ok from upd), false);
  $cmd$
);

-- Read-only check after a Monday run (safe any time):
--   select * from public.matrix_send_log order by id desc limit 5;
