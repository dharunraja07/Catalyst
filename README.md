# AI-Based Personalized Learning Platform

A mobile-first, fully responsive learning platform (React + Vite + Tailwind on the
frontend, Express + Mongoose on the backend) designed to deploy straight to
**MongoDB Atlas + Vercel (frontend) + Render (backend)**.

## 1. MongoDB Atlas setup (required)

1. Create a free cluster at https://www.mongodb.com/cloud/atlas.
2. Under **Database Access**, create a database user with a username/password.
3. Under **Network Access**, add your IP (or `0.0.0.0/0` while testing — restrict
   this before going fully to production).
4. Click **Connect > Drivers**, copy the connection string. It looks like:
   ```
   mongodb+srv://<username>:<password>@<cluster>.mongodb.net/ai-learning?retryWrites=true&w=majority
   ```
5. This is your `MONGO_URI`. The app always connects to this Atlas cluster
   whenever `MONGO_URI` is set — locally and in production — so your local
   dev environment and your deployment share the same database. (There's no
   MongoDB Compass / local Mongo dependency anymore; the only supported path
   is Atlas. An in-memory fallback exists purely as an optional local-only
   escape hatch — see `server/.env.example`.)

## 2. Local development

1. Copy [server/.env.example](server/.env.example) to `server/.env` and fill in
   `MONGO_URI` (from Atlas above), `JWT_SECRET`, and `GEMINI_API_KEY`.
2. Copy [client/.env.example](client/.env.example) to `client/.env` if you want
   to override the API URL.
3. Install dependencies:
   - `npm install`
   - `cd server && npm install`
   - `cd client && npm install`
4. Start the app: `npm run dev` (runs client + server together).

## 3. Deploy the backend to Render

This repo already includes [render.yaml](render.yaml) for one-click Blueprint deploys.

1. Push this repo to GitHub/GitLab.
2. In Render, choose **New > Blueprint** and point it at the repo (it reads
   `render.yaml` automatically), or create a Web Service manually with:
   - Root directory: `server`
   - Build command: `npm ci`
   - Start command: `npm run start`
   - Health check path: `/health`
3. In the Render dashboard's **Environment** tab, set:
   - `MONGO_URI` — your Atlas connection string
   - `JWT_SECRET` — a long random string
   - `GEMINI_API_KEY` — your Gemini API key
   - `CLIENT_URL` — your Vercel URL once you have it (comma-separate multiple
     origins, e.g. `https://your-app.vercel.app,http://localhost:5173`)
   - `NODE_ENV=production` (already set in render.yaml)
4. Deploy. Render gives you a URL like `https://ai-learning-platform-api.onrender.com`.

## 4. Deploy the frontend to Vercel

This repo already includes [vercel.json](vercel.json).

1. In Vercel, **Import Project** from the same repo.
2. Set the **Root Directory** to `client`.
3. Framework preset: Vite. Build command: `npm run build`. Output dir: `dist`.
4. Add an environment variable:
   - `VITE_API_URL=https://<your-render-service>.onrender.com/api`
5. Deploy. Vercel gives you a URL like `https://your-app.vercel.app`.
6. Go back to Render and set `CLIENT_URL` to that Vercel URL (see step 3
   above), then redeploy the backend so CORS allows requests from it. Any
   `*.vercel.app` preview URL for this project is also allowed automatically.

## 5. Production checklist

- [ ] Atlas cluster created, database user added, IP access configured
- [ ] `MONGO_URI` set on Render (not committed anywhere)
- [ ] `JWT_SECRET` set on Render to a strong random value
- [ ] `GEMINI_API_KEY` set on Render
- [ ] Backend deployed on Render, `/health` returns `{ status: "ok" }`
- [ ] `VITE_API_URL` set on Vercel to the Render backend `/api` URL
- [ ] Frontend deployed on Vercel
- [ ] `CLIENT_URL` on Render updated to the Vercel domain, backend redeployed

## Design

The UI follows a light, card-based mobile app design (greeting header, search
bar, hero banner, "For you" card grid, bottom tab navigation on mobile /
top navigation on desktop) and is fully responsive from small phones up
through desktop breakpoints. Cards use white against a light-grey page
background, with a secondary light-grey tier for nested elements so content
areas stay visually differentiated instead of flat white-on-white.

## Feature notes

- **Settings** (`/settings`): update name, bio, education level, subjects,
  career interests, learning style, daily goal, and upload a profile picture
  (resized client-side, stored as a small inline image — no file storage
  service required).
- **Classroom** (`/classroom`): Google Classroom-style assignments. Teachers
  post assignments (with an optional attachment) and grade submissions;
  students see all assignments, submit text and/or a file, and see grades
  and feedback once graded.
- **Study group materials**: inside a study group, the "Study materials" tab
  lets members upload and view shared files (notes, PDFs, images), stored the
  same disk-free way as assignment attachments.
- **Group chat**: real-time via Socket.IO (no polling/manual refresh needed);
  your own messages are blue, everyone else's are grey.
- **AI chat**: conversation history loads with `.lean()` queries and an index
  on `(user, updatedAt)` for fast retrieval, with a skeleton loading state and
  animated "typing" indicator while a response is generating.
- **Assessment/Practice generation**: shows an animated placeholder while the
  AI is generating questions instead of a static spinner.
- **Dashboard calendar**: shows one month at a time (with your streak) —
  swipe left/right on mobile or use the arrow buttons to change months.

All file/image uploads (avatars, assignment attachments, study materials) are
capped in size and stored as base64 directly in MongoDB, so none of this
depends on persistent disk storage — which keeps it fully compatible with
Render's ephemeral filesystem.
