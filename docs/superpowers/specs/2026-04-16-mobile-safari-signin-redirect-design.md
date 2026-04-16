# Mobile Safari-safe Google Sign-in (redirect flow)

## Problem
The app’s “Sign in with Google” uses a popup (`window.open`) flow implemented in `src/lib/google-signin-popup.ts`. Mobile Safari (and some in-app browsers / strict privacy modes) often blocks popups or prevents the popup from completing auth, making sign-in unreliable.

## Goals / success criteria
- Works reliably on **iOS Safari**, **Android Chrome**, and desktop browsers on **macOS** and **Windows**.
- No popup windows are required for sign-in.
- After successful sign-in, the user returns to the **exact same page** they started on (same path + query string). (Hash handling is browser-dependent; we do not rely on it.)
- Existing session usage via `next-auth` continues to work.

## Non-goals
- Adding new auth providers beyond Google.
- Changing the app’s session model (still `next-auth`).
- Introducing email/magic-link as a primary flow.

## Current state (relevant)
- Popup sign-in is triggered by calling `openGoogleSignInPopup(...)`.
- The popup navigates through NextAuth, then lands on `/auth/auth-popup-done`, posts a message to the opener, and closes.
- `src/app/AuthContext.tsx` listens for the message and calls `useSession().update()`.

## Proposed solution (recommended)
Switch to a **redirect-based** NextAuth sign-in flow using `next-auth/react`’s `signIn`:

- On “Sign in with Google” click, run:
  - `signIn('google', { callbackUrl: window.location.href })`
- This triggers a top-level navigation to the provider, then redirects back to the provided `callbackUrl`.

Why this works:
- Top-level redirects are far more reliable than popups on Mobile Safari.
- NextAuth already supports callback URLs and will complete session establishment before redirecting back.

## Behavioral details
- **Return to same page**: use the full current URL (`window.location.href`) as `callbackUrl`.
  - If a future constraint arises around callback URL allowlisting, we will switch to using `window.location.pathname + window.location.search` and reconstruct origin server-side.
- **Session refresh**: after redirect back, the page will load with a valid session; no opener messaging is needed.
- **Back button UX**: standard for OAuth redirect flows; no special behavior required.

## Implementation outline
- Replace all call sites of `openGoogleSignInPopup(...)` with a new helper (or inline) that calls `signIn('google', { callbackUrl: window.location.href })`.
- Remove popup-only artifacts:
  - `src/lib/google-signin-popup.ts`
  - `src/app/auth/auth-popup-done/page.tsx`
  - `SessionPopupBridge` in `src/app/AuthContext.tsx`
- Ensure “Sign in” triggers are plain button clicks without `target=_blank` or new-window behavior.

## Risks and mitigations
- **Callback URL restrictions**: If the OAuth provider or deployment environment restricts callback URLs, the fallback is to use a stable callback route that then redirects internally to the original page (stored in a cookie or state). We do not implement this unless needed.
- **In-app browsers**: Redirect flow is still the best baseline; popups are generally worse. If a specific in-app browser fails, we can add an explicit “Open in browser” hint.

## Test plan (manual)
- iOS Safari (real device or simulator):
  - Navigate to `/`, `/matches`, `/profile` (signed out) and sign in → returns to the same page and session shows signed-in.
- Android Chrome:
  - Repeat the above.
- Desktop Chrome/Safari:
  - Repeat the above; ensure no popup opens.

