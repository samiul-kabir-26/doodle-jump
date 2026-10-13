# Jumpy Doodle — Doodle Jump as a Microservice

A faithful browser clone of **Doodle Jump** (HTML5 Canvas + JavaScript, Tailwind CSS UI) packaged as an embeddable microservice with:

- 🎮 **Game** — endless vertical platformer for desktop and mobile with physics, power-ups, monsters, shooting, and audio
- 🏆 **Leaderboard** — daily, weekly and all-time rankings with tie-breaking and rank window queries
- ⚡ **Event stream** — versioned, signed events for host systems to award points (pull API + signed webhooks)
- 🛠 **Admin panel** — env-based fixed credentials; reskin every sprite slot / color / text / sound with instant live preview & versioned publishing, explore/export events (CSV/NDJSON), moderate leaderboards, and tune gameplay settings

> Status: **Implementation Complete & Tested** (Unit, API, and Integration test suite passing).

---

## Documentation

| Doc | What it covers |
|---|---|
| [PRD](docs/PRD.md) | Goals, personas, user stories, requirements, scope, risks |
| [Game Design](docs/GAME_DESIGN.md) | Mechanics, physics constants, entities, difficulty curve, scoring, controls |
| [Architecture](docs/ARCHITECTURE.md) | Components, folder layout, flows, env config, security, deployment |
| [API](docs/API.md) | Public, integration and admin REST endpoints |
| [Events](docs/EVENTS.md) | Event envelope, catalog, delivery guarantees, webhooks, points mapping |
| [Data Model](docs/DATA_MODEL.md) | SQLite schema, indexes, jobs |
| [Admin Panel](docs/ADMIN_PANEL.md) | Screens, theme editor, theme schema |
| [Integration](docs/INTEGRATION.md) | Embedding, launch tokens, postMessage, consuming events |
| [Deployment Guide](docs/DEPLOYMENT.md) | Production Docker, Nginx, Caddy, backup, monitoring & operations |
| [Implementation Plan](docs/IMPLEMENTATION_PLAN.md) | Milestones M0–M6 with task checklists |
| [Testing](docs/TESTING.md) | Unit, API, E2E, performance, QA checklist |

---

## Tech Stack

Node.js 24 · Express 5 · SQLite (`better-sqlite3`, WAL mode) · Vite 6 · Tailwind CSS v4 · Canvas 2D · Zod · Jose (JWT) · Sharp · DOMPurify · Vitest · Docker

---

## Quick Start (Local Development)

### 1. Environment Setup
```bash
cp .env.example .env
npm install
```

### 2. Run Database Migrations & Seeds
```bash
npm run migrate
```

### 3. Build & Run
Development mode (concurrent Express API + Vite dev server):
```bash
npm run dev
```

- **Game**: [http://localhost:5173](http://localhost:5173) (or `http://localhost:3000` when built)
- **Admin Panel**: [http://localhost:5173/admin](http://localhost:5173/admin) (or `http://localhost:3000/admin`)
- Default Admin Credentials:
  - Username: `admin`
  - Password: `change-me-please` (configured in `.env`)

---

## Production & Docker Deployment

Build and start the single-container microservice:

```bash
docker compose up -d --build
```
Access the application at [http://localhost:3000](http://localhost:3000).

For full production deployment instructions (Nginx, Caddy, SSL, automated online SQLite backups, monitoring), refer to [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

---

## Testing

Run unit and API integration tests:

```bash
npm test
```
