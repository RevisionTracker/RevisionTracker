# GCSE Revision Tracker v3 — iPhone-friendly PWA

This mobile-first Progressive Web App can be hosted on GitHub Pages and added to an iPhone Home Screen. Once installed and cached, the planner stores revision data locally and core features work offline. A computer does not need to stay on.

## Included

- Dated weekly navigation; GCSE subjects including separate English Language and English Literature.
- Revision slots, completion tracking, notes, and subject/day minutes.
- Calendar (.ics) export with per-session reminder alerts.
- AI planning prompt built from current/recent revision records, notes, time logs, upcoming assessments, availability and priorities.
- JSON validation and overlap checks before AI-generated sessions are imported.
- Experimental on-device AI using a tiny SmolLM2 model. This can perform poorly and may not run on every iPhone. For better planning quality without separate API fees, use the ChatGPT copy/paste workflow in the AI Planner; normal ChatGPT usage limits apply.
- JSON backup/import.
- Optional Supabase email/password auth and per-user cloud sync.
- Optional Supabase Edge Function scheduler for genuine Web Push notifications.

## Quick start

1. Back up any records in the current app.
2. Upload the **contents** of this folder to the root of the existing GitHub Pages repository; keep `index.html` at the root.
3. Commit and wait for GitHub Pages to deploy.
4. Close/reopen the iPhone Home Screen app while online. If stale files remain, remove and re-add the Home Screen app.
5. Use **AI Planner → Create planning prompt** and copy the prompt into ChatGPT for the best free planning flow.

## Optional cloud features

Login, sync and push are disabled until `supabase-config.js` has a Supabase Project URL and publishable/anon key. The push system also needs VAPID keys, an Edge Function, secrets and a database scheduler. Follow **SETUP_LOGIN_NOTIFICATIONS.md** in order. Never put a secret/service-role key or private VAPID key in the public repository.

## Local storage and backups

Local records are stored in browser storage on the device. Use Data & reminders → Export backup regularly. Browser storage can be erased by clearing website data. Once cloud sync is configured and working, the signed-in user's copy is stored separately in their Supabase account.
