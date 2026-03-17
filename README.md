# ⚽ MatchDay Chat

A real-time football fan chat app for matchday banter, predictions, and team sheet discussion.

## Features

- **Chat rooms open 2 hours before kickoff** — and stay open throughout the match
- **Three chat tabs per match:**
  - 🎯 **Predictions** — Vote on the result + scoreline chat
  - 📋 **Team Sheet** — Visual pitch lineup with player discussion
  - 🔥 **Banter** — Cross-fanbase trash talk arena
- **Fan identity** — Every user picks their team; messages are colour-coded by club
- **Real-time** — Socket.io powers live messaging, reactions, online counts
- **Emoji reactions** — React to any message with 6 quick emojis
- **Live match support** — LIVE badge + persistent chat for in-progress games

## Getting Started

### 1. Install dependencies

```bash
npm run install:all
```

### 2. Start the server (port 3001)

```bash
npm run dev:server
```

### 3. Start the React client (port 3000)

```bash
npm run dev:client
```

Open [http://localhost:3000](http://localhost:3000)

## Tech Stack

| Layer    | Tech                          |
|----------|-------------------------------|
| Frontend | React 18, CSS custom properties |
| Backend  | Node.js, Express 4            |
| Realtime | Socket.io 4                   |
| Storage  | In-memory (no DB required)    |

## Project Structure

```
football-fan-chat/
├── server/
│   ├── index.js        # Express + Socket.io server, match data, message storage
│   └── package.json
└── client/
    ├── public/
    │   └── index.html
    └── src/
        ├── App.jsx             # Root: routing between match list & room
        ├── components/
        │   ├── MatchList.jsx   # Homepage: all matches with open/locked state
        │   ├── MatchRoom.jsx   # Match chat room with tabs
        │   ├── Predictions.jsx # Vote widget + predictions chat
        │   ├── TeamSheet.jsx   # Visual pitch + squad list
        │   ├── ChatPanel.jsx   # Reusable real-time chat with reactions
        │   └── OnboardingModal.jsx  # Username + team selection
        └── index.css
```

## Chat Room Rules

- Chat opens **2 hours before kickoff**
- Live matches always have chat open
- Messages are capped at 500 characters
- Last 200 messages per tab are kept
