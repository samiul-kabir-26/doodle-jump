# API Specification (v1)

Base path: `/api/v1`. JSON in/out (`Content-Type: application/json`) unless stated. Timestamps are ISO-8601 UTC strings. IDs are prefixed ULIDs (`plr_…`, `ses_…`, `scr_…`, `evt_…`, `ast_…`).

## 0. Conventions

### Auth schemes
| Scheme | Header / cookie | Used by |
|---|---|---|
| **Player** | `Authorization: Bearer <playerToken>` | Game client |
| **Integration** | `Authorization: Bearer <INTEGRATION_API_KEY>` | Host backends |
| **Admin** | Cookie `dj_admin` + header `X-Requested-With: dj-admin` on mutations | Admin SPA |

### Error format
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "score must be >= 0", "details": [{ "path": "score", "issue": "too_small" }], "requestId": "req_01J…" } }
```
| HTTP | `code` |
|---|---|
| 400 | `VALIDATION_ERROR` |
| 401 | `UNAUTHENTICATED` |
| 403 | `FORBIDDEN`, `PLAYER_BANNED` |
| 404 | `NOT_FOUND` |
| 409 | `SESSION_CLOSED`, `CONFLICT` |
| 413 | `PAYLOAD_TOO_LARGE` |
| 415 | `UNSUPPORTED_MEDIA_TYPE` |
| 422 | `INVALID_LAUNCH_TOKEN`, `INVALID_ASSET` |
| 429 | `RATE_LIMITED` (with `Retry-After`) |
| 500 | `INTERNAL` |

### Pagination
- Offset lists: `?limit=` (default 50, max 200) `&offset=`.
- Event feeds: cursor `?after=<seq>`; response includes `nextCursor`, `hasMore`.

---

## 1. Public / Game API

### `GET /health` · `GET /ready`
No `/api/v1` prefix. `200 {"status":"ok"}`; `/ready` checks DB (`503` if not).

### `GET /api/v1/config`
Public. Returns the **published** theme + client-relevant settings. `ETag` + `Cache-Control: no-cache` (revalidate).
Query `preview=draft` → returns the draft theme; requires admin cookie (else 401).
```json
{
  "themeVersion": 7,
  "theme": { "...": "see ADMIN_PANEL.md §4 / shared/themeSchema.js" },
  "gameplay": { "difficultyMultiplier": 1.0, "powerupRateMultiplier": 1.0, "enabled": { "monsters": true, "blackHoles": true, "jetpack": true, "propeller": true, "springShoes": true, "trampoline": true, "shooting": true } },
  "features": { "anonymousAllowed": true, "leaderboardPeriods": ["daily", "weekly", "all"] }
}
```

### `POST /api/v1/players/identify`
Public, rate-limited 20/min/IP. One of two bodies:
```json
{ "launchToken": "<HS256 JWT from host>" }
```
```json
{ "nickname": "Ratul", "deviceId": "dev_8d0f…(uuid stored in localStorage)" }
```
`200`
```json
{
  "player": { "id": "plr_01J…", "displayName": "Ratul", "externalUserId": "user-42", "mode": "host" },
  "playerToken": "<JWT 24h>",
  "expiresAt": "2026-10-14T10:00:00Z"
}
```
Errors: `422 INVALID_LAUNCH_TOKEN`, `403 FORBIDDEN` (anonymous disabled), `403 PLAYER_BANNED`.
Emits `player.identified`.

### `POST /api/v1/sessions` — Player
Starts a run. Body `{}` (optional `{ "client": { "version": "1.0.0", "input": "touch" } }`).
`201`
```json
{ "sessionId": "ses_01J…", "seed": 2849120391, "themeVersion": 7, "startedAt": "2026-10-13T10:00:00Z" }
```
Any previous `open` session of this player is closed as `abandoned`. Emits `game.started`.

### `POST /api/v1/sessions/:sessionId/events` — Player
Batch of client gameplay events (max 100/batch, max 2 000/session). Also accepts `text/plain` body for `navigator.sendBeacon` with token in body field `playerToken`.
```json
{
  "events": [
    { "clientEventId": "c-1", "seq": 1, "type": "powerup.collected", "clientTs": 1234, "data": { "kind": "jetpack", "height": 1820 } },
    { "clientEventId": "c-2", "seq": 2, "type": "monster.killed", "clientTs": 5120, "data": { "monster": "basic", "method": "stomp", "height": 4410 } }
  ]
}
```
- Only types with `source: client` in [EVENTS.md](EVENTS.md) accepted; others → `400`.
- `clientEventId` dedupes retries per session.
- `clientTs` = ms since run start.
`202 { "accepted": 2, "duplicates": 0 }`. `409 SESSION_CLOSED` if session ended > 10 s ago.

### `POST /api/v1/sessions/:sessionId/end` — Player
```json
{
  "score": 12450,
  "maxHeight": 24900,
  "durationMs": 182000,
  "reason": "fell",
  "stats": {
    "platformsLanded": 210, "platformsBroken": 14, "springsUsed": 6, "trampolinesUsed": 1,
    "powerups": { "propeller": 1, "jetpack": 1, "spring_shoes": 0 },
    "monstersKilled": { "stomp": 3, "shot": 5 }, "shotsFired": 22
  }
}
```
`reason ∈ fell | monster | black_hole | quit`.
`200`
```json
{
  "accepted": true,
  "scoreId": "scr_01J…",
  "personalBest": { "score": 12450, "isNew": true },
  "rank": { "daily": 3, "weekly": 11, "all": 57 },
  "milestones": [1000, 5000, 10000]
}
```
Rejected run: `200 { "accepted": false, "reason": "SCORE_RATE_EXCEEDED" }` (the client shows the score but "not ranked"). Rejection reasons: `SESSION_TOO_SHORT`, `SESSION_EXPIRED`, `SCORE_HEIGHT_MISMATCH`, `SCORE_RATE_EXCEEDED`, `PLAYER_BANNED`.
Idempotent: repeating the call returns the stored result. Emits per [EVENTS.md](EVENTS.md) §5.

### `GET /api/v1/leaderboard`
Public. Query: `period=daily|weekly|all` (default `all`), `limit` (≤ 100), `offset`. Cached 5 s.
```json
{
  "period": "weekly",
  "periodStart": "2026-10-12T00:00:00Z",
  "entries": [
    { "rank": 1, "playerId": "plr_…", "displayName": "Mina", "score": 48210, "achievedAt": "2026-10-13T08:12:00Z" }
  ],
  "total": 1342
}
```

### `GET /api/v1/leaderboard/me` — Player
`?period=` → `{ "rank": 57, "score": 12450, "around": [ …2 above, me, 2 below… ] }` (`rank: null` if no score).

---

## 2. Integration API (host backends)

Disabled (404) if `INTEGRATION_API_KEY` unset.

### `GET /api/v1/events`
Cursor feed of events for points processing.
Query: `after` (seq, default 0), `limit` (≤ 1000, default 100), `type` (comma list, supports `score.*`), `category`, `trust=server|client`, `externalUserId`, `since` (ISO).
Admin-category events are excluded unless `category=admin` explicitly.
```json
{
  "events": [ { "id": "evt_…", "seq": 1042, "type": "game.ended", "...": "envelope, see EVENTS.md" } ],
  "nextCursor": 1042,
  "hasMore": false
}
```
Consumers persist `nextCursor` and process idempotently by `id`.

### `GET /api/v1/players/:externalUserId/stats`
```json
{
  "player": { "id": "plr_…", "externalUserId": "user-42", "displayName": "Ratul", "banned": false },
  "bestScore": 12450, "totalRuns": 37, "totalHeight": 512300,
  "rank": { "daily": 3, "weekly": 11, "all": 57 },
  "lastPlayedAt": "2026-10-13T10:03:02Z"
}
```

### `GET /api/v1/event-types`
Returns the event catalog with JSON Schemas (generated from `shared/eventTypes.js`). Also public (no auth) for documentation tooling.

---

## 3. Admin API (`/api/v1/admin`)

### Auth
| Method & path | Body | Response |
|---|---|---|
| `POST /login` | `{ "username", "password" }` | `204` + `Set-Cookie: dj_admin=…`; `401` generic; rate limit 5/min/IP |
| `POST /logout` | — | `204`, cookie cleared |
| `GET /me` | — | `{ "username": "admin", "expiresAt": "…" }` |

### Dashboard
`GET /dashboard?range=24h|7d|30d`
```json
{ "runs": 812, "uniquePlayers": 233, "avgScore": 3120, "maxScore": 48210, "rejectedRuns": 4,
  "eventsPerMinute": [{ "t": "2026-10-13T10:00:00Z", "count": 41 }],
  "webhook": { "enabled": true, "pending": 0, "failedLast24h": 1, "lastSuccessAt": "…" } }
```

### Theme
| Method & path | Description |
|---|---|
| `GET /theme` | `{ "draft": {...}, "published": { "version": 7, "theme": {...}, "publishedAt": "…" } }` |
| `PUT /theme/draft` | Full draft theme (validated by `themeSchema`). `200` with saved draft |
| `PATCH /theme/draft` | JSON merge-patch of draft |
| `POST /theme/draft/discard` | Reset draft to published |
| `POST /theme/publish` | `{ "note": "Halloween skin" }` → `201 { "version": 8 }`; emits `admin.theme_published` |
| `GET /theme/versions` | List `{ version, note, publishedAt }` |
| `GET /theme/versions/:version` | Full theme JSON |
| `POST /theme/rollback/:version` | Publishes a copy of that version as a new version |
| `POST /theme/reset-defaults` | Draft ← bundled default theme |

### Assets
| Method & path | Description |
|---|---|
| `GET /assets?kind=image\|audio` | List `{ id, url, mime, width, height, bytes, originalName, createdAt, usedInSlots[] }` |
| `POST /assets` | `multipart/form-data` field `file` (+ optional `slot` to auto-assign in draft). `201` asset. Errors `413`, `415`, `422 INVALID_ASSET` |
| `DELETE /assets/:id` | `409 CONFLICT` if referenced by draft or published theme |

Allowed: `image/png`, `image/webp`, `image/svg+xml`, `image/gif` (first frame used), `audio/mpeg`, `audio/ogg`, `audio/wav`. Max image 2048×2048.

### Events
| Method & path | Description |
|---|---|
| `GET /events` | Same filters as integration feed plus `playerId`, `sessionId`, `from`, `to`, `q` (search in data); supports `after` cursor **and** `order=desc` for the explorer |
| `GET /events/:id` | Full event |
| `GET /events/export?format=csv\|ndjson&…filters` | Streamed download (`Content-Disposition: attachment`) |
| `GET /events/stats?range=` | Counts per type |

### Leaderboard & players
| Method & path | Description |
|---|---|
| `GET /leaderboard?period=&includeHidden=true` | Like public + hidden/banned flags + `sessionId` |
| `POST /scores/:scoreId/hide` | `{ "reason": "cheating" }` → emits `admin.score_hidden` |
| `POST /scores/:scoreId/restore` | emits `admin.score_restored` |
| `GET /players?q=&banned=` | Search players |
| `GET /players/:id` | Player + recent sessions + stats |
| `POST /players/:id/ban` / `POST /players/:id/unban` | `{ "reason" }` → emits `admin.player_banned` / `admin.player_unbanned` |
| `GET /sessions/:id` | Session detail incl. its events (for cheat investigation) |

### Settings & webhooks
| Method & path | Description |
|---|---|
| `GET /settings` | `{ gameplay: {...}, webhook: { enabled, url, eventTypes[], secretSet: true }, antiCheat: { maxScoreRate, minDurationMs } }` |
| `PUT /settings` | Partial update; secret write-only (`webhook.secret`). Emits `admin.settings_updated` (no secrets in payload) |
| `POST /webhooks/test` | Sends a `system.webhook_test` event; returns `{ status, responseCode, durationMs }` |
| `GET /webhooks/deliveries?status=pending\|failed\|delivered` | Delivery log |
| `POST /webhooks/deliveries/:id/retry` | Requeue |

---

## 4. Rate limits (defaults)

| Scope | Limit |
|---|---|
| `POST /players/identify` | 20 / min / IP |
| Player endpoints | 60 / min / player |
| `POST /sessions` | 30 / min / player |
| Integration API | 600 / min / key |
| Admin login | 5 / min / IP |
| Admin API | 300 / min / session |

## 5. Versioning

- Breaking changes → `/api/v2`. Additive fields allowed in v1 at any time; consumers must ignore unknown fields.
- Event payload versions are independent (see [EVENTS.md](EVENTS.md) §7).
- An OpenAPI 3.1 document is generated from the zod schemas at `GET /api/v1/openapi.json` (implementation task in M6).
