# Admin Panel Specification

Served at `/admin`. Vanilla JS SPA (hash-free History API router) styled with Tailwind. Talks only to `/api/v1/admin/*` and `/api/v1/config?preview=draft`.

## 1. Authentication

- Single account from env: `ADMIN_USERNAME` / `ADMIN_PASSWORD`. No sign-up, no password change in UI (change env + restart).
- Login page → `POST /api/v1/admin/login` → httpOnly cookie. On any `401`, router redirects to `/admin/login?next=…`.
- Session expiry 8 h (`ADMIN_SESSION_HOURS`); expiry banner 5 min before.
- Logout button in top bar.

## 2. Layout

```
┌───────────────────────────────────────────────────────────────┐
│ ◧ Jumpy Doodle Admin                       admin ▾  [Logout]   │
├──────────────┬────────────────────────────────────────────────┤
│ ▣ Dashboard  │                                                │
│ 🎨 Theme      │              page content                      │
│ 🖼 Assets     │                                                │
│ ⚡ Events     │                                                │
│ 🏆 Leaderboard│                                                │
│ 👤 Players    │                                                │
│ ⚙ Settings   │                                                │
└──────────────┴────────────────────────────────────────────────┘
```
Responsive: sidebar collapses to a top drawer < 768 px. Toast notifications bottom-right. Confirm modals for destructive actions (custom modal, not `window.confirm`).

## 3. Pages

### 3.1 Dashboard
- KPI cards: Runs, Unique players, Avg score, Max score, Rejected runs (range selector 24h / 7d / 30d).
- Line chart: events per minute (last 24 h) — lightweight `<canvas>` chart, no heavy lib (or uPlot).
- Webhook health: enabled/disabled, pending, failed in 24 h, last success.
- Latest 10 events (live, refresh 5 s).

### 3.2 Theme editor
Two-column: **form (left)** · **live preview (right, phone-shaped iframe `/?preview=draft&embed=1`)**.

Sections (accordion):
1. **Branding** — game title, subtitle, logo image, favicon, font family (Google-font-free list of web-safe + bundled fonts).
2. **Colours** — background, HUD text, primary button, button text, accent, overlay backdrop (colour pickers + hex input, contrast warning < 4.5:1).
3. **Player sprites** — slots `player.left`, `player.right`, `player.shoot`, overlays `player.propeller`, `player.jetpack`, `player.spring_shoes`. Per slot: image picker + "scale" (0.5–1.5) + "offset Y" (art alignment; hitbox unchanged).
4. **Platforms** — all `platform.*` slots.
5. **Items & power-ups** — `item.*`, `projectile`.
6. **Hazards** — `monster.*`, `hazard.*`.
7. **Background** — image (tiled vertically), parallax factor, colour fallback.
8. **Sounds** — `sound.*` with ▶ preview.
9. **Texts** — menu labels, game-over messages (i18n-ready keys).

Behaviour:
- Every change → debounced (500 ms) `PATCH /theme/draft` + `postMessage({type:"dj:preview_theme", payload: draft})` to the iframe for instant re-skin without reload.
- Buttons: **Publish** (modal with note) · **Discard draft** · **Reset to defaults** · **Restart preview**.
- Header shows "Draft differs from published (N changes)".
- **History** tab: versions table (version, note, date) with View (read-only preview) and Rollback.

Image picker: choose from asset library or drag-drop new upload (uploads then assigns). Shows thumbnail on checkerboard, intrinsic size, and a warning if aspect ratio differs from slot box by > 30%.

### 3.3 Assets
- Grid of thumbnails (images) and list (audio), filter by kind, search by original name.
- Upload (multi-file, drag-drop), progress, validation errors inline.
- Each card: size, dimensions, "used in" slots; Delete disabled when in use (tooltip lists slots).

### 3.4 Events explorer
- Filter bar: type (multi-select grouped by category), trust, player (search), session id, date range, free-text search in data.
- Table: time, seq, type (colour badge by category), player, session, short data summary. Infinite scroll (cursor, newest first).
- **Live** toggle: polls every 2 s for `seq > top`, prepends new rows (highlight).
- Row click → side drawer with pretty-printed JSON + copy button + links to player / session.
- **Export** CSV / NDJSON for current filters.
- Stats strip: counts per type for the filtered range.

### 3.5 Leaderboard
- Period tabs (Today / Week / All time), toggle "show hidden".
- Table: rank, player, score, achieved at, session link, actions: Hide / Restore (reason modal), Ban player.
- Hidden rows greyed with reason.

### 3.6 Players
- Search by name / external id; filter banned.
- Player detail: identity, best scores per period, recent sessions (score, duration, status, reject reason), ban/unban.
- Session detail: run stats + its event timeline (for cheat investigation).

### 3.7 Settings
- **Gameplay**: difficulty multiplier slider, power-up rate multiplier, enable/disable entities (monsters, black holes, jetpack, propeller, spring shoes, trampoline, shooting).
- **Anti-cheat**: max score rate, min duration.
- **Webhook**: enabled toggle, URL, secret (write-only, "set"/"not set" indicator, regenerate button shows once), event-type filter (chips), **Send test**, delivery log table with retry.
- **Integration info** (read-only): base URL, whether `INTEGRATION_API_KEY` / `HOST_SIGNING_SECRET` are configured, link to docs, copyable iframe snippet.

## 4. Theme schema (summary)

Authoritative: `shared/themeSchema.js`. Every slot is optional; missing → default asset.

```json
{
  "schemaVersion": 1,
  "branding": { "title": "Jumpy Doodle", "subtitle": "How high can you go?", "logo": "/default-assets/logo.svg", "fontFamily": "Gochi Hand, cursive" },
  "colors": { "background": "#f8f5e6", "gridLines": "#e3dcc3", "hudText": "#1f2937", "primary": "#16a34a", "primaryText": "#ffffff", "accent": "#f59e0b", "overlay": "rgba(0,0,0,0.45)" },
  "sprites": {
    "player.left":  { "src": "/default-assets/doodler-left.svg",  "scale": 1, "offsetY": 0 },
    "player.right": { "src": "/default-assets/doodler-right.svg", "scale": 1, "offsetY": 0 },
    "player.shoot": { "src": "/default-assets/doodler-shoot.svg" },
    "player.propeller": { "src": "…" }, "player.jetpack": { "src": "…" }, "player.spring_shoes": { "src": "…" },
    "platform.normal": { "src": "…" }, "platform.moving": { "src": "…" }, "platform.breakable": { "src": "…" },
    "platform.breakable_broken": { "src": "…" }, "platform.disappearing": { "src": "…" }, "platform.exploding": { "src": "…" },
    "item.spring": { "src": "…" }, "item.spring_used": { "src": "…" }, "item.trampoline": { "src": "…" },
    "item.propeller": { "src": "…" }, "item.jetpack": { "src": "…" }, "item.spring_shoes": { "src": "…" }, "item.shield": { "src": "…" },
    "monster.basic": { "src": "…" }, "monster.flyer": { "src": "…" }, "monster.big": { "src": "…" },
    "hazard.black_hole": { "src": "…" }, "hazard.ufo": { "src": "…" }, "projectile": { "src": "…" }
  },
  "background": { "image": null, "parallax": 0.5, "pattern": "graph-paper" },
  "sounds": { "sound.jump": "/default-assets/sfx/jump.mp3", "…": "…" },
  "texts": { "play": "Play", "playAgain": "Play again", "leaderboard": "Leaderboard", "gameOver": "Game over!", "newBest": "New best!" }
}
```

Validation: `src` must be a same-origin path under `/uploads/` or `/default-assets/` (no external URLs → no hotlinking/XSS/CSP issues); colours must be valid CSS colour strings; text ≤ 40 chars.

## 5. UX Rules

- All admin mutations show success/error toasts; forms disable during submit.
- Keyboard accessible; visible focus rings; labels on all inputs.
- No admin data cached in `localStorage` except UI prefs (sidebar collapsed, table density).
