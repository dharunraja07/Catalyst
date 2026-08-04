# Catalyst — Deployment Guide

A complete, from-scratch guide to deploying Catalyst, fixing the "404 on page refresh"
problem, and pushing this package to your GitHub repo.

---

## 1. Project analysis summary

Before writing this guide, the project was fully analysed:

- **Jitsi meeting confirmed present:** `client/src/hooks/useJitsiMeet.js` (Jitsi Meet
  External API integration) and `client/src/pages/MeetRoomPage.jsx` (the meeting room UI
  — video call, chat, whiteboard, reactions, screen share).
- **Client build verified:** `npm run build` in `client/` compiles cleanly (2,486 modules,
  no errors).
- **Server verified:** the Express + Socket.io backend boots cleanly with no import or
  runtime errors, across all backend source files.
- **No new bugs found in this upload** — the application code (client, server, `api/`,
  configs) is unchanged from a prior version that was already reviewed and fixed
  (a missing "Incoming Requests" UI for study-partner requests was fixed previously and
  is confirmed still present and working).
- **Housekeeping done on this package:**
  - Removed `.git/` and all `node_modules/` folders (not needed for deployment, and
    `.git` shouldn't be zipped/shared — see the GitHub section below for how to push
    properly instead).
  - Removed a stale, incomplete duplicate `Catalyst/` folder nested inside the repo
    (leftover partial copy, unused).
  - **Removed `client/.env` and `server/.env`** from this package — your upload included
    real secrets (Mongo connection string, JWT secret, Gemini/Groq API keys, SMTP
    credentials). These are **not included** in the zip you're getting back. Good news:
    I checked your git history and these files were never committed (your `.gitignore`
    is doing its job) — just make sure you keep using your own local `.env` files (or
    re-create them from `.env.example`) rather than committing them anywhere.

---

## 2. The 404-on-refresh fix

**Cause:** your app is a single-page app (React Router, `BrowserRouter`). When you visit
`/dashboard` directly or refresh on it, the browser asks the server for a file at that
path. Vercel's static hosting doesn't know that path is a client-side route unless you
tell it to fall back to `index.html`.

**Fix, already applied in this package** — `vercel.json` at the repo root:

```json
{
  "version": 2,
  "buildCommand": "npm run build --prefix client",
  "installCommand": "npm install --prefix client && npm install --prefix server",
  "outputDirectory": "client/dist",
  "framework": "vite",
  "functions": {
    "api/index.js": { "maxDuration": 30 }
  },
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index.js" },
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ]
}
```

- `outputDirectory` + `buildCommand` tell Vercel exactly where your built app lives
  (`client/dist`), instead of relying on auto-detection across this repo's multiple
  `package.json` files.
- The last rewrite sends every request that isn't `/api/*` to `index.html`, so React
  Router handles the route in the browser. Refreshing on `/dashboard`, `/meet`,
  `/study-group`, etc. now works.

Supporting fixes that make this actually work end-to-end:
- Root `package.json` has `"type": "module"` (needed for `api/index.js`'s `import`
  syntax to run as a Vercel serverless function).
- `installCommand` installs both `client` and `server` dependencies, so the `/api`
  function has everything it needs.
- `.gitignore` excludes `.env` but explicitly keeps `.env.example` (`!.env.example`) so
  your example env files ship with the repo instead of being silently dropped.

---

## 3. Architecture note: Socket.io needs a persistent server

Catalyst uses **Socket.io** for real-time features: live chat, meeting-room sync,
whiteboard, reactions, presence. Vercel Serverless Functions are stateless and
short-lived — they can't hold a persistent WebSocket connection. Running the backend
purely as a Vercel function will make real-time features unreliable.

**Recommended split deployment:**

| Part | Where | Why |
|---|---|---|
| Frontend (built React app) | **Vercel** | Fast static hosting/CDN, fixes the 404 issue |
| Backend (Express + Socket.io + MongoDB) | **Render** | Always-on process, full WebSocket support |

Your repo already includes `render.yaml` for exactly this purpose.

---

## 4. Deploy the backend to Render

1. Push this repo to GitHub (see Section 6 below if you haven't already).
2. Go to [render.com](https://render.com) → **New +** → **Blueprint** → select your repo.
   Render reads `render.yaml` automatically.
   - Or manually: **New +** → **Web Service**, root directory `server`, build command
     `npm ci`, start command `npm run start`.
3. Set environment variables in the Render dashboard (values from your local
   `server/.env`, which you should **never** commit):
   - `MONGO_URI` — MongoDB Atlas connection string
   - `JWT_SECRET` — a long random string
   - `GEMINI_API_KEY` and/or `GROQ_API_KEY` — at least one is required
   - `CLIENT_URL` — your Vercel URL (fill this in after step 5 below)
   - `NODE_ENV=production`
   - Optional: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`,
     `EMAIL_FROM` (for password-reset emails)
4. Deploy, and note the resulting URL, e.g. `https://catalyst-api.onrender.com`.
5. In MongoDB Atlas → Network Access, allow `0.0.0.0/0` (Render's free tier doesn't have
   static outbound IPs).

---

## 5. Deploy the frontend to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New → Project** → import your GitHub repo.
2. Leave **Root Directory** as the repo root — do **not** set it to `client`. The
   `vercel.json` at the root already points to `client/dist` as the output.
3. Add environment variables in the Vercel project settings:
   - `VITE_API_URL` = `https://catalyst-api.onrender.com/api` (your Render URL + `/api`)
   - `VITE_JITSI_DOMAIN` = `meet.element.io` (or your own Jitsi instance)
   - `VITE_GOOGLE_CLIENT_ID` — if you use Google sign-in
4. Click **Deploy**.
5. Copy your new Vercel URL, go back to Render, set `CLIENT_URL` to it, and redeploy the
   backend. (The backend's CORS check already auto-allows any `*.vercel.app` and
   `*.onrender.com` subdomain, so this is a safety net, not strictly required.)

**Verify:** open your Vercel URL, log in, go to any inner page (`/dashboard`,
`/study-group`, `/meet`), and refresh the browser — it should load normally instead of
showing a 404. Then test `/meet` to confirm Jitsi calls and chat work against the Render
backend.

---

## 6. Adding this to your GitHub repo and branch

You mentioned your repo is `dharunraja2007/Catalyst` with branches like `main`, `dharun`,
`mobile`, `develop`, etc. Here's how to bring these changes in cleanly.

### Option A — Replace the contents of an existing branch (e.g. your `dharun` branch)

```bash
# 1. Clone your repo fresh (or cd into your existing local clone)
git clone https://github.com/dharunraja2007/Catalyst.git
cd Catalyst

# 2. Check out the branch you want to update
git checkout dharun
git pull origin dharun

# 3. Unzip the deployment-ready package OVER your existing files
#    (extract Catalyst-deployment-ready.zip contents into this folder, replacing files)
#    On Mac/Linux:
unzip -o /path/to/Catalyst-deployment-ready.zip -d .
#    On Windows (PowerShell):
#    Expand-Archive -Path C:\path\to\Catalyst-deployment-ready.zip -DestinationPath . -Force

# 4. Review what changed
git status
git diff

# 5. Stage, commit, and push
git add .
git commit -m "Fix SPA routing 404 on refresh, add Vercel deployment config"
git push origin dharun
```

### Option B — Create a brand-new branch just for this deployment fix (recommended)

This keeps the change isolated and easy to review/merge via a Pull Request.

```bash
git clone https://github.com/dharunraja2007/Catalyst.git
cd Catalyst
git checkout main
git pull origin main
git checkout -b fix/vercel-deployment

# Extract the zip over the files, replacing them
unzip -o /path/to/Catalyst-deployment-ready.zip -d .

git add .
git commit -m "Fix SPA routing 404 on refresh, add Vercel deployment config"
git push -u origin fix/vercel-deployment
```

Then on GitHub, open a Pull Request from `fix/vercel-deployment` into `main` (or
`dharun`), review the diff, and merge.

### Important: don't commit real secrets

Your `.gitignore` already excludes `.env` files (and keeps `.env.example` tracked). After
pulling this update:

```bash
cp server/.env.example server/.env    # then fill in real values locally
cp client/.env.example client/.env    # optional, for local dev
```

Never run `git add -f .env` or otherwise force-add these files.

---

## 7. Local development

```bash
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..
cp server/.env.example server/.env   # fill in real values
cp client/.env.example client/.env   # optional
npm run dev
```

This runs the Vite dev server (port 5173) and the Express API (port 4000) together,
proxied via `client/vite.config.js`.

---

## 8. Environment variable reference

**`server/.env`** (also set in Render dashboard):
`MONGO_URI`, `JWT_SECRET`, `GEMINI_API_KEY` and/or `GROQ_API_KEY`, `CLIENT_URL`,
`NODE_ENV`, and optionally `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS`/
`SMTP_SECURE`/`EMAIL_FROM`, `MAX_GROUP_MEMBERS`.

**`client/.env`** (also set in Vercel dashboard as `VITE_*` project env vars):
`VITE_API_URL`, `VITE_JITSI_DOMAIN`, `VITE_GOOGLE_CLIENT_ID`.

See `server/.env.example` and `client/.env.example` in this package for the full
templates.
