Live Link: http://35.175.135.226/

# Capture

Multiplayer grid game. Open the site, register, click tiles to claim them. Everyone sees updates live.

Grid: 50 × 30 tiles (1,500 total). Your score is how many tiles you currently own. Empty tiles can be claimed once. First click wins if two players race for the same tile. Captured tiles cannot be stolen or released. Short cooldown after each successful capture. When every tile is claimed the game ends, co-winners are announced, and any player can start a new round for everyone.

---

## Run locally (development)

You need Node 20+, Postgres, and Redis running.

### 1. Start Postgres and Redis

```bash
docker compose up -d
```

Or run Postgres and Redis however you already have them on your machine.

### 2. Install dependencies

```bash
npm install
npm install --prefix server
npm install --prefix client
```

### 3. Configure the server

```bash
cp server/.env.example server/.env
```

Typical `server/.env`:

```
DATABASE_URL=postgresql://capture:capture@localhost:5432/capture
REDIS_URL=redis://localhost:6379
PORT=3001
JWT_SECRET=some-local-dev-secret
```

### 4. Run migrations

```bash
npm run migration:run --prefix server
```

### 5. Start the app

```bash
npm run dev
```

Open http://localhost:5173 — login and API calls go through the Vite dev server to the backend on 3001. You do not need to open the backend port in a browser.

---

## Run on EC2 (Docker)

Four containers: Postgres, Redis, backend, frontend. Only the **frontend port** is public. Login, API, and WebSocket all go through the frontend URL; the backend stays on the internal Docker network.

### 1. EC2 instance

- Ubuntu 22.04 or Amazon Linux 2023
- Security group inbound rules:
  - **22** — SSH (your IP only)
  - **4173** — the game (anywhere, or your IP)
- Do **not** open port 3001
- Install Docker and Docker Compose

### 2. Deploy

```bash
git clone <your-repo> capture
cd capture

cp .env.prod.example .env.prod
nano .env.prod   # set JWT_SECRET
```

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

Open **http://\<ec2-public-ip\>:4173** — that is the only URL you need.

Health check (via the proxy): **http://\<ec2-public-ip\>:4173/api** won't work for GET /health on root — use logs if debugging: `docker compose -f docker-compose.prod.yml logs backend`

### 3. Useful commands

```bash
docker compose -f docker-compose.prod.yml logs -f
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

---

## Environment variables

### Server (`server/.env` locally, `.env.prod` for Docker backend)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | Signs login tokens |
| `PORT` | Backend port (default 3001, internal in Docker) |

### Production (`.env.prod`)

| Variable | Purpose |
|----------|---------|
| `JWT_SECRET` | Required — signs login tokens |
| `POSTGRES_PASSWORD` | Postgres password in Docker |
| `FRONTEND_PORT` | Public port (default 4173) |

No `VITE_API_URL` needed — the browser uses relative `/api` and `/socket.io` on the same host as the frontend.

---

## Architecture

### Production (EC2)

```
Browser  →  :80 only
              │
              ▼
         frontend (vite preview)
              │  proxies /api, /socket.io
              ▼
         backend :3001  (Docker internal, not on internet)
              │
         ┌────┴────┐
         ▼         ▼
    postgres    redis
```

### Local dev

Same idea: browser → `:4173` → Vite proxy → backend `:3001`.

### Data model

- **Player** — account (username, password, color)
- **GamePlayer** — score per game (Postgres, source of truth)
- **Cell** — tile ownership `(gameId, row, col)`
- **Game** — grid size, cooldown (`cooldownMs`)

### Capture flow

1. Client sends `claim_cell` over WebSocket (JWT in socket auth).
2. Postgres transaction with row lock on the cell.
3. Updates `cells` and `game_players` (score).
4. Mirrors score to Redis sorted set.
5. Broadcasts `cell_updated` and `leaderboard_update` to all clients.
