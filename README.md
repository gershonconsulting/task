# GershonCRM Task Manager

Task management web app — **live at [task.gershoncrm.com](https://task.gershoncrm.com)**.

---

## Current Status (v0.4.0) — Last updated June 2026

### ✅ What works right now

The app is **fully deployed and functional** on Cloudflare Pages. The login system has been simplified to a **3-person picker** (no passwords, no OAuth):

- Pick who you are → you land on **/projects**
- Create projects, add tasks, update statuses
- All three users can do everything (no role restrictions for now)
- A "Switch user" link in the header lets you change persona

**Live users:**
| Name | Role |
|---|---|
| Olivier Attia | Admin |
| Winnie Lauren | Team |
| Aina Rama | Team |

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router), TypeScript |
| Styling | Tailwind CSS |
| Session | iron-session (edge-compatible cookie) |
| Database | Supabase (Postgres) — projects + tasks |
| Hosting | Cloudflare Pages (edge runtime) |
| CI/CD | GitHub Actions → wrangler deploy on push to `main` |

---

## Architecture

```
src/
  app/
    login/page.tsx          ← 3-person picker UI (no password)
    page.tsx                ← redirects → /projects
    projects/
      page.tsx              ← project list (no auth gate)
      new/page.tsx          ← new project form (no auth gate)
      [id]/
        page.tsx            ← project detail + tasks (no auth gate)
        actions.ts          ← server actions for tasks (no auth checks)
    api/
      auth/login/route.ts   ← POST { person } → sets iron-session cookie
      projects/route.ts     ← GET/POST projects (no auth gate)
    settings/page.tsx       ← stub, redirects → /projects
  components/
    AppHeader.tsx           ← shows current user name + Switch user link
  lib/
    session.ts              ← iron-session config (edge-safe cookie options)
    supabase.ts             ← Supabase client
```

---

## Local Development

```bash
cp .env.local.example .env.local   # fill in values (see below)
npm install
npm run dev                         # http://localhost:3000
```

### Required env vars

| Variable | Description |
|---|---|
| `SESSION_SECRET` | 32+ random chars (iron-session signing key) |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key (server-only) |
| `NEXT_PUBLIC_BASE_URL` | `https://task.gershoncrm.com` (or `http://localhost:3000` locally) |

---

## Deploy

Push to `main` → GitHub Actions runs **Deploy to Cloudflare Pages** (wrangler).

All env vars above must be set as **Cloudflare Pages environment variables** (Settings → Environment variables on the `gershon-task` project in dash.cloudflare.com).

> ⚠️ **Do NOT commit `SESSION_SECRET` or `SUPABASE_SERVICE_ROLE_KEY` to the repo.**

---

## Changelog

### v0.4.0 — June 2026 (current)

- **Replaced all authentication with a 3-person picker** — no passwords, no OAuth, no registration gates
- Removed LinkedIn OAuth routes and email/password login form entirely
- All project/task pages open to all three personas without auth checks
- Fixed iron-session cookie options (`path: '/', httpOnly: true, sameSite: 'lax', maxAge: 30d`) — previously scoped only to `/api/auth/`, which kicked users back to login when navigating to `/projects/new`
- Header updated: "Switch user" link replaces Settings / Sign out
- Settings page stubbed out (redirects to /projects)

### v0.3.x — June 2026

- Introduced iron-session email+password login (replaced broken LinkedIn OAuth buttons)
- Added bootstrap admin escape hatch (`ADMIN_EMAILS` / `ADMIN_PASSWORD` env vars)
- Shipped Settings page skeleton with change-password form

### v0.2.0 — Earlier 2026

- Initial LinkedIn OIDC authentication
- Supabase schema: `projects` + `tasks` tables
- Basic project list and task CRUD

---

## Known Issues / Tech Debt

- Dead routes: `/api/auth/linkedin/*` routes still exist in the codebase but are unreachable — safe to delete
- No real access control yet — everyone can see and edit everything
- No user-specific task assignment (tasks are not tied to a session user)
- `ADMIN_EMAILS` / `ADMIN_PASSWORD` env vars are no longer used but harmless to leave

---

## Roadmap / Next Handoff Items

### Track A — Admin user management (next priority)
- `/admin/users` page so Olivier can manage real DB users
- Promote personas to real Supabase auth users when ready

### Track B — UX polish
- Task assignment to specific team members
- Status filtering + sorting on project list
- Sidebar navigation

### Track C — Reporting
- Weekly status digest / report view

---

*Maintained by the Gershon Consulting dev team. Questions → ping Olivier.*
