# Testing Strategy

| Layer | Tool | Location | Runs in CI |
|---|---|---|---|
| Unit (game logic, services, schemas) | Vitest | `tests/unit/` | ✔ |
| API (HTTP + DB) | Vitest + Supertest, SQLite `:memory:` | `tests/api/` | ✔ |
| End-to-end | Playwright (Chromium + WebKit mobile emulation) | `tests/e2e/` | ✔ (nightly + PR label) |
| Manual QA | Checklist below | — | before release |

Commands: `npm test` (unit + API), `npm run test:e2e`, `npm run test:coverage` (target ≥ 80% lines for `server/` and `client/game/world|engine`).

## 1. Unit tests

**Game (pure logic, no canvas):**
- Jump apex: normal ≈ 157 px, spring ≈ 424 px (± 2 px) at 60 Hz step.
- Collision: lands only when falling and feet crossed platform top; passes through while rising; no tunnelling at max fall speed.
- Screen wrap at both edges.
- Breakable platform: no bounce, emits break.
- Generator: for 10 000 random seeds × 30 000 score of height, every consecutive bounceable platform gap ≤ `maxGap`; hazards never block the only path.
- Determinism: same seed + same input sequence → identical world state hash.
- Score = `floor(maxHeight / 2)`; milestones triggered once.
- Power-up timers & immunity.

**Server:**
- `score.service` validation matrix (each reject reason, boundary values).
- Leaderboard period keys (UTC midnight, ISO week 53 / year boundary).
- Event schema validation (valid/invalid payload for every type).
- Webhook signature generation matches INTEGRATION.md verifier.
- Env validation (missing/weak secrets in production → throws).
- Theme schema: rejects external URLs, invalid colours, long texts.

## 2. API tests

- Identify: anonymous ok/disabled; launch token valid / expired / wrong aud / bad signature / replayed `jti`; banned player.
- Sessions: create closes previous open session (abandoned event); events batch dedupe; cap 2 000; `/end` idempotent; ownership (other player's session → 404).
- Leaderboard: ordering, ties, hidden/banned exclusion, `/me` around.
- Integration: API key required; cursor pagination returns every event exactly once across pages; filters.
- Admin: login success/failure/rate limit; cookie flags (`HttpOnly`, `SameSite=Strict`, `Secure` in prod); CSRF header required for mutations; every admin route 401 without cookie.
- Assets: PNG ok; `.png` that is actually HTML → 415; oversize → 413; SVG with `<script>`/`onload`/`foreignObject`/external `href` → sanitised or rejected; delete in-use → 409.
- Theme: draft → publish → `GET /config` returns new version + ETag change; rollback.
- Webhooks: delivered, retried on 500 with correct schedule (fake timers), marked failed after 7 attempts, manual retry.

## 3. E2E scenarios (Playwright)

1. **Play & score:** open `/`, enter nickname, start, inject deterministic input via test hook (`window.__DJ_TEST__` exposed only when `NODE_ENV=test`), die, see game-over with rank; leaderboard shows entry.
2. **Admin reskin:** login, upload `tests/fixtures/red-doodler.png` to `player.right`, verify preview iframe changes, publish; open `/` in new context → canvas pixel sample shows red sprite.
3. **Events:** after scenario 1, admin events explorer lists `game.started`, `game.ended`, `score.accepted`; export CSV contains them.
4. **Moderation:** hide score → disappears from public leaderboard.
5. **Host embed:** `examples/host` page mints token, iframe loads, `dj:identified` and `dj:game_over` received; host webhook receiver got signed `score.accepted`.
6. **Mobile:** iPhone 14 emulation — touch zones move player; pause on visibility change.

## 4. Performance

- Game: 60 fps sustained for 5 min run on Moto G (2022)-class device (Chrome remote debugging) — frame time p95 < 16.7 ms, no GC spikes > 5 ms.
- Load: game page JS ≤ 120 KB gz, total default theme assets ≤ 600 KB.
- API: `autocannon` 200 req/s mixed (`/leaderboard`, `/sessions/:id/events`) → p95 < 100 ms on 1 vCPU.

## 5. Manual QA checklist (release)

- [ ] Feel check vs original: jump height, horizontal control, wrap, spring, propeller, jetpack
- [ ] Every platform type, item and hazard seen and behaves per GAME_DESIGN
- [ ] Shooting desktop (Space, click) and mobile (tap)
- [ ] Tilt on real iOS (permission prompt) and Android
- [ ] Pause/resume, tab switch, mute persisted
- [ ] Offline: play works, "not saved" shown
- [ ] Every theme slot replaced with odd-sized art → still renders in its box, hitboxes unchanged
- [ ] Admin on mobile width usable
- [ ] Docker image from clean `.env.example` copy starts; missing secret → clear error
- [ ] Safari, Firefox, Edge smoke test
