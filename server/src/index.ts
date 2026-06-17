import "dotenv/config";
import "reflect-metadata";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { AppDataSource } from "./data-source";
import { Cell } from "./entity/Cell";
import { Player } from "./entity/Player";
import { GamePlayer } from "./entity/GamePlayer";
import { Game } from "./entity/Game";
import { getDefaultGame, toGamePayload } from "./game/getDefaultGame";
import {
  hashPassword,
  verifyPassword,
  signToken,
  validateCredentials,
} from "./auth/password";
import { assignPlayerColor, toPlayerPayload } from "./auth/playerPayload";
import { socketAuthMiddleware } from "./auth/socketMiddleware";
import {
  getRemainingMs,
  setCooldownUntil,
  clearCooldown,
} from "./game/cooldownStore";
import {
  getLeaderboard,
  rebuildLeaderboard,
  applyScoreDelta,
} from "./game/leaderboardRedis";
import { connectRedis } from "./redis/client";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  CellPayload,
} from "./types";

const PORT = parseInt(process.env.PORT ?? "3001", 10);

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: "*" },
});

let activeGame: Game;

io.use(socketAuthMiddleware);

// ── helpers ────────────────────────────────────────────────────────────────

function toPayload(cell: Cell): CellPayload {
  return {
    row: cell.row,
    col: cell.col,
    ownerId: cell.ownerId,
    ownerName: cell.ownerName,
    ownerColor: cell.ownerColor,
    capturedAt: cell.capturedAt?.toISOString() ?? null,
  };
}

async function broadcastLeaderboard() {
  const entries = await getLeaderboard(activeGame.id);
  io.emit("leaderboard_update", entries);
}

async function findOrCreateGamePlayer(
  gameId: string,
  playerId: string
): Promise<GamePlayer> {
  const repo = AppDataSource.getRepository(GamePlayer);
  let gp = await repo.findOne({ where: { gameId, playerId } });
  if (!gp) {
    gp = repo.create({ gameId, playerId, score: 0 });
    await repo.save(gp);
  }
  return gp;
}

// ── socket handlers ────────────────────────────────────────────────────────

io.on("connection", async (socket) => {
  const playerId = socket.data.playerId as string;
  const gameId = activeGame.id;

  const player = await AppDataSource.getRepository(Player).findOne({
    where: { id: playerId },
  });
  if (!player) {
    socket.disconnect(true);
    return;
  }

  const gamePlayer = await findOrCreateGamePlayer(gameId, playerId);

  const cells = await AppDataSource.getRepository(Cell).find({
    where: { gameId },
    order: { row: "ASC", col: "ASC" },
  });
  const onlineCount = io.engine.clientsCount;

  socket.emit("init_state", {
    game: toGamePayload(activeGame),
    cells: cells.map(toPayload),
    me: {
      ...toPlayerPayload(player),
      score: gamePlayer.score,
    },
    onlineCount,
  });

  socket.emit("leaderboard_update", await getLeaderboard(gameId));

  io.emit("online_count", onlineCount);

  socket.on("claim_cell", async ({ row, col }) => {
    const remainingMs = getRemainingMs(gameId, playerId);
    if (remainingMs > 0) {
      socket.emit("cooldown_rejected", { remainingMs });
      return;
    }

    let scoreDeltas: { playerId: string; delta: number }[] = [];

    await AppDataSource.transaction(async (em) => {
      const gp = await em.findOne(GamePlayer, { where: { gameId, playerId } });
      const freshPlayer = await em.findOne(Player, { where: { id: playerId } });
      if (!gp || !freshPlayer) return;

      const cell = await em
        .getRepository(Cell)
        .createQueryBuilder("cell")
        .setLock("pessimistic_write")
        .where("cell.gameId = :gameId AND cell.row = :row AND cell.col = :col", {
          gameId,
          row,
          col,
        })
        .getOne();

      if (!cell) return;

      const previousOwnerId = cell.ownerId;
      const now = new Date();

      if (cell.ownerId === playerId) {
        cell.ownerId = null;
        cell.ownerName = null;
        cell.ownerColor = null;
        cell.capturedAt = null;
        gp.score = Math.max(0, gp.score - 1);
        scoreDeltas = [{ playerId, delta: -1 }];
      } else {
        if (previousOwnerId) {
          await em
            .createQueryBuilder()
            .update(GamePlayer)
            .set({ score: () => `GREATEST(0, score - 1)` })
            .where("gameId = :gameId AND playerId = :playerId", {
              gameId,
              playerId: previousOwnerId,
            })
            .execute();
          scoreDeltas.push({ playerId: previousOwnerId, delta: -1 });
        }
        cell.ownerId = freshPlayer.id;
        cell.ownerName = freshPlayer.username;
        cell.ownerColor = freshPlayer.color;
        cell.capturedAt = now;
        gp.score = gp.score + 1;
        scoreDeltas.push({ playerId, delta: 1 });
      }

      setCooldownUntil(
        gameId,
        playerId,
        new Date(now.getTime() + activeGame.cooldownMs)
      );

      await em.save(cell);
      await em.save(gp);

      io.emit("cell_updated", toPayload(cell));
    });

    for (const { playerId: id, delta } of scoreDeltas) {
      await applyScoreDelta(gameId, id, delta);
    }

    await broadcastLeaderboard();
  });

  socket.on("disconnect", () => {
    clearCooldown(gameId, playerId);
    io.emit("online_count", io.engine.clientsCount);
  });
});

// ── REST: auth ─────────────────────────────────────────────────────────────

app.post("/api/auth/register", async (req, res) => {
  const { username, password } = req.body as {
    username?: string;
    password?: string;
  };

  if (!username || !password) {
    res.status(400).json({ error: "Username and password required" });
    return;
  }

  const validationError = validateCredentials(username, password);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  const playerRepo = AppDataSource.getRepository(Player);
  const existing = await playerRepo.findOne({
    where: { username: username.toLowerCase() },
  });
  if (existing) {
    res.status(409).json({ error: "Username already taken" });
    return;
  }

  const player = playerRepo.create({
    username: username.toLowerCase(),
    passwordHash: await hashPassword(password),
    color: assignPlayerColor(),
  });
  await playerRepo.save(player);

  const token = signToken(player.id);
  res.json({ token, player: toPlayerPayload(player) });
});

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body as {
    username?: string;
    password?: string;
  };

  if (!username || !password) {
    res.status(400).json({ error: "Username and password required" });
    return;
  }

  const player = await AppDataSource.getRepository(Player).findOne({
    where: { username: username.toLowerCase() },
  });

  if (!player || !(await verifyPassword(password, player.passwordHash))) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  const token = signToken(player.id);
  res.json({ token, player: toPlayerPayload(player) });
});

// ── REST: health + leaderboard ─────────────────────────────────────────────

app.get("/health", (_req, res) => res.json({ ok: true }));

app.get("/api/games/:gameId/leaderboard", async (req, res) => {
  const entries = await getLeaderboard(req.params.gameId);
  res.json(entries);
});

app.get("/api/leaderboard", async (_req, res) => {
  const entries = await getLeaderboard(activeGame.id);
  res.json(entries);
});

// ── boot ───────────────────────────────────────────────────────────────────

AppDataSource.initialize()
  .then(async () => {
    activeGame = await getDefaultGame();
    console.log(`✓ Database connected (game: ${activeGame.name})`);

    await connectRedis();
    console.log("✓ Redis connected");
    await rebuildLeaderboard(activeGame.id);
    console.log("✓ Leaderboard rebuilt from Postgres");

    httpServer.listen(PORT, () => {
      console.log(`✓ Server listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to database:", err);
    process.exit(1);
  });
