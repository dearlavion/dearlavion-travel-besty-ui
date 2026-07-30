# Auth sessions & cross-tab consistency

How the app stores who you're logged in as, and how every open tab is kept on the **same
identity** ("one identity everywhere").

Implemented in [`src/app/auth/auth.service.ts`](../src/app/auth/auth.service.ts).

## Where session state lives

Auth state exists in **two layers** with different scopes:

| Layer | Where | Scope | Read when |
|---|---|---|---|
| In-memory signals `token`, `user` | `AuthService` (Angular `signal`) | **Per tab** — each tab is its own JS runtime | Seeded once at app load; changed by `login()` / `logout()` in *that* tab and by the cross-tab listener below |
| `localStorage` keys `travel-besty-auth-token`, `travel-besty-auth-user` | Browser profile | **Shared by all tabs** of the same origin | Read at app load to seed the signals |

Key facts:

- It's **`localStorage`, not `sessionStorage`** → there is **one shared slot** for the whole
  browser, not one per tab. The last login wins.
- The HTTP interceptor
  ([`auth.interceptor.ts`](../src/app/auth/auth.interceptor.ts)) attaches
  `Authorization: Bearer <token>` by reading the **in-memory** `token()` signal — not localStorage
  directly.

## The problem this solves

Because the token/user keys are shared but the in-memory signals are per-tab, tabs used to **drift**:

1. Tab A logs in as admin → `localStorage = admin`, Tab A memory = admin.
2. Tab B logs in as a normal user → `localStorage = user` (overwrites admin), Tab B memory = user.
3. Tab A's in-memory signal is **still admin** (nothing told it to change), so it keeps showing the
   admin UI and sending the admin token — until it reloads, at which point it silently re-seeds from
   the shared `localStorage` and becomes `user`. Its next `PUT /admin/...` then returns **403**.

That "silently downgraded on reload" behavior was a common source of surprise 403s.

## How consistency is enforced

`AuthService` registers a `window` **`storage`** listener in its constructor. The `storage` event
fires **in other tabs** whenever `localStorage` changes (it never fires in the tab that made the
change). On each relevant change the service re-seeds its `token` / `user` signals from storage, so
all tabs converge immediately — no reload required.

Resulting behavior (live, in every other open tab):

| Action in one tab | Effect on the other tabs |
|---|---|
| **Login** (as anyone) | Signals re-sync → nav, `isAdmin()`, and the token the interceptor sends all switch to the new identity |
| **Login as a different user** | All tabs converge on the latest login; no stale-token drift |
| **Logout** | Signals clear → all tabs show logged-out immediately |

### Redirect off now-forbidden pages

Convergence alone would leave a tab sitting on a page it can no longer use (e.g. an admin tab after
another tab logged out). So when a cross-tab change means the current tab **loses access to the
route it's on**, the tab is redirected to `/login?returnUrl=…`.

Protected route prefixes (mirroring `requireLoginGuard` in
[`app.routes.ts`](../src/app/app.routes.ts)): **`/admin`** and **`/profile`**. The redirect fires
when, on one of those pages, the tab becomes **logged out**, or **drops admin** while on `/admin`.

## Edge cases handled

- **SSR-safe** — the listener is only registered when `window` exists; it never runs during
  server-side rendering.
- **No self-trigger** — `storage` doesn't fire in the originating tab; that tab already updated its
  own signals via `setSession()` / `logout()`.
- **Two-key write race** — `setSession()` writes the token and user keys in sequence. The handler
  skips the brief window where the token has landed but the user object hasn't yet (the follow-up
  event finalizes it), so it never spuriously redirects a user who is mid-login in another tab.
- **Scoped to auth keys** — the handler reacts only to the two auth keys (or a full
  `localStorage.clear()`, where `event.key === null`); unrelated caches such as exchange rates and
  store settings don't trip it.

## What this is **not**

- It is **not** per-tab isolation. You cannot hold two different identities in two tabs at once —
  by design, all tabs share one identity. (If you ever want genuinely independent tab sessions,
  that's the opposite change: move the token/user to `sessionStorage`.)
- It does **not** add a refresh-token or extend expiry. Tokens still expire per auth-service-v2's
  `JWT_EXPIRES_IN` (24h by default); an expired token is rejected on the next backend call.

## Manual test

1. Run in real-backend mode (`npm start` variant that points at the live backends).
2. Open two tabs. In Tab A, log in as an admin (`dear` / `e2etestadmin`) and go to `/admin/settings`.
3. In Tab B, log out (or log in as a normal user).
4. Tab A updates **without a reload**: the nav flips to logged-out / non-admin, and because it was
   on `/admin`, it is redirected to `/login`.
