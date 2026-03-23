# Esther Five-Layer Memory System

This is a working Next.js + Supabase + Twilio + OpenAI scaffold for Esther with real five-layer memory handling.

## Layers

1. Live conversation window
2. Rolling summary memory
3. Structured CRM memory
4. Raw transcript archive
5. Orchestration / job routing layer

## What this system does

- Receives inbound Twilio SMS
- Stores raw user / assistant messages
- Builds replies from:
  - short recent turn window
  - rolling summary
  - structured CRM profile
- Returns TwiML fast
- Queues summary and CRM extraction jobs without blocking Twilio
- Processes queued jobs through a separate internal worker endpoint

## Environment variables

Copy `.env.example` to `.env.local` and fill in your own keys.

## Install

```bash
npm install
```

## Run locally

```bash
npm run dev
```

## Deploy

- Push to GitHub
- Connect to Vercel
- Add environment variables in Vercel
- Point Twilio webhook to:
  - `https://YOUR_DOMAIN/api/twilio/incoming-sms`
- Trigger memory worker with Vercel Cron or an external scheduler against:
  - `https://YOUR_DOMAIN/api/internal/process-memory-jobs`
- Add header:
  - `Authorization: Bearer YOUR_INTERNAL_JOB_SECRET`

## Recommended cron frequency

Every minute or every 2 minutes.

## Supabase setup

Run:

- `supabase/001_messages.sql`
- `supabase/002_lead_profiles.sql`
- `supabase/003_conversation_summaries.sql`
- `supabase/004_memory_jobs.sql`

## Design notes

- Twilio reply path stays fast.
- CRM extraction and summary generation are separated from the blocking SMS response.
- Raw transcript is preserved.
- Summary and CRM memory are used as clean reasoning inputs instead of replaying long noisy history.
