# Capture — Real-Time Shared Grid

A competitive real-time tile-capture game. 1,500 tiles. Many players. One grid.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + TypeScript + Vite |
| Backend | Node.js + Express + Socket.io |
| Database | PostgreSQL 16 (via Docker) |
| ORM | TypeORM with versioned migrations |
| Real-time | Socket.io WebSockets |

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

Seeds the `cells` table with all 1,500 tiles.

```bash
npm run migration:run --prefix server
```

### 4. Start dev servers

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## Game Rules

- Click any tile to **capture** it
- Click your **own tile** to release it  
- Click **someone else's tile** to steal it
- **1.5s cooldown** between captures (enforced server-side)
- Leaderboard ranks by tiles owned

## Architecture

```
Browser ──WebSocket──► Node.js + Socket.io ──► PostgreSQL
                            │
                            └──► io.emit('cell_updated') ──► All browsers
```

**Conflict handling:** Each `claim_cell` runs inside a TypeORM transaction with a `pessimistic_write` lock on the cell row — two simultaneous clicks on the same tile are serialized at the DB level.

## Project Structure

```
capture/
├── docker-compose.yml
├── server/
│   └── src/
│       ├── index.ts              # Express + Socket.io
│       ├── data-source.ts        # TypeORM DataSource
│       ├── entity/
│       │   ├── Game.ts
│       │   ├── Cell.ts
│       │   └── User.ts
│       ├── game/
│       │   ├── getDefaultGame.ts
│       │   └── seedGameGrid.ts
│       └── migration/
│           ├── 1700000000000-InitSchema.ts
│           └── 1700000000001-AddGameEntity.ts
└── client/
    └── src/
        ├── App.tsx
        ├── socket.ts
        └── components/
            ├── Grid.tsx
            ├── Cell.tsx
            ├── Header.tsx
            ├── Leaderboard.tsx
            └── Toast.tsx
```

## Environment

`server/.env` (already created):
```
DATABASE_URL=postgresql://capture:capture@localhost:5432/capture
PORT=3001
```
