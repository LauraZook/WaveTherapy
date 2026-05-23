# Wave Therapy / CuraWaves — Customer Onboarding App

## Original Problem Statement
Build a customer onboarding app for the "Wave Therapy" electrotherapy machine. The app asks a health questionnaire to establish health goals and self-health protocols (Health & Wellness, Pain/Inflammation, Detoxification, Immune System Boost, Repair/Recovery, Deep Meditation & Prayer). It generates a personalized 1-day, 1-week, or 30-day program based on deterministic rules and AI. Includes a returning user flow for reassessment after 30 days with automated email reminders, an Admin dashboard, and matches curawaves.com branding.

Live production site: **wavetherapy.ai** (Vercel frontend + Railway backend + MongoDB Atlas).

## Tech Stack
- Frontend: React + Tailwind + Shadcn UI, React Router. Hosted on Vercel.
- Backend: FastAPI + Motor (async MongoDB). Hosted on Railway.
- Database: MongoDB Atlas.
- LLM: Anthropic Claude 3.5 Sonnet (official `anthropic` SDK).
- Email: Resend (`plans@wavetherapy.ai`).
- Domain: `wavetherapy.ai`.

## Core Features (implemented)
- Branded landing page with hero, 5-protocol bento grid, freedom section, machine reference.
- 7-step dynamic questionnaire (Landing → Onboarding → PlanResult).
- AI-generated personalized 1-day / 1-week / 30-day programs with deterministic overrides
  for codes 444 (10m single-channel), 161 (30m weekly single-channel), 646 (90m weekly evening).
- PlanResult page with detail/grid views, downloadable HTML plan, browser print, auto-saving
  personal log/notes, rotating loading banners with ~75s ETA for 30-day generation.
- Resend integration for automatic plan delivery on first generation + manual re-send button.
- Reassessment flow at `/reassess` for returning users after 30 days.
- Admin dashboard at `/admin` gated by token `curawaves-admin-2026`.
- Disclaimer bar + safety notes for autoimmune/severity≥8/pacemaker/pregnancy users.

## Key API Endpoints
- `GET  /api/protocols`
- `POST /api/questionnaire/submit`
- `GET  /api/plan/{plan_id}`
- `GET  /api/plan/{plan_id}/notes`
- `PATCH /api/plan/{plan_id}/notes`
- `POST /api/plan/email`
- `GET  /api/admin/submissions`

## Key Data Model — `plans` collection
`{ plan_id, email, first_name, age, sex, primary_goal, symptoms, pain_location, severity,
   duration, minutes_per_day, preferred_times, has_autoimmune, pregnancy_or_pacemaker,
   program_length, consent_disclaimer, schedule[], notes, created_at, auto_emailed, emailed_at }`
`_id` is excluded from all responses.

## Critical Deployment Note
Local code changes do **NOT** appear at `wavetherapy.ai` until the user clicks
"Save to GitHub" → Vercel/Railway redeploy.

## Recent Changes (CHANGELOG)
### May 2026 — Current session
- Added "Shop Wave Therapy" CTA card on `PlanResult` page → `https://curawaves.com/collections/all`.
- Added "Share your Wave Therapy story" testimonial CTA on `PlanResult` page →
  Google Form `https://docs.google.com/forms/d/e/1FAIpQLSeycdA_QBbIaF91nRzq25MS62uj6pdICuQkhZ2NLcR6HZyKvw/viewform`.
- Mirrored both CTAs into the downloadable HTML plan (`downloadPlan` in `PlanResult.jsx`).
- Updated the 30-day check-in reminder email (`POST /api/admin/send-reminders`) to include
  the testimonial submission link below the "Start re-assessment" button. Re-assessment CTA
  also fixed to point to `wavetherapy.ai/reassess` instead of the curawaves.com home.

### Feb 2026
- Swapped the "Deep Meditation & Prayer" protocol image on Landing to a real
  Unsplash prayer photo (`photo-1762013728549-f50828e8a113`) by Christian Harb.
  File: `/app/frontend/src/lib/api.js`.
- Verified the PlanResult "Plan not found" race-condition fix end-to-end locally:
  POST `/api/questionnaire/submit` → navigate `/plan/{id}` → page renders with
  headline, AI summary, daily tip, sessions, no false toast. Notes fetch now lives
  in its own try/catch so a notes 404 (new plan) never surfaces "Plan not found".
- Auto-save notes PATCH endpoint confirmed working (HTTP 200).

### Earlier in project
- React + FastAPI + MongoDB scaffolded from scratch.
- Anthropic SDK swap (from emergentintegrations → official `anthropic`) for Railway compat.
- Resend integration wired with `plans@wavetherapy.ai` sender.
- Multiple frontend copy/UX tweaks; rotating loading messages with time estimates.
- Live deployment to Vercel + Railway + Atlas with custom domain.

## Backlog / Roadmap
**P1**
- _(done May 2026)_ "Shop Wave Therapy" affiliate CTA on PlanResult page.

**P2**
- Google Analytics / Plausible on wavetherapy.ai for visitor & conversion insights.
- Customer testimonial submission flow at the 30-day mark.   _(May 2026: testimonial link is now shipped on PlanResult page + in the 30-day check-in reminder email. Still pending: in-app testimonial collection / dashboard.)_
- 3-email Resend nurture drip after first plan generation.

## Known Gotchas
- 30-day plan generation can take ~75s. Frontend already shows rotating loading messages.
- Deterministic overrides for codes **444, 161, 646** are strict clinical rules — do not
  modify without explicit user request.
- Real Anthropic + Resend API keys live in `backend/.env`. Never overwrite with dummy values.

## Credentials
- Admin dashboard token: `curawaves-admin-2026`
- See `/app/memory/test_credentials.md`.
