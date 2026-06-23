# GershonCRM — Task Manager

**Live site:** https://task.gershoncrm.com  
**Stack:** Next.js 14 · Supabase · Cloudflare Pages  
**Last updated:** June 2026

---

## What this app does

This is an internal task management system for GershonConsulting. It tracks all client projects and team tasks across every engagement. Every project is created from a template, which auto-populates a list of tasks with assignees, due dates, and tool tags.

---

## Where we stand (for Ariel)

### ✅ Working today

| Feature | URL | Status |
|---------|-----|--------|
| **Dashboard** | /dashboard | Live — shows overall %, client cards with big % numbers, onboarding task list with status toggles, overdue alerts |
| **By Project** | /projects | Live — all projects as cards with progress bars, "+ New Project" button |
| **By Client** | /clients | Live — all tasks grouped by client, shows status per task |
| **Tasks** | /tasks | Live — flat task list, filter by provider (Winnie/Aina/Olivier/Sai) and status, click status to update |
| **Monthly Projects** | /monthly-reports | Live — client × month grid for all 5 monthly templates, ⚡ Generate button |
| **By Tool** | /tools | Live — tasks grouped by tool (Xero, Streak, Chat, etc.) |
| **By Provider** | /users | Live — tasks grouped by team member, click status to update |
| **By Stage** | /stages | Live — kanban board: Pending / In Progress / Done, click arrow to advance |
| **Reports** | /reports | Live — project list with Status Report link per project |
| **Settings** | /settings | Live — manage tools list + edit all project templates (tasks, assignees, due offsets) |
| **New Project** | /projects/new | Live — pick a template, fill in client name + email, tasks auto-created |

---

## Templates

Templates define what tasks get created when a project is started. There are two kinds:

### Onboarding (run once per client, per service)
These are created manually when a new client starts a service:

- **Client Onboarding** — Xero setup, Streak pipeline, Google Doc, email alias (8 tasks)
- **Social Content Creation — Onboarding** — CloudCampaign setup, brand assets, first content batch (7 tasks)
- **Lead Generation — Onboarding** — ICP research, PhantomBuster config, test + launch campaign (8 tasks)
- **Social Selling — Onboarding** — Kular setup, LinkedIn profile optimisation, campaign launch (8 tasks)
- **Staff Onboarding** — new team member intake (11 tasks)
- **Onboarding Partner** — external partner intake, e.g. Kular, Straight-in (9 tasks)

### Monthly Recurring (auto-created on the 1st of every month for all clients)
These 5 project types are automatically generated for every client every month via a Cloudflare cron job:

- **Monthly Report** — data collection, QC, PDF, send to client (13 tasks)
- **Facturation** — draft + issue invoices, reminders (4 tasks)
- **Social Content Creation** — create, approve, publish monthly content on CloudCampaign (5 tasks)
- **Lead Generation** — check campaigns, export leads, qualify, report (5 tasks)
- **Social Selling** — LinkedIn connections, follow-ups, Streak update, monthly report (4 tasks)

The ⚡ Generate button on /monthly-reports manually triggers creation for the current month (useful if the cron missed or for first-time setup).

### One-off / Project-based
- **End of Project** — wind down + final billing
- **Market Research** — 3-version research report with QC and exec summary (24 tasks)

---

## Current clients in the system

| Company | Email | Projects |
|---------|-------|---------|
| Manoeuvre | khoi.truong@manoeuvregroup.com | Client Onboarding (25%) |
| Flying Secoya | charles@flyingsecoya.io | Client Onboarding (0%) |
| Meteor Biotech | amos.lee@meteorbiotech.com | Client Onboarding (25%) |
| PhiTech Bioinformatics | ozge.guney@phitech.bio | Social Content Creation (0%) |
| Urban Factory | melaougri@urban-factory.com | Social Content Creation (0%) |
| Edflex | philippe.riveron@edflex.com | End of Project (20%) |
| Enzymicals AG | david.liese@enzymicals.com | Client Onboarding (50%) |

---

## Team members (providers)

Tasks are assigned to these people:
- **Winnie Lauren** — content, admin, reporting
- **Aina Rama** — lead gen, social selling, strategy
- **Olivier** — invoicing, partner management
- **Sai** — technical setup (email infrastructure, accounts)

---

## Tools tracked

Each task can be tagged with a tool:
Streak · Chat · Calendar · Xero · Owlead · Linalysis · CloudCampaign · PhantomBuster · Kular

---

## What still needs to be done

1. **Generate monthly projects** — Click ⚡ Generate on /monthly-reports to create June 2026 Monthly Report, Facturation, Social Content Creation, Lead Generation, and Social Selling for all 7 clients.

2. **Create onboarding projects for PhiTech, Urban Factory, Edflex** — These clients only have one project each. They need Client Onboarding (and service onboarding projects if applicable).

3. **Assign tasks** — Many tasks show "unassigned". Go to each project and assign them to the right team member.

4. **Complete overdue tasks** — 2+ tasks are overdue (visible in red on dashboard). Update their status.

5. **Monthly cron** — Runs automatically at 6am UTC on the 1st of each month. No action needed after first Generate.

---

## Technical notes

- **No login required** — auth is disabled by design. Default user is Olivier Attia (admin).
- **Switch user** — Click "Switch user" in the sidebar footer → go to Settings to pick a different user.
- **Supabase** — All data lives in Supabase (PostgreSQL). The `tasks.tool` column and `app_settings` table were added via SQL Editor on 23 Jun 2026.
- **Deployment** — Auto-deploys to Cloudflare Pages on every push to `main` via GitHub Actions (~90 seconds).
