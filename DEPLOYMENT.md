# Deployment Guide — Catalyst (AI-Based Personalized Learning Platform)

This guide covers deploying the project so it works correctly on Vercel, including the
fix for the "404 on page refresh" issue.

## What was fixed in this package

1. **404 on refresh** — `vercel.json` now explicitly tells Vercel where the built app
   lives (`outputDirectory: client/dist`) and rewrites every non-`/api` route to
   `index.html`, so React Router can handle the route client-side instead of Vercel
   looking for a file that doesn't exist on the server.
2. **Root `package.json`** now has `"type": "module"` — required for `api/index.js`
   (which uses `import`) to run correctly as a Vercel serverless function.
3. **`vercel.json` install/build commands** are now explicit (`client` build output,
   dependencies for both `client` and `server` installed) instead of relying on
   Vercel's auto-detection, which was inconsistent across multiple `package.json` files
   in this repo.
4. **Missing `.env.example` files restored** — the old `.gitignore` had `.env.*`, which
   accidentally also ignored `.env.example`. Fixed to `!.env.example` so the example
   files ship with the repo (they're referenced in the README but were missing).
5. Removed a stale/duplicate nested `Catalyst/` folder that was an incomplete older
   copy of the project (not used by anything, just repo clutter that could confuse
   the Vercel root-directory setting).

## Important architecture note: Socket.io + Vercel

Your app uses **Socket.io** for real-time features (live chat, meeting rooms,
participant sync, whiteboard, reactions). Vercel Serverless Functions are
**stateless and short-lived** — they cannot hold persistent WebSocket connections.
This means real-time features will **not work reliably** if the backend runs purely as
a Vercel serverless function (`/api`).

Your repo already includes a `render.yaml`, which tells me the backend was designed to
run on a normal always-on Node host. **Recommended setup:**

| Part | Where | Why |
|---|---|---|
| Frontend (React/Vite build) | **Vercel** | Fast static hosting + CDN, fixes the 404 issue |
| Backend (Express + Socket.io + MongoDB) | **Render** (or Railway/Fly.io) | Long-lived process, full WebSocket support |

The `api/index.js` serverless function is kept in this package and will work for
plain REST calls (login, register, assessments, etc.) if you really want a single-Vercel
deployment, but chat/meet real-time features will be degraded (Socket.io will fall back
to polling or fail to connect properly across serverless invocations). **For full
functionality, use the split deployment below.**

---

## Recommended Deployment: Vercel (frontend) + Render (backend)

### Step 1 — Deploy the backend to Render

1. Push this project to a GitHub repository.
2. Go to [render.com](https://render.com) → **New +** → **Blueprint**, and point it at
   your repo. Render will detect `render.yaml` automatically.
   - Alternatively: **New +** → **Web Service**, root directory = `server`,
     build command = `npm ci`, start command = `npm run start`.
3. In the Render dashboard, set these environment variables (from
   `server/.env.example`):
   - `MONGO_URI` — your MongoDB Atlas connection string
   - `JWT_SECRET` — any long random string
   - `GEMINI_API_KEY` (or `GROQ_API_KEY`) — at least one AI key is required
   - `CLIENT_URL` — your Vercel frontend URL (set this **after** step 2, e.g.
     `https://your-app.vercel.app`)
   - `NODE_ENV=production`
4. Deploy. Note the resulting URL, e.g. `https://ai-learning-platform-api.onrender.com`.
5. In MongoDB Atlas → Network Access, allow access from anywhere (`0.0.0.0/0`), since
   Render's outbound IPs aren't static on the free plan.

### Step 2 — Deploy the frontend to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New** → **Project** → import the
   same GitHub repo.
2. Vercel will read `vercel.json` at the repo root automatically. Leave **Root
   Directory** as the repo root (do **not** set it to `client` — the config already
   points to `client/dist`).
3. Add an environment variable:
   - `VITE_API_URL = https://ai-learning-platform-api.onrender.com/api`
     (use your actual Render URL + `/api`)
   - `VITE_JITSI_DOMAIN = meet.element.io` (or your own Jitsi instance domain)
   - `VITE_GOOGLE_CLIENT_ID` — if you use Google sign-in
4. Click **Deploy**.
5. Once deployed, copy your Vercel URL and go back to Render → update `CLIENT_URL`
   with it, then redeploy the backend so CORS allows requests from your frontend.
   (Note: the server's CORS check already auto-allows any `*.vercel.app` and
   `*.onrender.com` subdomain, so this is a safety net rather than strictly required.)

### Step 3 — Verify

- Visit your Vercel URL, log in, navigate to any inner page (e.g. `/dashboard`), then
  **refresh the browser** — it should load correctly instead of showing a 404.
- Test the meeting room (`/meet`) to confirm the Jitsi call and chat still work,
  since they now talk to the Render backend instead of a Vercel serverless function.

---

## Alternative: Single-Vercel deployment (frontend + serverless API)

Only do this if you're fine with degraded real-time features (chat/meet sync may be
unreliable).

1. Import the repo into Vercel as above. `vercel.json` already routes `/api/*` to
   `api/index.js`.
2. Add all backend environment variables (from `server/.env.example`) directly in the
   Vercel project settings — **Environment Variables** section — since there's no
   separate Render service in this setup.
3. Leave `VITE_API_URL` unset in this mode (the client defaults to same-origin `/api`).
4. Deploy. MongoDB Atlas must still allow `0.0.0.0/0` since Vercel functions don't have
   fixed IPs either.

---

## Environment Variables Reference

### `server/.env` (Render, or Vercel project settings for the single-Vercel option)
See `server/.env.example` for the full list — required: `MONGO_URI`, `JWT_SECRET`,
and at least one of `GEMINI_API_KEY` / `GROQ_API_KEY`.

### `client/.env` (only needed for **local** development; on Vercel, set these as
project environment variables instead)
See `client/.env.example` — `VITE_API_URL`, `VITE_JITSI_DOMAIN`, `VITE_GOOGLE_CLIENT_ID`.

---

## Local development (unchanged)

```bash
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..
cp server/.env.example server/.env   # then fill in real values
cp client/.env.example client/.env   # optional, defaults to /api proxy
npm run dev
```

This starts both the Vite dev server (port 5173) and the Express API (port 4000),
proxied together via `client/vite.config.js`.
