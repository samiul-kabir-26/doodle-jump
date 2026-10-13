# Product Requirements Document — Doodle Jump Microservice

| | |
|---|---|
| **Status** | Draft v1.0 — ready for implementation |
| **Date** | 2026-10-13 |
| **Owner** | Samiul Kabir |
| **Related docs** | [GAME_DESIGN](GAME_DESIGN.md) · [ARCHITECTURE](ARCHITECTURE.md) · [API](API.md) · [EVENTS](EVENTS.md) · [DATA_MODEL](DATA_MODEL.md) · [ADMIN_PANEL](ADMIN_PANEL.md) · [INTEGRATION](INTEGRATION.md) · [IMPLEMENTATION_PLAN](IMPLEMENTATION_PLAN.md) · [TESTING](TESTING.md) |

---

## 1. Summary

Build a faithful clone of **Doodle Jump** that runs in the browser (HTML5 Canvas + JavaScript, UI with Tailwind CSS) and ship it as a **self-contained microservice** that other systems can embed. The service includes:

1. **The game** — endless vertical platformer, mobile- and desktop-friendly.
2. **A leaderboard** — all-time, weekly and daily rankings.
3. **An event stream** — every meaningful gameplay/score action is recorded as a structured, versioned event that a host system can later consume (pull API or webhook) to award points to its users.
4. **An admin panel** — protected by fixed credentials from environment variables; lets an operator reskin the game (replace the doodler, platforms, background, sounds, colours, texts), browse/export events, and moderate the leaderboard.

## 2. Problem & Opportunity

Host products (loyalty apps, learning platforms, internal portals) want a lightweight, brandable mini-game that drives engagement and can feed a rewards system. Building a game per client is expensive. A single, configurable, embeddable game service with a clean event contract lets any host integrate it in hours instead of weeks.

## 3. Goals

| # | Goal | Measure |
|---|---|---|
| G1 | Gameplay feels like the original Doodle Jump | Blind playtest: ≥ 80% of testers rate "feels like Doodle Jump" ≥ 4/5 |
| G2 | Fully reskinnable without code changes | Admin can replace every sprite slot and publish in < 5 min; game reflects it on next load |
| G3 | Reliable, consumable event stream | 100% of completed runs produce a `game.ended` event; webhook delivery success ≥ 99.5% (with retries) |
| G4 | Embeddable as a microservice | Host integration (iframe + token) achievable with < 50 lines of host code |
| G5 | Competitive leaderboard | Leaderboard updates within 1 s of run end; obvious cheats (impossible scores) rejected |
| G6 | Performance | 60 fps on a mid-range Android phone (2022) and desktop; initial load < 1.5 MB gzipped (default theme) |

## 4. Non-Goals (v1)

- Awarding points itself — the service **emits** events; points logic belongs to the host (a sample mapping is provided in [EVENTS.md](EVENTS.md)).
- Multi-tenant (multiple independently-themed games in one deployment). One deployment = one theme. Run several containers for several tenants. (Candidate for v2.)
- Multiple admin accounts / RBAC. Single admin from env.
- Native mobile apps, multiplayer, in-app purchases, ads.
- Server-authoritative full replay verification (v1 does plausibility checks; deterministic seeded RNG keeps the door open for replay validation in v2).

## 5. Personas

| Persona | Description | Primary needs |
|---|---|---|
| **Player** | End user of a host product, or anonymous visitor in standalone mode | Fun, responsive game; see their rank; works on phone |
| **Admin / Operator** | Marketing or product person running the game for a brand | Change visuals easily, preview before publishing, see what players do, remove cheaters |
| **Host Integrator** | Developer of the system that embeds the game | Simple embed, trustworthy identity mapping, stable event contract, webhook with signatures |

## 6. User Stories & Acceptance Criteria

### 6.1 Player

| ID | Story | Acceptance criteria |
|---|---|---|
| P-1 | As a player I can start a game from a menu | Menu shows title/logo (themeable), Play, Leaderboard; Play starts a run in < 300 ms |
| P-2 | I control the doodler with keyboard, tilt or touch | ←/→ and A/D on desktop; tilt (with iOS permission prompt) or tap/hold left/right half on mobile; toggle in settings |
| P-3 | I bounce automatically on platforms and climb | Mechanics per [GAME_DESIGN.md](GAME_DESIGN.md) §3–4; collision only when falling |
| P-4 | I encounter varied platforms, power-ups, monsters, black holes | All entity types in GAME_DESIGN §5–7 appear according to the difficulty curve |
| P-5 | I can shoot monsters | Space / tap upper screen shoots upward toward the tap; nose sprite swaps to "shoot" slot |
| P-6 | I see my score while playing and a game-over summary | HUD shows score (top-left) + pause button; game-over shows score, best, rank, Play Again, Menu |
| P-7 | I see the leaderboard | Tabs: Today / This week / All time; top 100; my row highlighted and pinned if outside top 100 |
| P-8 | The game pauses when I leave | `visibilitychange` → auto-pause; P/Esc toggles pause |
| P-9 | Standalone players pick a nickname | If no host token, prompt once for nickname (3–20 chars, profanity-filtered); stored with device ID |
| P-10 | Sound can be muted | Mute toggle persisted in `localStorage` |

### 6.2 Admin

| ID | Story | Acceptance criteria |
|---|---|---|
| A-1 | I log in with the credentials from `.env` | `ADMIN_USERNAME`/`ADMIN_PASSWORD`; wrong creds → generic error; 5 attempts/min/IP limit; session 8 h |
| A-2 | I replace the doodler image (and every other sprite) | Upload PNG/WebP/SVG ≤ `MAX_UPLOAD_MB` per slot (see theme slots in [ADMIN_PANEL.md](ADMIN_PANEL.md) §4); thumbnail shown; invalid file rejected with reason |
| A-3 | I change colours, fonts, texts and sounds | Theme editor fields validated against theme schema |
| A-4 | I preview changes before publishing | Live preview iframe runs the game with the **draft** theme; players unaffected until Publish |
| A-5 | I publish, see history, and roll back | Each publish creates an immutable version; one-click rollback; `admin.theme_published` event emitted |
| A-6 | I see all events | Event explorer: filter by type, category, player, session, date range; live tail (auto-refresh); JSON detail view |
| A-7 | I export events | CSV and NDJSON export of the current filter (streamed, up to 1 M rows) |
| A-8 | I moderate the leaderboard | Hide/restore a score, ban/unban a player (banned players' scores excluded, runs rejected) |
| A-9 | I configure gameplay and integration | Tunables (difficulty multiplier, enabled entities), webhook URL/secret/event filter, test-send webhook, view delivery log |
| A-10 | I see a dashboard | Today's runs, unique players, avg/max score, events/min chart, webhook health |

### 6.3 Host Integrator

| ID | Story | Acceptance criteria |
|---|---|---|
| H-1 | I embed the game in my app | `<iframe src="https://game.example.com/?token=…">` works; documented in [INTEGRATION.md](INTEGRATION.md) |
| H-2 | I tell the game who the user is, securely | HMAC-signed launch token (HS256 JWT, `HOST_SIGNING_SECRET`) with `sub = externalUserId`; tampered/expired tokens rejected |
| H-3 | I receive events to award points | Pull: `GET /api/v1/events?after=<cursor>` with API key. Push: signed webhook with retries. At-least-once, idempotent `id` |
| H-4 | I can distinguish trusted from untrusted events | Every event carries `trust: "server" | "client"`; points should be based on server-trusted events |
| H-5 | I get notified in-page | `postMessage` events (`dj:ready`, `dj:game_over`, …) to the parent window, origin-checked |
| H-6 | I can query a player's stats | `GET /api/v1/players/:externalUserId/stats` (API key) returns best score, runs, rank |
| H-7 | I can deploy it easily | Single Docker image, `.env` configuration, `/health` endpoint, SQLite volume |

## 7. Functional Requirements

### FR-1 Game
- FR-1.1 Canvas renderer at logical resolution **360 × 640** (9:16), scaled to fit with letterboxing; crisp on HiDPI.
- FR-1.2 Fixed-timestep simulation (60 Hz) independent of display refresh rate.
- FR-1.3 Seeded PRNG (seed issued by server per session) drives level generation.
- FR-1.4 Full mechanic set in [GAME_DESIGN.md](GAME_DESIGN.md).
- FR-1.5 Theme loaded from `GET /api/v1/config` at boot; missing slots fall back to bundled defaults; asset load failure never blocks play.
- FR-1.6 Gameplay events batched and sent every 2 s and on game end (`navigator.sendBeacon` on unload).
- FR-1.7 Works offline-tolerant: if API unreachable, game is playable; score submission shows "not saved".

### FR-2 Sessions & Scores
- FR-2.1 Each run starts with `POST /sessions` → `sessionId`, `seed`. Ends with `POST /sessions/:id/end`.
- FR-2.2 Server validates: session open & owned by player; duration ≥ 3 s; `score ≤ maxHeight`-derived bound; score rate ≤ `MAX_SCORE_RATE`; session not older than 2 h. Failing runs stored with `status = rejected` + reason, emit `score.rejected`.
- FR-2.3 Accepted scores inserted into `scores`; personal best and rank computed.

### FR-3 Leaderboard
- FR-3.1 Best score per player per period (daily/weekly UTC, all-time). Ties → earlier `achievedAt` wins.
- FR-3.2 Excludes hidden scores and banned players.
- FR-3.3 Public endpoint, cached 5 s.

### FR-4 Events
- FR-4.1 Append-only store; monotonically increasing `seq` used as cursor.
- FR-4.2 Envelope & catalog per [EVENTS.md](EVENTS.md); schemas versioned.
- FR-4.3 Delivery: pull API + optional webhook (HMAC-SHA256 signed, exponential retry, at-least-once).
- FR-4.4 Retention configurable (`EVENT_RETENTION_DAYS`, default 180).

### FR-5 Admin Panel
- FR-5.1 Served at `/admin`; SPA built with Vite + Tailwind.
- FR-5.2 Auth via env credentials → httpOnly signed cookie.
- FR-5.3 Screens per [ADMIN_PANEL.md](ADMIN_PANEL.md).

### FR-6 Integration
- FR-6.1 Launch token, `postMessage` bridge, CORS and `frame-ancestors` per [INTEGRATION.md](INTEGRATION.md).
- FR-6.2 Integration API protected by `INTEGRATION_API_KEY` (`Authorization: Bearer`).

## 8. Non-Functional Requirements

| Area | Requirement |
|---|---|
| Performance | 60 fps target; p95 API latency < 100 ms at 200 req/s on 1 vCPU; leaderboard query < 20 ms with 1 M scores |
| Availability | Single-instance v1; stateless app except SQLite volume; graceful shutdown drains webhook queue |
| Security | Secrets only via env; startup fails on missing/weak secrets in production; helmet headers; CSP; rate limiting; input validation (zod); upload MIME sniffing + SVG sanitisation; timing-safe credential compare |
| Privacy | Store only `externalUserId`, display name, device ID; no IP stored in events (IP only in rate limiter memory) |
| Accessibility | Admin panel WCAG 2.1 AA; game menus keyboard-navigable; reduced-motion respected in menus |
| Browser support | Last 2 versions of Chrome, Safari (iOS 16+), Firefox, Edge |
| Observability | Structured JSON logs (pino), `/health` and `/ready`, request IDs |
| Portability | Repository layer isolates SQLite so PostgreSQL can be added without touching services |

## 9. Release Scope

| Milestone | Scope |
|---|---|
| **MVP (v1.0)** | Everything in §6 and §7 |
| v1.1 | Shield power-up, UFO enemy, sound packs, admin dark mode |
| v2.0 | Multi-tenant themes, replay-based anti-cheat, PostgreSQL adapter, admin RBAC, seasonal leaderboards |

## 10. Requirement Traceability (from original request)

| Original requirement | Covered by |
|---|---|
| "Game exactly like Doodle Jump" in JS/HTML/Tailwind | P-1…P-10, FR-1, [GAME_DESIGN.md](GAME_DESIGN.md) |
| Admin panel with fixed creds from env | A-1, FR-5.2, `.env.example` |
| Admin can change the bird/doodler image and UI | A-2…A-5, theme slots in [ADMIN_PANEL.md](ADMIN_PANEL.md) |
| See all events, usable later for awarding points | A-6, A-7, H-3, H-4, FR-4, [EVENTS.md](EVENTS.md) |
| Leaderboard | P-7, FR-3, A-8 |
| Microservice, integrable into any system | H-1…H-7, FR-6, [INTEGRATION.md](INTEGRATION.md), [ARCHITECTURE.md](ARCHITECTURE.md) |

## 11. Success Metrics (post-launch)

- D1 retention of players ≥ 30% (in host deployments).
- Median runs per player per day ≥ 3.
- Score rejection rate < 1% (higher means false positives in anti-cheat → retune).
- Webhook p95 delivery latency < 5 s.

## 12. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Client-side cheating (fake scores) | Unfair leaderboard, inflated points | Server sessions, plausibility checks, `trust` flag on events, bans; v2 replay validation via seed |
| Admin uploads oversized/odd-ratio art | Broken visuals | Sprites drawn into fixed logical boxes; hitboxes independent of art; upload validation; preview before publish |
| Malicious SVG upload | XSS | Sanitise SVG server-side, serve with `Content-Security-Policy: sandbox` + `nosniff`; draw via `<img>`/canvas only |
| SQLite write contention | Latency spikes | WAL mode, batched event inserts in a transaction, single writer; PostgreSQL adapter in v2 |
| Trademark ("Doodle Jump" name/art) | Legal | Ship **original** default art and a neutral product name in the default theme; "Doodle Jump" is used internally as the gameplay reference only |
| iOS tilt permission friction | Worse mobile controls | Touch-zone control as default fallback; tilt opt-in |

## 13. Open Questions

1. Should the default product name shown to players be configurable only via theme (assumed yes) — what default title? (Assumed: "Jumpy Doodle".)
2. Do host systems need the leaderboard scoped per host/tenant in v1? (Assumed no — one deployment per host.)
3. Profanity filter language list for nicknames? (Assumed English + Bangla basic list, configurable.)
4. Is GDPR-style "delete my data" required in v1? (Proposed: admin endpoint `DELETE /admin/players/:id` added if confirmed.)
