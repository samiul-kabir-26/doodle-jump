# Host Integration Guide

How any system (web app, mobile web-view, portal) embeds the game, identifies its users, and consumes events to award points.

## 1. Modes

| Mode | When | Identity |
|---|---|---|
| **Standalone** | Opened directly, no token | Nickname + device ID (if `ALLOW_ANONYMOUS=true`) |
| **Embedded (host)** | Inside host iframe/web-view with launch token | Host's user id (`externalUserId`) |

## 2. Server configuration for a host

```env
HOST_SIGNING_SECRET=<shared secret, ≥ 32 random bytes, base64>
INTEGRATION_API_KEY=<random token for the host backend>
CORS_ORIGINS=https://app.host.com
FRAME_ANCESTORS=https://app.host.com
WEBHOOK_URL=https://api.host.com/hooks/doodle-jump      # optional
WEBHOOK_SECRET=<random secret>                          # optional
ALLOW_ANONYMOUS=false                                   # optional: host-only play
```

## 3. Launch token

The **host backend** mints a short-lived JWT (HS256) per game launch:

| Claim | Required | Value |
|---|---|---|
| `sub` | ✔ | Host user id (string ≤ 128) → `externalUserId` |
| `name` | ✔ | Display name for leaderboard (3–20 chars; truncated/sanitised server-side) |
| `aud` | ✔ | `"doodle-jump"` |
| `iat` | ✔ | now |
| `exp` | ✔ | ≤ `iat + 900` (15 min) |
| `jti` | ✔ | random, single-use |

```js
// Host backend (Node)
import { SignJWT } from 'jose';
const secret = Buffer.from(process.env.DJ_HOST_SIGNING_SECRET, 'base64');
const token = await new SignJWT({ name: user.displayName })
  .setProtectedHeader({ alg: 'HS256' })
  .setSubject(String(user.id))
  .setAudience('doodle-jump')
  .setIssuedAt()
  .setExpirationTime('10m')
  .setJti(crypto.randomUUID())
  .sign(secret);
```

The display name in the token overwrites the stored one each launch (host is source of truth).

## 4. Embedding

### 4.1 Token in URL (simplest)
```html
<iframe
  src="https://game.example.com/?token=eyJhbGciOi..."
  style="width:100%;max-width:420px;aspect-ratio:9/16;border:0"
  allow="accelerometer; gyroscope; autoplay"
  title="Jumpy Doodle"></iframe>
```
The game immediately removes `token` from the URL (`history.replaceState`) after reading it.

### 4.2 Token via postMessage (keeps token out of URLs/logs)
```html
<iframe id="dj" src="https://game.example.com/?embed=1" ...></iframe>
<script>
  const frame = document.getElementById('dj');
  const GAME_ORIGIN = 'https://game.example.com';
  window.addEventListener('message', async (e) => {
    if (e.origin !== GAME_ORIGIN || e.data?.source !== 'doodle-jump') return;
    if (e.data.type === 'dj:ready') {
      const { token } = await fetch('/api/doodle-jump/launch-token').then(r => r.json());
      frame.contentWindow.postMessage({ source: 'host', type: 'dj:init', payload: { token } }, GAME_ORIGIN);
    }
    if (e.data.type === 'dj:game_over') console.log('score', e.data.payload.score);
  });
</script>
```
With `?embed=1` and no token, the game waits (up to 10 s) for `dj:init` before falling back to standalone mode (or an error screen if anonymous play is disabled).

## 5. postMessage protocol

All messages: `{ source: "doodle-jump" | "host", type: string, payload: object }`. The game only accepts messages from origins listed in `FRAME_ANCESTORS` and only posts to `document.referrer`'s origin when it matches that list.

**Host → Game**
| type | payload | Effect |
|---|---|---|
| `dj:init` | `{ token, muted?, locale? }` | Identify player |
| `dj:pause` / `dj:resume` | `{}` | Pause/resume run |
| `dj:restart` | `{}` | Return to menu |
| `dj:set_muted` | `{ muted }` | Mute toggle |

**Game → Host**
| type | payload |
|---|---|
| `dj:ready` | `{ version, themeVersion }` |
| `dj:identified` | `{ playerId, externalUserId, displayName }` |
| `dj:game_started` | `{ sessionId }` |
| `dj:score` | `{ score }` — throttled to 1/s while playing (optional live display) |
| `dj:game_over` | `{ sessionId, score, accepted, personalBest, rank }` |
| `dj:resize` | `{ height }` — preferred iframe height |
| `dj:error` | `{ code, message }` (e.g. `INVALID_LAUNCH_TOKEN`) |

⚠ postMessage data is for UX only. **Never award points from postMessage** — use server events (§6).

## 6. Consuming events for points

### Option A — Pull (recommended to start)
```js
let cursor = await db.getCursor('doodle-jump'); // persisted
while (true) {
  const r = await fetch(`https://game.example.com/api/v1/events?after=${cursor}&limit=500&trust=server`, {
    headers: { Authorization: `Bearer ${process.env.DJ_INTEGRATION_API_KEY}` }
  }).then(r => r.json());
  for (const evt of r.events) {
    await awardPointsIdempotently(evt);   // UNIQUE(evt.id) in your ledger
  }
  cursor = r.nextCursor;
  await db.saveCursor('doodle-jump', cursor);
  if (!r.hasMore) await sleep(5000);
}
```

### Option B — Webhook
```js
import crypto from 'node:crypto';
app.post('/hooks/doodle-jump', express.raw({ type: 'application/json' }), (req, res) => {
  const header = req.get('X-DJ-Signature') || '';
  const { t, v1 } = Object.fromEntries(header.split(',').map(p => p.split('=')));
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return res.sendStatus(400);
  const expected = crypto.createHmac('sha256', process.env.DJ_WEBHOOK_SECRET)
    .update(`${t}.${req.body}`).digest('hex');
  const ok = v1 && v1.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(v1), Buffer.from(expected));
  if (!ok) return res.sendStatus(401);
  const evt = JSON.parse(req.body);
  queue.push(evt);            // process async, dedupe on evt.id
  res.sendStatus(204);        // respond fast (< 10 s)
});
```
Use both for robustness: webhook for latency, periodic pull as reconciliation.

See [EVENTS.md](EVENTS.md) §8 for a sample points mapping and the trust rule.

## 7. Querying player stats
`GET /api/v1/players/:externalUserId/stats` with the integration key → best score, runs, ranks (see [API.md](API.md) §2).

## 8. Checklist

- [ ] Secrets generated and stored in both systems
- [ ] `FRAME_ANCESTORS` & `CORS_ORIGINS` set to host origin(s)
- [ ] Host endpoint that mints launch tokens (authenticated)
- [ ] iframe embedded with `allow="accelerometer; gyroscope; autoplay"`
- [ ] Event consumer with idempotent ledger (unique `event.id`)
- [ ] Webhook signature verification + timestamp tolerance
- [ ] Monitoring: alert if cursor lag > 1 h or webhook failures appear in admin
