# Capture — Real-Time Shared Grid

A competitive real-time tile-capture game. 1,500 tiles. Many players. One grid.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + TypeScript + Vite |
| Backend | Node.js + Express + Socket.io |
| Database | PostgreSQL 16 (via Docker) |
| ORM | TypeORM with versioned migrations |
| Auth | JWT + bcrypt (register / login) |
| Real-time | Socket.io WebSockets |
| Leaderboard | Redis sorted sets (`ZREVRANGE` top 10) |

Each **game** owns its own grid, players, and leaderboard. Today the server loads a single default game (`capture-grid`); the schema is ready for multiple games later.

## Quick Start

### 1. Start PostgreSQL

```bash
docker compose up -d
```

### 2. Install dependencies

```bash
npm install                    # root (installs concurrently)
npm install --prefix server    # server deps
npm install --prefix client    # client deps
```

### 3. Run database migration

```bash
npm run migration:run --prefix server
```

### 4. Start dev servers

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

Register or log in to play. Your account, score, and captured tiles persist across reconnects.

## Game Rules

- Click any tile to **capture** it
- Click your **own tile** to release it
- Click **someone else's tile** to steal it
- **Cooldown** between captures is set per game (`Game.cooldownMs`, default 1.5s)
- Leaderboard ranks by tiles owned

## Auth

| Route | Description |
|-------|-------------|
| `POST /api/auth/register` | Create account `{ username, password }` |
| `POST /api/auth/login` | Log in, returns JWT |

Socket connects with `auth: { token }`. Player identity is a stable UUID — not `socket.id`.

## Architecture

```
Browser ──REST (login)──► Express
Browser ──WebSocket (JWT)──► Socket.io ──► PostgreSQL
                              │
                              └──► io.emit('cell_updated') ──► All browsers
```

**Entities:** `Player` (account) → `GamePlayer` (score per game, Postgres source of truth) → `Cell` (tile ownership)

**Leaderboard:** Postgres updates on capture; Redis `leaderboard:{gameId}` ZSET mirrors scores for O(log N) top-10 reads. Rebuilt from Postgres on server boot.

**Cooldown:** duration from `Game.cooldownMs`; active timer in server memory (`cooldownStore`)

## Environment

`server/.env`:

```
DATABASE_URL=postgresql://capture:capture@localhost:5432/capture
PORT=3001
JWT_SECRET=change-me-in-production-use-a-long-random-string
REDIS_URL=redis://localhost:6379
```

## Local dev vs production containers

| File | Purpose |
|------|---------|
| [`docker-compose.yml`](docker-compose.yml) | Dev infra only — Postgres + Redis |
| [`docker-compose.prod.yml`](docker-compose.prod.yml) | Full stack — Postgres, Redis, backend, frontend |
| [`server/Dockerfile`](server/Dockerfile) | Node backend (runs migrations on start) |
| [`client/Dockerfile`](client/Dockerfile) | Vite build + nginx (proxies `/api` and `/socket.io`) |

## Deploy on EC2 (Docker)

### 1. EC2 setup

- AMI: Amazon Linux 2023 or Ubuntu 22.04
- Instance: `t3.small` or larger
- Security group: inbound **80** (HTTP) from your IP or `0.0.0.0/0`
- Install Docker + Docker Compose plugin on the instance

### 2. Deploy

```bash
git clone <your-repo> capture && cd capture

cp .env.prod.example .env.prod
# Edit .env.prod — set a strong JWT_SECRET

npm run docker:prod:up
```

App is live at `http://<ec2-public-ip>/`

### 3. Useful commands

```bash
npm run docker:prod:logs    # tail all container logs
npm run docker:prod:down    # stop stack
```

### Production architecture

```
Internet :80
    │
    ▼
┌─────────────┐     /api, /socket.io     ┌─────────────┐
│  frontend   │ ───────────────────────► │   backend   │
│   (nginx)   │                          │  (Node.js)  │
└─────────────┘                          └──────┬──────┘
                                                │
                                    ┌───────────┴───────────┐
                                    ▼                       ▼
                              ┌──────────┐            ┌──────────┐
                              │ postgres │            │  redis   │
                              └──────────┘            └──────────┘
```

The frontend container serves the React app and reverse-proxies API and WebSocket traffic to the backend over the internal Docker network. Only port **80** is exposed publicly.

### HTTPS (recommended for production)

Put an Application Load Balancer or nginx/certbot in front with TLS, or use a reverse proxy like Caddy. Update the EC2 security group to allow 443 instead of (or in addition to) 80.
