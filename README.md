# GershonCRM Task Manager (v0.2.0)

Task management app at task.gershoncrm.com with LinkedIn OIDC authentication.

## Stack

- Next.js 14, TypeScript, Tailwind CSS
- - iron-session for auth sessions
  - - LinkedIn OAuth 2.0 / OIDC
    - - Supabase (Postgres) for projects + tasks
      - - Cloudflare Pages (edge runtime)
       
        - ## Setup
       
        - 1. Copy `.env.local.example` → `.env.local` and fill in values
          2. 2. `npm install && npm run dev`
            
             3. ## Deploy
            
             4. Push to `main` → GitHub Actions builds and deploys to Cloudflare Pages.
             5. Required secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `SESSION_SECRET`, `NEXT_PUBLIC_SITE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
