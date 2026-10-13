# Implementation Plan

Milestones are sequential; each ends in a demoable, tested state. Estimates assume one full-stack developer.

| Milestone | Outcome | Est. |
|---|---|---|
| M0 | Project scaffold, tooling, CI | 1 d |
| M1 | Playable core game (offline, default theme) | 5 d |
| M2 | Backend foundation: env, DB, players, sessions, scores, anti-cheat | 3 d |
| M3 | Leaderboard (API + in-game UI) | 1.5 d |
| M4 | Event system: store, client batching, pull API, webhooks | 3 d |
| M5 | Admin panel: auth, theme editor + assets, events explorer, moderation, settings | 6 d |
| M6 | Integration & hardening: launch tokens, postMessage, security, Docker, OpenAPI, perf | 3 d |
| | **Total** | **≈ 22.5 d** |

---

## M0 — Scaffold
- [ ] `package.json` (type: module, Node ≥ 24), scripts: `dev`, `dev:server`, `dev:client`, `build`, `start`, `test`, `test:e2e`, `lint`, `format`, `migrate`.
- [ ] Deps: express, better-sqlite3, zod, jose, multer, file-type, sharp, dompurify, jsdom, helmet, cors, express-rate-limit, pino, pino-http, ulid, dotenv, cookie-parser.
- [ ] Dev deps: vite, @tailwindcss/vite, tailwindcss, vitest, supertest, @playwright/test, eslint, prettier, concurrently, nodemon.
- [ ] `vite.config.js` multi-page (`client/index.html`, `client/admin/index.html`), dev proxy to Express.
- [ ] Folder structure per [ARCHITECTURE.md](ARCHITECTURE.md) §3; `.env.example`; `.gitignore` (`data/`, `dist/`, `.env`).
- [ ] GitHub Actions: install → lint → unit/API tests → build.

**DoD:** `npm run dev` serves a blank game page and admin page; CI green.

## M1 — Core game
- [ ] `shared/constants.js` with all numbers from [GAME_DESIGN.md](GAME_DESIGN.md).
- [ ] `engine/loop.js` fixed timestep; `engine/rng.js` mulberry32; `engine/input.js` (keyboard, touch zones, tilt w/ permission); `engine/camera.js`; `engine/collision.js` (swept AABB for feet vs platform top).
- [ ] `entities/player.js` (physics, wrap, facing, squash), `platform.js` (all types), `item.js` (spring, trampoline, propeller, jetpack, spring shoes), `monster.js`, `blackHole.js`, `projectile.js`.
- [ ] `world/generator.js` + `difficulty.js` (bands table, reachability guarantee, safe path for hazards).
- [ ] `engine/assets.js` (loads theme sprites → `ImageBitmap`, fallback to defaults, draws into fixed boxes with `scale`/`offsetY`); `engine/audio.js`.
- [ ] Scenes: boot, menu, play (HUD), pause, game over (local only for now).
- [ ] Default original SVG art + SFX in `public/default-assets/`; `shared/themeSchema.js` default theme.
- [ ] Stats tracking object per run.
- [ ] Unit tests: physics apex heights, collision only when falling, wrap, generator reachability over 10 000 seeds, score formula.

**DoD:** Game playable start → game over on desktop and phone at 60 fps; feels like Doodle Jump (internal playtest).

## M2 — Backend foundation
- [ ] `config/env.js` (zod, fail fast, prod secret strength).
- [ ] `db/connection.js`, `migrate.js`, `001_init.sql` per [DATA_MODEL.md](DATA_MODEL.md).
- [ ] Repositories: players, sessions, scores, themes, settings.
- [ ] `auth.service.js`: player JWT issue/verify. `player.service.js`: anonymous identify (nickname validation + profanity list).
- [ ] `session.service.js` + `score.service.js` (validation rules from [API.md](API.md) §1 `/end`, idempotent `end_response`).
- [ ] Routes: `/health`, `/ready`, `GET /config`, `POST /players/identify`, `POST /sessions`, `POST /sessions/:id/end`.
- [ ] Middleware: requestId, pino-http, helmet, validate(zod), errorHandler (error format), playerAuth, rate limits.
- [ ] Client `net/api.js`: identify (nickname scene), start session (seed → generator), end session; offline handling.
- [ ] API tests (Supertest, in-memory SQLite `:memory:`).

**DoD:** Runs are persisted; impossible scores rejected; game uses server seed.

## M3 — Leaderboard
- [ ] `scores.repo.js` leaderboard queries (window functions), `leaderboard.service.js` with 5 s cache + invalidation.
- [ ] `GET /leaderboard`, `GET /leaderboard/me`; rank & PB in `/end` response.
- [ ] Client leaderboard scene (tabs, self highlight/pinned) and game-over rank display.
- [ ] Tests: tie-breaking, period keys around UTC midnight / ISO week boundary, hidden/banned exclusion.

**DoD:** Leaderboard correct for daily/weekly/all; updates right after a run.

## M4 — Events
- [ ] `shared/eventTypes.js` — full catalog from [EVENTS.md](EVENTS.md) with zod schemas + metadata (category, trust, source).
- [ ] `events.repo.js`, `event.service.emit()` (same-transaction with state changes), batch insert for client events with dedupe.
- [ ] Wire emissions in identify, sessions, end, cleanup job.
- [ ] Client `net/eventQueue.js`: buffer, 2 s flush, `sendBeacon` on `pagehide`, sampling for `platform.broken`/`spring.used`.
- [ ] `POST /sessions/:id/events`; integration `GET /events`, `GET /event-types`, `GET /players/:externalUserId/stats`, `apiKey` middleware.
- [ ] `webhooks.repo.js`, `webhook.service.js` (sign, filter), `workers/webhookDispatcher.js` (backoff schedule, concurrency 20, 10 s timeout, graceful stop).
- [ ] Jobs: session cleanup, retention purge, launch-token purge.
- [ ] Tests: envelope shape, cursor pagination, idempotent client batches, webhook signature (verified with the snippet in INTEGRATION.md), retry scheduling (fake timers + local HTTP server).

**DoD:** A full run produces the event sequence in EVENTS.md §3, visible via pull API and delivered to a test webhook.

## M5 — Admin panel
- [ ] Backend: admin login/logout/me (timing-safe, rate limited, cookie), `adminAuth` + CSRF header check.
- [ ] Theme: draft CRUD, publish, versions, rollback, reset; `GET /config?preview=draft`.
- [ ] Assets: upload pipeline (sniff → sharp re-encode / SVG sanitise → hash → store), list, delete with in-use check; static `/uploads` with security headers.
- [ ] Events explorer endpoints incl. streamed CSV/NDJSON export; dashboard aggregates.
- [ ] Moderation: hide/restore score, ban/unban, players & sessions detail.
- [ ] Settings: gameplay, anti-cheat, webhook (encrypted secret), test send, deliveries + retry.
- [ ] Admin SPA: router, api client (adds `X-Requested-With`), layout, pages per [ADMIN_PANEL.md](ADMIN_PANEL.md) §3, components (table, modal, toast, file picker, colour field).
- [ ] Game: `theme/loader.js` hot-apply on `dj:preview_theme` (preview mode only, from admin origin).
- [ ] Tests: auth (wrong creds, lockout, cookie flags), upload rejection cases (wrong MIME, oversize, malicious SVG), publish/rollback, E2E "replace doodler and see it in game".

**DoD:** Admin can reskin the doodler + platforms, preview, publish, and a fresh game load shows the new skin; events and leaderboard moderable.

## M6 — Integration & hardening
- [ ] Launch-token verification (aud, exp ≤ 15 min, single-use `jti`), `dj:init` flow, token stripped from URL.
- [ ] `net/hostBridge.js` postMessage protocol per [INTEGRATION.md](INTEGRATION.md) §5 with origin allow-list.
- [ ] CSP incl. `frame-ancestors`, CORS allow-list, pino redaction, startup secret checks.
- [ ] OpenAPI generation (`zod-to-openapi`) at `/api/v1/openapi.json`.
- [ ] Dockerfile (multi-stage, non-root, healthcheck), docker-compose, graceful shutdown.
- [ ] Example host page `examples/host/index.html` + tiny host backend minting tokens & consuming events (used by E2E).
- [ ] Performance pass: object pooling for platforms/projectiles, `ImageBitmap`, avoid per-frame allocations; Lighthouse ≥ 90 on game page; bundle size check.
- [ ] README quick start verified from a clean clone.

**DoD:** Example host embeds the game, user plays as host identity, host receives signed webhook + pull events; all tests green; Docker image runs with only `.env`.

---

## Definition of Done (every task)
- Code follows layering (routes → services → repositories); no SQL outside repositories.
- Inputs validated with zod; errors in standard format.
- Unit/API tests added; CI green.
- Docs updated if a contract (API, event, schema, env var) changed.
