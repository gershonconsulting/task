# GershonCRM Task Manager

Task management app at task.gershoncrm.com with LinkedIn OIDC authentication.

## Stack
- Next.js 14, TypeScript, Tailwind CSS
- iron-session for auth sessions
- LinkedIn OAuth 2.0 / OIDC

## Setup
1. Copy `.env.local.example` → `.env.local` and fill in values
2. `npm install && npm run dev`

## Deploy
Push to `main` → GitHub Actions builds and FTP deploys to Hostinger.
Required secrets: `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`, `FTP_SERVER_DIR`

