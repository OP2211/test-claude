# ⚽ FanGround.Online

A real-time football fan chat app for matchday banter, predictions, and team sheet discussion.

## Features

- **Chat rooms open 2 hours before kickoff** — and stay open throughout the match
- **Three chat tabs per match:**
  - 🎯 **Predictions** — Vote on the result + scoreline chat
  - 📋 **Team Sheet** — Visual pitch lineup with player discussion
  - 🔥 **Banter** — Cross-fanbase trash talk arena
- **Fan identity** — Every user picks their team; messages are colour-coded by club
- **Real-time** — Pusher Channels for live messaging and reactions
- **Emoji reactions** — React to any message with 6 quick emojis

---

## Deploy to Vercel

### 1. Get Pusher credentials (free, takes 2 minutes)

1. Go to [pusher.com](https://pusher.com) → sign up → **Channels** → **Create app**
2. Name it `matchday-chat`, pick a cluster close to you (e.g. `eu`)
3. Copy your **App ID**, **Key**, **Secret**, and **Cluster**

### 2. Deploy to Vercel

```bash
npm i -g vercel
vercel
```

When prompted, set the following **Environment Variables** in the Vercel dashboard
(`Project → Settings → Environment Variables`):

| Variable | Value |
|---|---|
| `PUSHER_APP_ID` | from Pusher dashboard |
| `PUSHER_KEY` | from Pusher dashboard |
| `PUSHER_SECRET` | from Pusher dashboard |
| `PUSHER_CLUSTER` | e.g. `eu` |
| `REACT_APP_PUSHER_KEY` | same as `PUSHER_KEY` |
| `REACT_APP_PUSHER_CLUSTER` | same as `PUSHER_CLUSTER` |

### 3. Redeploy after adding env vars

```bash
vercel --prod
```

---

## Local Development

### 1. Copy env file and fill in your Pusher credentials

```bash
cp .env.example .env.local
# edit .env.local with your Pusher values
```

### 2. Install dependencies

```bash
npm run install:all
```

### 3. Run with Vercel Dev (recommended — runs API routes locally)

```bash
npm run dev
# Starts Vercel dev server at http://localhost:3000
```

> **Alternative (legacy Socket.io server)**
> The original `server/` directory still works for fully local dev without Pusher:
> ```bash
> npm run dev:legacy
> ```

---

## Tech Stack

| Layer    | Tech                          |
|----------|-------------------------------|
| Hosting  | Vercel (serverless)           |
| Frontend | React 18, CSS custom properties |
| API      | Vercel Serverless Functions (Node.js) |
| Realtime | Pusher Channels               |
| Storage  | In-memory (per warm instance) |

> **Need full persistence?** Add [Vercel KV](https://vercel.com/docs/storage/vercel-kv):
> ```bash
> vercel kv create matchday-chat
> ```
> Then replace the store functions in `api/_lib/store.js` with `@vercel/kv` calls.

---

## Project Structure

```
football-fan-chat/
├── api/                        # Vercel serverless functions
│   ├── _lib/
│   │   ├── data.js             # Match & team data
│   │   ├── store.js            # In-memory message/vote store
│   │   ├── pusher.js           # Pusher server instance
│   │   └── cors.js             # CORS helper
│   ├── matches.js              # GET /api/matches
│   ├── match.js                # GET /api/match?id=
│   ├── messages.js             # GET /api/messages?matchId=&tab=
│   ├── message.js              # POST /api/message
│   ├── vote.js                 # GET|POST /api/vote
│   ├── react.js                # POST /api/react
│   └── package.json
├── client/                     # React app
│   └── src/
│       ├── App.jsx
│       └── components/
│           ├── MatchList.jsx
│           ├── MatchRoom.jsx   # Uses Pusher for real-time
│           ├── Predictions.jsx
│           ├── TeamSheet.jsx
│           ├── ChatPanel.jsx
│           └── OnboardingModal.jsx
├── server/                     # Legacy Socket.io server (local dev only)
├── vercel.json                 # Vercel build & routing config
├── .env.example                # Required environment variables
└── README.md
```
