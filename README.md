# AgentPipeline (MVP)

## Where everything goes

### Landing Page
- src/app/page.tsx
- src/components/LeadForm.tsx

### Lead Capture API
- src/app/api/leads/route.ts

### Admin Auth (simple cookie gate)
- src/app/auth/page.tsx
- src/app/api/auth/login/route.ts
- src/app/api/auth/logout/route.ts
- src/middleware.ts (protects /dashboard)

### Dashboard
- src/app/dashboard/page.tsx
- src/components/LeadsTable.tsx

### Supabase
- src/lib/supabase.ts (server + browser client)
- supabase/schema.sql (run in Supabase SQL editor)

### SMS + Email
- src/lib/notify.ts (Twilio + Resend)
- configure in .env.local

## Setup
1) Copy .env.example to .env.local and fill values
2) Run supabase/schema.sql in Supabase
3) npm run dev
