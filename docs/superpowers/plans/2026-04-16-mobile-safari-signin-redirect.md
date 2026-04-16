# Mobile Safari-safe Google Sign-in (redirect) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the popup-based Google sign-in with a redirect-based NextAuth sign-in that works reliably on Windows, macOS, Android, and iOS, returning users to the exact same page.

**Architecture:** Use `next-auth/react` `signIn('google', { callbackUrl })` from a client-side helper to initiate a top-level redirect. Remove popup-only bridge pages and messaging.

**Tech Stack:** Next.js App Router, `next-auth` v4 (`next-auth/react`), TypeScript.

---

## File structure (what changes and why)
- Create: `src/lib/google-signin.ts`
  - Single responsibility: start Google sign-in via redirect (no popup).
- Modify: all pages/components that currently import `openGoogleSignInPopup` to call the redirect helper instead.
- Delete: `src/lib/google-signin-popup.ts`
  - Popup-only logic; no longer needed.
- Delete: `src/app/auth/auth-popup-done/page.tsx`
  - Popup-only “done” landing page; no longer needed.
- Modify: `src/app/AuthContext.tsx`
  - Remove popup postMessage listener (`SessionPopupBridge`) since redirect flow reloads the app with session.

---

### Task 1: Add redirect-based Google sign-in helper

**Files:**
- Create: `src/lib/google-signin.ts`

- [ ] **Step 1: Create `src/lib/google-signin.ts`**

Create a client-side helper that can be called from button handlers:

```ts
'use client';

import { signIn } from 'next-auth/react';

type StartGoogleSignInOptions = {
  /**
   * If provided, use this as the callback URL. Otherwise, use the current URL.
   * Using the full current URL returns users to the exact same page.
   */
  callbackUrl?: string;
};

export async function startGoogleSignInRedirect(options: StartGoogleSignInOptions = {}) {
  const callbackUrl = options.callbackUrl ?? window.location.href;
  await signIn('google', { callbackUrl });
}
```

- [ ] **Step 2: Typecheck via Next build**

Run: `npm run build`  
Expected: build completes (or fails only for pre-existing issues).

- [ ] **Step 3: Commit**

```bash
git add src/lib/google-signin.ts
git commit -m "feat: add redirect-based Google sign-in helper"
```

---

### Task 2: Replace popup sign-in call sites with redirect flow

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/profile/page.tsx`
- Modify: `src/app/debug/page.tsx`
- Modify: `src/components/AppHeaderSession.tsx`
- Modify: any other file importing `openGoogleSignInPopup` (search for it repo-wide)

- [ ] **Step 1: Replace imports**

In each file that currently does:

```ts
import { openGoogleSignInPopup } from '@/lib/google-signin-popup';
```

Change to:

```ts
import { startGoogleSignInRedirect } from '@/lib/google-signin';
```

- [ ] **Step 2: Replace click handlers**

Replace usages like:

```ts
void openGoogleSignInPopup(() => updateSession());
```

With:

```ts
void startGoogleSignInRedirect();
```

Notes:
- Do not pass a callback; redirect flow will return to the same page and session will be present after navigation.
- Keep the `void` (or `await`) style consistent with the surrounding file.

- [ ] **Step 3: Run lint**

Run: `npm run lint`  
Expected: no new lint errors introduced.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx src/app/profile/page.tsx src/app/debug/page.tsx src/components/AppHeaderSession.tsx
git commit -m "fix: switch Google sign-in from popup to redirect"
```

---

### Task 3: Remove popup-only bridge artifacts

**Files:**
- Modify: `src/app/AuthContext.tsx`
- Delete: `src/lib/google-signin-popup.ts`
- Delete: `src/app/auth/auth-popup-done/page.tsx`

- [ ] **Step 1: Update `src/app/AuthContext.tsx`**

Remove `SessionPopupBridge` (the `postMessage` listener) and render only the `SessionProvider`:

```tsx
'use client';

import { SessionProvider } from 'next-auth/react';

export default function AuthContext({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
```

- [ ] **Step 2: Delete popup files**

Delete:
- `src/lib/google-signin-popup.ts`
- `src/app/auth/auth-popup-done/page.tsx`

- [ ] **Step 3: Ensure no remaining references**

Search for `google-signin-popup` and `/auth/auth-popup-done` and confirm there are zero references.

- [ ] **Step 4: Run build**

Run: `npm run build`  
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/app/AuthContext.tsx
git rm src/lib/google-signin-popup.ts src/app/auth/auth-popup-done/page.tsx
git commit -m "refactor: remove popup-only sign-in bridge"
```

---

### Task 4: Manual cross-device verification

**Files:**
- None

- [ ] **Step 1: Run dev server**

Run: `npm run dev`  
Expected: dev server starts.

- [ ] **Step 2: Verify sign-in returns to same page**

For each of these pages while signed out:
- `/`
- `/matches`
- `/profile`

Steps:
- Tap/click “Sign in with Google”
- Complete Google sign-in
- Confirm you return to the same page URL and the UI shows signed-in state

Environments:
- iOS Safari
- Android Chrome
- Desktop (macOS Safari or Chrome)
- Desktop (Windows Chrome)

- [ ] **Step 3: Final lint/build**

Run:
- `npm run lint`
- `npm run build`

Expected: both succeed.

