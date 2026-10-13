# Deployment & Operations Guide

This guide covers everything needed to deploy, configure, secure, and operate the **Jumpy Doodle** microservice in production.

---

## 1. Overview & Architecture

Jumpy Doodle is designed as a **self-contained microservice** contained in a single container or Node.js runtime process:
- **Express 5 API Server**: Handles game sessions, anti-cheat validation, leaderboard, admin panel API, integration event stream, and background webhook dispatching.
- **SQLite 3 (`better-sqlite3`)**: Runs in WAL mode with synchronous durability on a persistent `/app/data` volume.
- **Frontend SPA**: Pre-built static bundles (`dist/index.html` for game and `dist/admin/index.html` for admin panel) served directly by Express with aggressive caching and ETags.
- **Asset Storage**: Uploaded custom theme assets are stored in `/app/data/uploads` with content-hashed immutable URLs.

---

## 2. Prerequisites

| Requirement | Minimum | Recommended |
|---|---|---|
| OS | Linux (Ubuntu 22.04+, Debian 12+, Alpine) | Linux x86_64 or arm64 |
| CPU | 1 vCPU | 2 vCPUs |
| RAM | 512 MB | 1 GB |
| Disk | 1 GB (SSD) | 5 GB+ (depending on event retention & uploads) |
| Runtime | Node.js 24 LTS or Docker 24+ | Docker + Docker Compose |

---

## 3. Configuration & Secrets Setup

Copy `.env.example` to `.env` and configure production secrets:

```bash
cp .env.example .env
```

### Generating Strong Production Secrets
Generate random 32+ character secrets using OpenSSL:

```bash
# Generate ADMIN_JWT_SECRET
openssl rand -base64 48

# Generate PLAYER_JWT_SECRET
openssl rand -base64 48

# Generate HOST_SIGNING_SECRET (for host iframe launch tokens)
openssl rand -base64 48

# Generate INTEGRATION_API_KEY
openssl rand -hex 32

# Generate WEBHOOK_SECRET (optional HMAC secret)
openssl rand -hex 32
```

### Production `.env` Reference

```env
# ─── Server ───────────────────────────────────────────────
NODE_ENV=production
PORT=3000
PUBLIC_BASE_URL=https://game.yourdomain.com
LOG_LEVEL=info

# ─── Admin panel ──────────────────────────────────────────
ADMIN_USERNAME=admin
# Must be at least 12 characters in production:
ADMIN_PASSWORD=your-super-strong-admin-password
ADMIN_JWT_SECRET=paste-your-generated-base64-secret-here
ADMIN_SESSION_HOURS=8

# ─── Players ──────────────────────────────────────────────
PLAYER_JWT_SECRET=paste-your-generated-base64-secret-here
ALLOW_ANONYMOUS=true

# ─── Host integration (Optional) ──────────────────────────
HOST_SIGNING_SECRET=paste-your-generated-base64-secret-here
INTEGRATION_API_KEY=paste-your-generated-hex-key-here
CORS_ORIGINS=https://app.hostdomain.com,https://portal.hostdomain.com
FRAME_ANCESTORS='self' https://app.hostdomain.com https://portal.hostdomain.com

# ─── Webhook (Optional) ───────────────────────────────────
WEBHOOK_URL=https://api.hostdomain.com/hooks/doodle-jump
WEBHOOK_SECRET=paste-your-generated-webhook-secret-here

# ─── Storage ──────────────────────────────────────────────
DB_PATH=/app/data/doodle.db
UPLOAD_DIR=/app/data/uploads
MAX_UPLOAD_MB=2

# ─── Anti-cheat & Retention ───────────────────────────────
MAX_SCORE_RATE=450
EVENT_RETENTION_DAYS=180
```

> [!IMPORTANT]
> The server automatically fails to start in `production` mode if `ADMIN_PASSWORD` is fewer than 12 characters, or if `ADMIN_JWT_SECRET` or `PLAYER_JWT_SECRET` are fewer than 32 characters.

---

## 4. Option A: Docker Compose Deployment (Recommended)

### 1. Build and Start Container
```bash
docker compose up -d --build
```

### 2. Verify Container Health
```bash
docker compose ps
docker compose logs -f doodle-jump
```

The container includes an integrated healthcheck testing `GET http://localhost:3000/health`.

### 3. Updating the Container
```bash
git pull
docker compose build --no-cache
docker compose up -d
```

---

## 5. Option B: Bare-Metal / PM2 Deployment

If deploying directly on a Linux VPS without Docker:

### 1. Install Node.js 24 & Dependencies
```bash
# Install Node.js 24 LTS via NodeSource
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install -y nodejs build-essential

# Verify versions
node -v   # v24.x.x
npm -v    # 11.x.x
```

### 2. Install Project Dependencies & Build
```bash
npm ci
npm run build
```

### 3. Run Migrations
```bash
npm run migrate
```

### 4. Manage with PM2
```bash
sudo npm install -g pm2
pm2 start server/index.js --name "doodle-jump" --time
pm2 save
pm2 startup
```

---

## 6. Reverse Proxy Configuration

Always terminate TLS/HTTPS at a reverse proxy in front of the microservice.

### Nginx Configuration

```nginx
# /etc/nginx/sites-available/doodle-jump.conf
server {
    listen 80;
    server_name game.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name game.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/game.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/game.yourdomain.com/privkey.pem;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support (if needed)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_buffering off;
        proxy_read_timeout 60s;
    }
}
```

### Caddy Configuration

```caddyfile
game.yourdomain.com {
    reverse_proxy 127.0.0.1:3000
}
```

---

## 7. Database Backups & Maintenance

SQLite runs in `WAL` (Write-Ahead Logging) mode. Never copy `doodle.db` while the process is writing without using the online backup API.

### Hot Online Backup
To create a safe hot backup of the live database without stopping the server:

```bash
sqlite3 data/doodle.db ".backup 'data/doodle-backup-$(date +%Y%m%d_%H%M%S).db'"
```

### Automated Backup Cron Job
Add to `crontab -e`:

```bash
# Run online backup daily at 03:00 UTC and retain 14 days
0 3 * * * sqlite3 /path/to/data/doodle.db ".backup '/path/to/backups/doodle-$(date +\%F).db'" && find /path/to/backups -name "doodle-*.db" -mtime +14 -delete
```

### Asset Backups
Uploads in `data/uploads/` are immutable content-hashed files:
```bash
rsync -avz data/uploads/ /backup/location/uploads/
```

---

## 8. Health Checks & Observability

- **Liveness probe**: `GET /health` → returns `200 {"status":"ok"}`.
- **Readiness probe**: `GET /ready` → performs a database read query and returns `200 {"status":"ok"}` (or `503` if DB unavailable).
- **OpenAPI Schema**: `GET /api/v1/openapi.json` → JSON OpenAPI 3.1 specification.
- **Event catalog**: `GET /api/v1/event-types` → Returns the full schema catalog for integration tooling.

---

## 9. Post-Deployment Verification & Testing Checklist

After starting the service:

1. **Check Liveness**:
   ```bash
   curl -i http://localhost:3000/health
   # Expected: HTTP/1.1 200 OK  {"status":"ok"}
   ```

2. **Open the Game**:
   - Navigate to `http://localhost:3000` (or `https://game.yourdomain.com`).
   - Enter a nickname and press **Play Now**.
   - Verify keyboard (`←`/`→`, `Space`), touch zones, bounce physics, sound effects, and score tracking.
   - Verify that ending a run displays the Game Over overlay and updates the leaderboard.

3. **Open the Admin Panel**:
   - Navigate to `http://localhost:3000/admin`.
   - Log in using `ADMIN_USERNAME` and `ADMIN_PASSWORD`.
   - Verify the Dashboard cards and event tail.
   - In the **Theme & Reskin** page, test editing a color or title and observe the live phone preview iframe update instantly.
   - In the **System Settings** page, click **Send Test Webhook Ping** to test webhook dispatching.
