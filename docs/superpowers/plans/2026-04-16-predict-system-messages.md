# Predict system messages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Predict’s chat read-only while still displaying the feed, and auto-post `fanground` system messages when a user predicts a winner or locks a score.

**Architecture:** Reuse existing persisted chat messages (`POST /api/message`) but add a `readOnly` mode to `ChatPanel` so Predict can render the feed without the composer. Emit system messages by calling the existing message API with `userId: "fanground"` while copying the real user’s `username` + `image` into the message for display.

**Tech Stack:** Next.js App Router, React, TypeScript, Supabase (message persistence), Pusher (realtime).

---

## File structure / units to modify

- Modify: `src/components/ChatPanel.tsx`
  - Add `readOnly?: boolean` prop; hide input bar when read-only.
- Modify: `src/components/MatchRoom.tsx`
  - Render Predict `ChatPanel` as read-only.
  - Add helper to send `fanground` system messages to `tab: "predictions"`.
  - Emit system messages after winner vote and score lock.
- Modify: `src/components/VotePicker.tsx`
  - Thread a new callback `onScoreLocked(homeGoals, awayGoals)` from `MatchRoom`.
  - Call it on score lock confirm.

---

### Task 1: Make `ChatPanel` support read-only mode

**Files:**
- Modify: `src/components/ChatPanel.tsx`

- [ ] **Step 1: Update props to include `readOnly?: boolean`**

Change the props interface:

```ts
interface ChatPanelProps {
  messages: Message[];
  user: User;
  onSendMessage: (text: string) => void;
  onReact: (messageId: string, emoji: string) => void;
  onLoadOlder?: () => void;
  hasMore?: boolean;
  loadingOlder?: boolean;
  placeholder?: string;
  fullHeight?: boolean;
  compact?: boolean;
  readOnly?: boolean;
}
```

- [ ] **Step 2: Ensure `readOnly` defaults to false**

In function params:

```ts
readOnly = false,
```

- [ ] **Step 3: Hide the input composer when `readOnly`**

Wrap the “Input” section:

```tsx
{!readOnly && (
  <div className="cp-input-bar">
    {/* ...existing composer... */}
  </div>
)}
```

- [ ] **Step 4: Verify TypeScript build and lint**

Run:
- `npm run lint`
- `npm run build`

Expected:
- No TypeScript errors related to `ChatPanel` prop changes.

---

### Task 2: Make Predict tab show feed but not allow sending

**Files:**
- Modify: `src/components/MatchRoom.tsx`

- [ ] **Step 1: Pass `readOnly` to Predict `ChatPanel`**

Update both desktop and mobile Predict render paths:

```tsx
<ChatPanel
  messages={messages.predictions}
  user={user}
  onSendMessage={sendMessage}
  onReact={(id: string, emoji: string) => reactToMessage(id, 'predictions', emoji)}
  onLoadOlder={() => { void loadOlderMessages('predictions'); }}
  hasMore={hasMoreByTab.predictions}
  loadingOlder={loadingOlderByTab.predictions}
  placeholder="Your prediction…"
  compact
  readOnly
/>
```

- [ ] **Step 2: Manual UI verification**

Run dev server: `npm run dev`

In a match room:
- Predict tab still shows the feed.
- Predict tab has **no composer** (no input field, no send button).
- Banter tab still allows sending as before.

---

### Task 3: Emit `fanground` system messages on winner votes

**Files:**
- Modify: `src/components/MatchRoom.tsx`

- [ ] **Step 1: Add a helper to send system messages to predictions**

Add a helper near `sendMessage`:

```ts
const sendPredictionSystemMessage = useCallback(async (text: string) => {
  const displayName = user.username?.trim() || 'Fan';
  const payload = {
    matchId: match.id,
    tab: 'predictions',
    userId: 'fanground',
    username: displayName,
    fanTeamId: user.fanTeamId,
    image: user.image,
    text,
  };

  try {
    const res = await fetch('/api/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return;
    const data: SendMessageResponse | Message = await res.json();
    const msg = isSendMessageResponse(data) ? data.message : data;
    upsertMessage(msg);
  } catch (err) {
    console.error('System message failed', err);
  }
}, [match.id, user.username, user.fanTeamId, user.image, upsertMessage]);
```

- [ ] **Step 2: After `castVote` succeeds, emit the formatted message**

After a successful `POST /api/vote` (after setting local state), format:

```ts
const displayName = user.username?.trim() || 'Fan';
const line =
  vote === 'home'
    ? `${displayName} predicted ${match.homeTeam.shortName} to win`
    : vote === 'away'
      ? `${displayName} predicted ${match.awayTeam.shortName} to win`
      : `${displayName} predicted a draw`;

void sendPredictionSystemMessage(line);
```

- [ ] **Step 3: Manual verification**

In Predict tab:
- Confirm a winner vote.
- A new feed item appears with the user’s icon and name, showing the prediction line.

---

### Task 4: Emit `fanground` system messages on score lock

**Files:**
- Modify: `src/components/VotePicker.tsx`
- Modify: `src/components/MatchRoom.tsx`

- [ ] **Step 1: Add callback prop on `VotePicker`**

Update interface:

```ts
export interface VotePickerProps {
  match: Match;
  votes: VoteTally;
  votersByChoice: Record<VoteChoice, VoteVoter[]>;
  voteHistory: VoteHistoryPoint[];
  userVote: VoteChoice | null;
  onVote: (vote: VoteChoice) => void;
  onScoreLocked?: (homeGoals: string, awayGoals: string) => void;
}
```

Thread it into `ScorePrediction` as a prop:

```ts
function ScorePrediction({ match, onScoreLocked }: { match: Match; onScoreLocked?: (homeGoals: string, awayGoals: string) => void }) {
  // ...
}
```

- [ ] **Step 2: Call the callback when score lock confirm happens**

In `confirmLock()`:

```ts
onScoreLocked?.(homeGoals, awayGoals);
```

- [ ] **Step 3: Wire it up from `MatchRoom`**

When rendering `VotePicker` (both drawer and desktop), pass:

```tsx
onScoreLocked={(home, away) => {
  const displayName = user.username?.trim() || 'Fan';
  void sendPredictionSystemMessage(`${displayName} predicted ${home}-${away}`);
}}
```

- [ ] **Step 4: Manual verification**

Lock a score:
- A new system message appears in Predict feed like `Name predicted 2-1`.

---

### Task 5: Verification and cleanup

**Files:**
- Re-run lint/build for changed TSX files.

- [ ] **Step 1: Run lint**

Run: `npm run lint`

Expected: PASS

- [ ] **Step 2: Run production build**

Run: `npm run build`

Expected: PASS

