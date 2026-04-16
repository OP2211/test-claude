---
title: Predict: remove chat input + add fanground system messages
date: 2026-04-16
status: approved
---

## Goal

In the match room "Predict" experience:

- Keep the **message feed display** visible.
- Remove the **chat input / sending** UI from Predict (Predict becomes read-only for chat).
- When a user predicts a result (winner or score), emit a **system-style message** that appears in the Predict feed and is attributed to `fanground`, while showing the predicting user’s **name + icon**.

## Non-goals

- Changing banter chat behavior.
- Adding new database tables or new event types.
- Reworking the overall room tab structure.

## Current state (as of today)

- Predict is `TabId = 'predictions'` in `src/components/MatchRoom.tsx`.
- Predict currently renders `VotePicker` + `ChatPanel`, and `ChatPanel` includes the input bar for sending messages via `POST /api/message`.
- "Score Prediction" is currently local-only in `src/components/VotePicker.tsx` (locks in `localStorage`).

## Design

### 1) Predict feed becomes read-only (no input)

- Add an optional `readOnly?: boolean` prop to `ChatPanel`.
- When `readOnly` is true:
  - Do not render the input bar (the bottom composer).
  - Preserve message list rendering, reactions, and “load older” behavior.

In `MatchRoom.tsx`:

- For Predict tab (`activeTab === 'predictions'`), pass `readOnly` to the `ChatPanel` instance(s).
- Banter tab remains unchanged (still allows sending messages).

### 2) `fanground` system messages

We will reuse the existing `/api/message` endpoint and message persistence.

When emitting a system message:

- `userId`: `"fanground"` (constant)
- `username`: the predicting user’s display name (existing `user.username`, trimmed; fallback `"Fan"`)
- `image`: the predicting user’s image (`user.image`)
- `fanTeamId`: the predicting user’s fan team id (`user.fanTeamId`)
- `tab`: `"predictions"`
- `text`: formatted line describing the prediction

This ensures:

- The UI shows the predicting user’s name + icon (because `ChatPanel` uses `msg.username` + `msg.image`).
- The sender is distinct from the user (because `msg.userId !== user.userId`), and remains consistent (`fanground`) for moderation / analytics.

### 3) Triggers and copy

#### A) Who wins?

Trigger: after a successful vote (i.e. after `POST /api/vote` returns OK, and we update local vote state).

Message text:

- Home: `"<name> predicted <HOME_TEAM_SHORTNAME> to win"`
- Away: `"<name> predicted <AWAY_TEAM_SHORTNAME> to win"`
- Draw: `"<name> predicted a draw"`

#### B) Score prediction

Trigger: when the user confirms score lock (current "Confirm" in `ScorePrediction`).

Implementation detail:

- Add an `onScoreLocked(homeGoals: string, awayGoals: string)` callback prop from `VotePicker` up to `MatchRoom`.
- On confirm lock, invoke the callback with digits (strings).

Message text:

- `"<name> predicted <home>-<away>"`

## Error handling / edge cases

- If sending the system message fails, do not block the vote/score lock UX; just log to console.
- If `user.username` is empty, use `"Fan"`.
- Score digits remain single-digit per existing UI constraints.

## Test plan (manual)

- Open a match room.
- In Predict tab:
  - Confirm the message feed is visible.
  - Confirm there is **no input bar** (can’t type/send).
- Click a winner prediction and confirm:
  - A new message appears in Predict feed with the predicting user’s icon and name, but `isOwn` styling does not apply (since `userId = fanground`).
- Lock a score:
  - A new message appears in Predict feed with the user icon/name and `X-X` text.

