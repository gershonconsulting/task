// HTML for the daily "what happened yesterday" e-mail (GC Task). Pure: no Next / Cloudflare
// imports, so it can be rendered with sample data outside the app (the route passes `base`).
import type { ReportSummary } from './dailyReportSummary'

export type Snapshot = { date: string; run_at: string; tasks_total: number; tasks_done: number; projects_total: number; overdue: number; pct: number }
export type DayCounts = { projectsCreated: number; tasksCreated: number; tasksTouched: number; tasksCompleted: number; clientsAdded: number }
export type Check = { label: string; v: number; p: number; ok: boolean; why: string; href: string }
export type StuckTask = { name: string; owner: string | null; due: string; daysLate: number; project: string | null; href: string }

const RED = '#c0392b'

export function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>]/g, c => (c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'))
}

export function longDate(ymd: string): string {
  return new Date(ymd + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

export function buildEmail(a: {
  base: string
  yYmd: string
  y: DayCounts
  checks: Check[]
  summary: ReportSummary; pct: number; tasksDone: number; tasksTotal: number
  overdue: number; overdueTrend: string
  activeProjects: number; clientsTotal: number; warnings: string[]; daysSinceWrite: number | null
  stuck: StuckTask[]
}): string {
  const link = 'color:#1f6f5c;text-decoration:underline;'
  // Which of the 6 measures did not move, why, and where to fix it.
  const failed = a.checks.filter(c => !c.ok)
  const failedHtml = failed.length
    ? "<div style='background:#ffffff;border-left:5px solid " + RED + ";border-radius:6px;padding:20px 24px;margin-bottom:16px;'>" +
      "<div style='font-size:16px;font-weight:700;color:#12352c;margin-bottom:10px;'>What did not move (" + failed.length + " of " + a.checks.length + ")</div>" +
      "<ol style='margin:0;padding-left:20px;font-size:14px;color:#1a1a1a;line-height:1.6;'>" +
      failed.map(c => "<li><b>" + esc(c.label) + "</b> — " + esc(c.why) + " <a href='" + esc(c.href) + "' style='" + link + "'>Open</a></li>").join('') +
      "</ol></div>"
    : ''
  const stuckHtml = a.stuck.length
    ? "<div style='background:#ffffff;border-radius:6px;padding:20px 24px;margin-bottom:16px;'>" +
      "<div style='font-size:16px;font-weight:700;color:#12352c;margin-bottom:4px;'>Most overdue open tasks — move these next</div>" +
      "<div style='font-size:13px;color:#5b6b66;margin-bottom:10px;'>Showing " + a.stuck.length + " of " + a.overdue + " overdue. Each link opens the task's project.</div>" +
      "<table style='width:100%;border-collapse:collapse;font-size:14px;'>" +
      "<tr style='background:#f0f4f3;'><th align='left' style='padding:8px 10px;color:#12352c;'>Task</th>" +
      "<th align='left' style='padding:8px 10px;color:#12352c;'>Owner</th>" +
      "<th align='right' style='padding:8px 10px;color:#12352c;'>Late</th></tr>" +
      a.stuck.map(s =>
        "<tr><td style='padding:8px 10px;border-bottom:1px solid #e6ebe9;'><a href='" + esc(s.href) + "' style='" + link + "'>" + esc(s.name) + "</a>" +
        (s.project ? "<div style='font-size:12px;color:#8a9995;'>" + esc(s.project) + "</div>" : '') + "</td>" +
        "<td style='padding:8px 10px;border-bottom:1px solid #e6ebe9;'>" + esc(s.owner || 'Unassigned') + "</td>" +
        "<td align='right' style='padding:8px 10px;border-bottom:1px solid #e6ebe9;color:" + RED + ";white-space:nowrap;'>" + s.daysLate + " d</td></tr>").join('') +
      "</table></div>"
    : ''
  const card = 'background:#ffffff;border-left:5px solid #1f6f5c;border-radius:6px;padding:20px 24px;margin-bottom:16px;'
  const rows = a.checks.map(c =>
    "<tr>" +
    "<td style='padding:8px 10px;border-bottom:1px solid #e6ebe9;'>" + esc(c.label) + "</td>" +
    "<td align='center' style='padding:8px 10px;border-bottom:1px solid #e6ebe9;'>" + c.v + "</td>" +
    "<td align='center' style='padding:8px 10px;border-bottom:1px solid #e6ebe9;color:#8a9995;'>" + c.p + "</td>" +
    "<td align='center' style='padding:8px 10px;border-bottom:1px solid #e6ebe9;font-weight:700;color:" + (c.ok ? '#1f6f5c' : RED) + ";'>" + (c.ok ? '&#10003;' : '&#10007;') + "</td>" +
    "</tr>").join('')

  // Banner: red when the system failed; green "did its job" only when nothing is overdue either,
  // so the top of the e-mail never reads better than the overdue tile below it.
  const doneLine = a.y.tasksCompleted + " task(s) completed, " + a.y.tasksCreated + " created, " + a.y.projectsCreated + " new project(s) on " + longDate(a.yYmd) + "."
  const warnHtml = a.warnings.length
    ? "<div style='background:#fdecea;border-left:5px solid " + RED + ";border-radius:6px;padding:18px 24px;margin-bottom:16px;'>" +
      "<div style='font-size:17px;font-weight:700;color:#8e2318;margin-bottom:6px;'>&#9888; BIG WARNING — the system did not do its daily job</div>" +
      "<div style='font-size:14px;color:#5a1c14;line-height:1.55;'>" + a.warnings.map(w => '&bull; ' + w).join('<br>') + "</div></div>"
    : a.overdue > 0
      ? "<div style='background:#ffffff;border-left:5px solid " + RED + ";border-radius:6px;padding:18px 24px;margin-bottom:16px;'>" +
        "<div style='font-size:17px;font-weight:700;color:#8e2318;margin-bottom:6px;'>Work moved, but " + a.overdue + " task(s) are still overdue</div>" +
        "<div style='font-size:14px;color:#1d4a3d;line-height:1.55;'>" + doneLine + "</div></div>"
      : "<div style='background:#eaf6f1;border-left:5px solid #1f6f5c;border-radius:6px;padding:18px 24px;margin-bottom:16px;'>" +
        "<div style='font-size:17px;font-weight:700;color:#14503f;margin-bottom:6px;'>&#10003; The system did its job</div>" +
        "<div style='font-size:14px;color:#1d4a3d;line-height:1.55;'>" + doneLine + "</div></div>"

  // Any overdue task is red, whatever the trend.
  const overdueHtml = a.overdue > 0
    ? "<div style='background:#fdecea;border-left:5px solid " + RED + ";border-radius:6px;padding:18px 24px;margin-bottom:16px;'>" +
      "<div style='font-size:16px;font-weight:700;color:#8e2318;margin-bottom:6px;'>&#10007; " + a.overdue + " overdue task(s)" + (a.overdueTrend ? ' — ' + esc(a.overdueTrend) : '') + "</div>" +
      "<div style='font-size:14px;color:#5a1c14;'>Open tasks whose due date has already passed. Clear or re-date them in the app.</div></div>"
    : ''

  return "<div style='margin:0;padding:24px;background:#f4f6f5;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1a1a1a;'>" +
    "<div style='max-width:640px;margin:0 auto;'>" +
    "<div style='" + card + "'>" +
      "<div style='font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#5b6b66;margin-bottom:6px;'>Daily progress report</div>" +
      "<div style='font-size:22px;font-weight:700;color:#12352c;'>Task — what happened yesterday</div>" +
      "<div style='font-size:14px;color:#5b6b66;margin-top:4px;'>" + longDate(a.yYmd) + " &middot; <b>" + esc(a.summary.headerLine) + "</b></div>" +
    "</div>" +
    warnHtml +
    (a.summary.quietNote ? "<div style='background:#f0f4f3;border-radius:6px;padding:12px 24px;margin-bottom:16px;font-size:14px;color:#5b6b66;'>" + esc(a.summary.quietNote) + "</div>" : '') +
    "<div style='background:#ffffff;border-radius:6px;padding:20px 24px;margin-bottom:16px;'>" +
      "<div style='font-size:16px;font-weight:700;color:#12352c;margin-bottom:12px;'>Progress score: " + a.summary.score + " / " + a.summary.max + "</div>" +
      "<table style='width:100%;border-collapse:collapse;font-size:14px;'>" +
      "<tr style='background:#f0f4f3;'><th align='left' style='padding:8px 10px;color:#12352c;'>Measure</th>" +
      "<th align='center' style='padding:8px 10px;color:#12352c;'>Yesterday</th>" +
      "<th align='center' style='padding:8px 10px;color:#12352c;'>Previous</th>" +
      "<th align='center' style='padding:8px 10px;color:#12352c;'>&nbsp;</th></tr>" + rows + "</table>" +
    "</div>" +
    failedHtml +
    overdueHtml +
    stuckHtml +
    "<div style='background:#ffffff;border-radius:6px;padding:20px 24px;margin-bottom:16px;'>" +
      "<div style='font-size:16px;font-weight:700;color:#12352c;margin-bottom:10px;'>Where the app stands today</div>" +
      "<table style='width:100%;border-collapse:collapse;font-size:14px;'>" +
      "<tr><td style='padding:6px 0;color:#5b6b66;width:52%;'>Overall completion</td><td style='padding:6px 0;'><b>" + a.pct + "%</b> — " + a.tasksDone + "/" + a.tasksTotal + " tasks done</td></tr>" +
      "<tr><td style='padding:6px 0;color:#5b6b66;'>Active projects</td><td style='padding:6px 0;'>" + a.activeProjects + "</td></tr>" +
      "<tr><td style='padding:6px 0;color:#5b6b66;'>Clients</td><td style='padding:6px 0;'>" + a.clientsTotal + "</td></tr>" +
      "<tr><td style='padding:6px 0;color:#5b6b66;'>Overdue tasks</td><td style='padding:6px 0;" + (a.overdue > 0 ? 'color:' + RED + ';font-weight:700;' : '') + "'>" + a.overdue + "</td></tr>" +
      "<tr><td style='padding:6px 0;color:#5b6b66;'>Last change of any kind</td><td style='padding:6px 0;'>" + (a.daysSinceWrite === null ? 'never' : a.daysSinceWrite === 0 ? 'today' : a.daysSinceWrite + ' day(s) ago') + "</td></tr>" +
      "</table>" +
    "</div>" +
    "<div style='text-align:center;font-size:12px;color:#8a9995;padding:8px 0 0;'>Automated daily report &middot; generated by Task by Gershon.AI &middot; <a href='" + a.base + "/dashboard' style='color:#1f6f5c;'>Open the dashboard</a></div>" +
    "</div></div>"
}
