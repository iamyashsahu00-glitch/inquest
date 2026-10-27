# Inquest 2.0: Deployment Guide

Architecture: **Frontend (Vercel)** -> **Backend API (Render)** -> **Gemini API**. The database is SQLite, a file on the backend.

## 0. Before you start
1. Push the project to GitHub (the root `.gitignore` already excludes `.env`, `*.db` and `node_modules`).
2. Get a Gemini API key from https://aistudio.google.com/apikey (optionally a second one as `GEMINI_API_KEY_BACKUP`; the code falls back to it when the quota runs out).

## 1. Backend on Render
1. Render -> **New -> Blueprint** -> pick the repo. `render.yaml` sets everything up.
2. When asked, enter:
   - `GEMINI_API_KEY`: your key
   - `ADMIN_PASSWORD`: a strong password (this is your admin panel login)
   - `CORS_ORIGIN`: leave it as `http://localhost:5173` for now, fix it in step 3
3. After the deploy, open `https://<your-service>.onrender.com/api/health`. You should see `INQUEST backend is alive`.

## 2. Frontend on Vercel
1. Vercel -> **Add New Project** -> same repo.
2. **Root Directory = `inquest-frontend`** (Framework: Vite, auto-detected).
3. Environment variable: `VITE_API_BASE_URL` = `https://<your-service>.onrender.com/api` (include `/api`).
4. Deploy. `vercel.json` already handles SPA routing.

## 3. Connect the two (important)
Render -> inquest-backend -> Environment -> `CORS_ORIGIN` = your Vercel URL (e.g. `https://inquest.vercel.app`, no trailing `/`).
For several domains, separate them with commas. Save, and Render redeploys.

## 4. Smoke test
- Open the Vercel URL, sign up, file a complaint, and check that the AI decision appears.
- Admin panel: sign in, check complaints, audit, analytics.
- ID scan: upload an ID in the admin panel. On Linux this uses Gemini OCR (see notes).

## Notes
- **Data persistence.** Render's free plan has an ephemeral disk. On every restart or deploy the DB goes back to the mock seed data, so new signups and complaints are lost. For real persistence: Starter plan (~$7/mo), uncomment the `disk` block and `DB_PATH=/var/data/inquest.db` in `render.yaml`. For a hackathon demo, free is fine.
- **Cold start.** The free plan sleeps after 15 min idle (first request takes about 30-60s). Before the demo, open the site once, or ping `/api/health` every 10 min with UptimeRobot (free).
- **Apple Vision OCR (`ocr_tool`) is macOS only.** On Render the code automatically falls back to Gemini Vision OCR, so ID verification works. It does one extra AI call, so it can be a bit slower than on your Mac.
- **Gemini quota.** The free tier has daily limits. Set `GEMINI_API_KEY_BACKUP` for a safety net.
- **Camera (ID scan)** needs HTTPS. Vercel provides it.
- **Security.** Never commit `.env`. Rotate your Gemini key if it was ever pushed to GitHub.
