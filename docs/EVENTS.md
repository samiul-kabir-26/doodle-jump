# Event Specification

Events are the contract between this game service and any host system. A host will use them to award points, badges, or analytics. They are **append-only, immutable, versioned** and delivered **at-least-once**.

Source of truth in code: `shared/eventTypes.js` (zod schemas). This document and `GET /api/v1/event-types` are generated from / kept in sync with it.

## 1. Envelope

```json
{
  "id": "evt_01JA2X9K3M7Q8R4T5V6W7Y8Z9A",
  "seq": 1042,
  "type": "game.ended",
  "version": 1,
  "category": "gameplay",
  "trust": "server",
  "occurredAt": "2026-10-13T10:03:02.120Z",
  "receivedAt": "2026-10-13T10:03:02.140Z",
  "source": { "service": "doodle-jump", "instance": "dj-1", "env": "production" },
  "player": { "id": "plr_01J…", "externalUserId": "user-42", "displayName": "Ratul" },
  "sessionId": "ses_01J…",
  "data": { }
}
```

| Field | Meaning |
|---|---|
| `id` | Globally unique, use for **idempotency** |
| `seq` | Monotonic integer per deployment; the **cursor** for pull consumers. Gaps possible (retention), never reordered |
| `type` | `<domain>.<action>` |
| `version` | Payload schema version for this `type` |
| `category` | `player` · `gameplay` · `score` · `leaderboard` · `admin` · `system` |
| `trust` | `server` = produced/validated by server logic. `client` = reported by the game client, **not tamper-proof** |
| `occurredAt` | When it happened (client events: session start + `clientTs`, clamped to session window) |
| `player` | Null for admin/system events. `externalUserId` null for anonymous players |
| `sessionId` | Null if not tied to a run |

> **Rule for points systems:** award points primarily on `trust: "server"` events (`score.accepted`, `milestone.reached`, `score.personal_best`, `leaderboard.rank_changed`). Use `client` events only for low-value or capped rewards, and ignore any client event whose session ended with `score.rejected`.

## 2. Catalog

### Player
| Type | Trust | Data |
|---|---|---|
| `player.identified` | server | `{ mode: "host"\|"anonymous", isNew: boolean }` |

### Gameplay
| Type | Trust | Data |
|---|---|---|
| `game.started` | server | `{ seed, themeVersion, client: { version, input } }` |
| `game.ended` | server | `{ score, maxHeight, durationMs, reason: "fell"\|"monster"\|"black_hole"\|"quit"\|"abandoned", accepted: boolean, stats: {…see API end body} }` |
| `game.paused` | client | `{ height, cause: "user"\|"visibility" }` |
| `game.resumed` | client | `{ height, pausedMs }` |
| `powerup.collected` | client | `{ kind: "propeller"\|"jetpack"\|"spring_shoes"\|"shield", height }` |
| `monster.killed` | client | `{ monster: "basic"\|"flyer"\|"big"\|"ufo", method: "stomp"\|"shot", height }` |
| `platform.broken` | client | `{ height }` — sampled: max 1 per 10 s per session (rest counted in stats) |
| `spring.used` | client | `{ kind: "spring"\|"trampoline", height }` — sampled like above |

### Score
| Type | Trust | Data |
|---|---|---|
| `score.accepted` | server | `{ scoreId, score, maxHeight, durationMs }` |
| `score.rejected` | server | `{ score, reason: "SESSION_TOO_SHORT"\|"SESSION_EXPIRED"\|"SCORE_HEIGHT_MISMATCH"\|"SCORE_RATE_EXCEEDED"\|"PLAYER_BANNED" }` |
| `score.personal_best` | server | `{ scoreId, score, previousBest: number\|null }` |
| `milestone.reached` | server | `{ milestone: 1000\|5000\|10000\|25000\|50000\|100000, score }` — one per milestone ≤ accepted score, **only first time per run** |

### Leaderboard
| Type | Trust | Data |
|---|---|---|
| `leaderboard.rank_changed` | server | `{ period: "daily"\|"weekly"\|"all", previousRank: number\|null, rank, score, enteredTop: 10\|100\|null }` — emitted only if rank improved |

### Admin (excluded from integration feed unless requested)
| Type | Data |
|---|---|
| `admin.login` | `{ username }` |
| `admin.login_failed` | `{ usernameAttempted }` (no password, no IP) |
| `admin.theme_published` | `{ version, note, changedSlots: string[] }` |
| `admin.asset_uploaded` | `{ assetId, mime, bytes }` |
| `admin.asset_deleted` | `{ assetId }` |
| `admin.score_hidden` / `admin.score_restored` | `{ scoreId, playerId, reason }` |
| `admin.player_banned` / `admin.player_unbanned` | `{ playerId, reason }` |
| `admin.settings_updated` | `{ changedKeys: string[] }` |

### System
| Type | Data |
|---|---|
| `system.webhook_test` | `{ message: "ping" }` |
| `system.started` | `{ version, commit }` |

## 3. Example: one run

```
seq 101 player.identified        server
seq 102 game.started             server
seq 103 powerup.collected        client  {kind:"propeller"}
seq 104 monster.killed           client  {method:"shot"}
seq 105 game.ended               server  {score:12450, accepted:true}
seq 106 score.accepted           server
seq 107 milestone.reached        server  {milestone:1000}
seq 108 milestone.reached        server  {milestone:5000}
seq 109 milestone.reached        server  {milestone:10000}
seq 110 score.personal_best      server
seq 111 leaderboard.rank_changed server  {period:"daily", rank:3}
```

## 4. Guarantees

| Property | Guarantee |
|---|---|
| Durability | Event is committed in the same DB transaction as the state change that caused it (e.g. score insert) |
| Ordering | `seq` strictly increasing in commit order. Within a session, server events of one request are contiguous |
| Delivery | At-least-once (pull and webhook). Consumers **must** dedupe on `id` |
| Immutability | Events are never updated. Corrections are new events (e.g. `admin.score_hidden`) |
| Retention | Purged after `EVENT_RETENTION_DAYS` (default 180). Consumers should poll at least daily |

## 5. Which endpoint emits what

| Trigger | Events |
|---|---|
| `POST /players/identify` | `player.identified` |
| `POST /sessions` | `game.started` (+ `game.ended {reason:"abandoned", accepted:false}` for a previously open session) |
| `POST /sessions/:id/events` | the submitted client events |
| `POST /sessions/:id/end` (accepted) | `game.ended`, `score.accepted`, `milestone.reached`×n, `score.personal_best`?, `leaderboard.rank_changed`×(0–3) |
| `POST /sessions/:id/end` (rejected) | `game.ended {accepted:false}`, `score.rejected` |
| Session idle > 2 h (cleanup job) | `game.ended {reason:"abandoned", accepted:false}` |
| Admin actions | corresponding `admin.*` |

## 6. Delivery

### 6.1 Pull
`GET /api/v1/events?after=<lastSeq>&limit=500` with `Authorization: Bearer <INTEGRATION_API_KEY>`. Loop while `hasMore`. Store `nextCursor` **after** processing.

### 6.2 Webhook (push)
Configured by env (`WEBHOOK_URL`, `WEBHOOK_SECRET`) or admin settings; an event-type filter (glob list, default `score.*, milestone.*, leaderboard.*, game.ended`) limits what is pushed.

Request:
```
POST <WEBHOOK_URL>
Content-Type: application/json
User-Agent: doodle-jump-webhook/1
X-DJ-Event-Id: evt_01J…
X-DJ-Event-Type: score.accepted
X-DJ-Delivery-Id: dlv_01J…
X-DJ-Signature: t=1760349782,v1=5f2b…(hex)

<event envelope JSON>
```
Signature: `v1 = hex(HMAC_SHA256(WEBHOOK_SECRET, "${t}.${rawBody}"))`. Receivers must verify with a constant-time compare and reject if `|now − t| > 300 s`. (Verification snippet in [INTEGRATION.md](INTEGRATION.md).)

Success = any `2xx` within 10 s. Otherwise retry with backoff: **1 min, 5 min, 30 min, 2 h, 6 h, 12 h** (7 attempts total) then `failed` (visible and retryable in admin). Deliveries for different events are independent (no head-of-line blocking), so receivers must not assume order — use `seq` if order matters.

## 7. Versioning rules

- Adding optional fields to `data` → same `version`.
- Removing/renaming/changing meaning of a field → `version + 1`; for 90 days the server emits **both** versions (distinct `id`s, same `type`) and consumers filter by `version`.
- New event types may appear anytime; consumers must ignore unknown types.

## 8. Sample points mapping (for the future host integration)

Illustrative only — implemented by the host, not this service.

| Event | Condition | Points |
|---|---|---|
| `score.accepted` | per run | `floor(score / 100)`, cap 500/run |
| `milestone.reached` | 1 000 / 5 000 / 10 000 / 25 000 / 50 000 / 100 000 | 5 / 20 / 50 / 100 / 250 / 500 |
| `score.personal_best` | — | 25 |
| `leaderboard.rank_changed` | `enteredTop = 10`, period `weekly` | 200 (once per week) |
| `monster.killed` (client) | only if same session has `score.accepted` | 1 each, cap 20/day |
| `game.ended` | `accepted: true`, first run of the day | 10 (daily streak) |
