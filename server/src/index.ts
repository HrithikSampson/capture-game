import "dotenv/config";
import "reflect-metadata";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import { AppDataSource } from "./data-source";
import { Cell } from "./entity/Cell";
import { Player } from "./entity/Player";
import { GamePlayer } from "./entity/GamePlayer";
import { toGamePayload } from "./game/getDefaultGame";
import { ActiveGameService } from "./game/ActiveGameService";
import {
  checkAndCompleteGame,
  createNewGame,
} from "./game/gameLifecycle";
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

function getActiveGameService(): ActiveGameService {
  return ActiveGameService.getInstance();
}

async function broadcastLeaderboard() {
  const gameId = getActiveGameService().getGame().id;
  const entries = await getLeaderboard(gameId);
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

async function buildInitStateForSocket(
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
  playerId: string
) {
  const service = getActiveGameService();
  const game = service.getGame();
  const gameId = game.id;

  const player = await AppDataSource.getRepository(Player).findOne({
    where: { id: playerId },
  });
  if (!player) return null;

  const gamePlayer = await findOrCreateGamePlayer(gameId, playerId);
  const cells = await AppDataSource.getRepository(Cell).find({
    where: { gameId },
    order: { row: "ASC", col: "ASC" },
  });

  return {
    game: await toGamePayload(game),
    cells: cells.map(toPayload),
    me: {
      ...toPlayerPayload(player),
      score: gamePlayer.score,
    },
    onlineCount: io.engine.clientsCount,
  };
}

async function emitGameStartedToAll() {
  const sockets = await io.fetchSockets();
  for (const remoteSocket of sockets) {
    const playerId = remoteSocket.data.playerId as string | undefined;
    if (!playerId) continue;

    const service = getActiveGameService();
    const game = service.getGame();
    const player = await AppDataSource.getRepository(Player).findOne({
      where: { id: playerId },
    });
    if (!player) continue;

    const gamePlayer = await findOrCreateGamePlayer(game.id, playerId);
    const cells = await AppDataSource.getRepository(Cell).find({
      where: { gameId: game.id },
      order: { row: "ASC", col: "ASC" },
    });

    remoteSocket.emit("game_started", {
      game: await toGamePayload(game),
      cells: cells.map(toPayload),
      me: {
        ...toPlayerPayload(player),
        score: gamePlayer.score,
      },
      leaderboard: await getLeaderboard(game.id),
    });
  }
}

// ── socket handlers ────────────────────────────────────────────────────────

io.on("connection", async (socket) => {
  const playerId = socket.data.playerId as string;
  const service = getActiveGameService();

  const initState = await buildInitStateForSocket(socket, playerId);
  if (!initState) {
    socket.disconnect(true);
    return;
  }

  const gameId = service.getGame().id;
  socket.emit("init_state", initState);
  socket.emit("leaderboard_update", await getLeaderboard(gameId));
  io.emit("online_count", io.engine.clientsCount);

  socket.on("claim_cell", async ({ row, col }) => {
    const currentGameId = service.getGame().id;

    if (!service.isPlayable()) {
      socket.emit("cell_claim_rejected", {
        row,
        col,
        reason: "game_completed",
      });
      return;
    }

    const remainingMs = getRemainingMs(currentGameId, playerId);
    if (remainingMs > 0) {
      socket.emit("cooldown_rejected", { remainingMs });
      return;
    }

    let scoreDeltas: { playerId: string; delta: number }[] = [];
    let claimSucceeded = false;

    const completionResult = await AppDataSource.transaction(async (em) => {
      const gp = await em.findOne(GamePlayer, { where: { gameId: currentGameId, playerId } });
      const freshPlayer = await em.findOne(Player, { where: { id: playerId } });
      if (!gp || !freshPlayer) return null;

      const cell = await em
        .getRepository(Cell)
        .createQueryBuilder("cell")
        .setLock("pessimistic_write")
        .where("cell.gameId = :gameId AND cell.row = :row AND cell.col = :col", {
          gameId: currentGameId,
          row,
          col,
        })
        .getOne();

      if (!cell) return null;

      if (cell.ownerId !== null) {
        socket.emit("cell_claim_rejected", {
          row,
          col,
          reason: "already_claimed",
        });
        return null;
      }

      const now = new Date();
      cell.ownerId = freshPlayer.id;
      cell.ownerName = freshPlayer.username;
      cell.ownerColor = freshPlayer.color;
      cell.capturedAt = now;
      gp.score = gp.score + 1;
      scoreDeltas = [{ playerId, delta: 1 }];

      setCooldownUntil(
        currentGameId,
        playerId,
        new Date(now.getTime() + service.getGame().cooldownMs)
      );

      await em.save(cell);
      await em.save(gp);

      io.emit("cell_updated", toPayload(cell));
      claimSucceeded = true;

      return checkAndCompleteGame(currentGameId, em);
    });

    if (claimSucceeded) {
      socket.emit("claim_ack", { row, col });
    }

    for (const { playerId: id, delta } of scoreDeltas) {
      await applyScoreDelta(currentGameId, id, delta);
    }

    if (scoreDeltas.length > 0) {
      const finalLeaderboard = await getLeaderboard(currentGameId);
      io.emit("leaderboard_update", finalLeaderboard);

      if (completionResult) {
        const completedGame = service.getGame();
        io.emit("game_completed", {
          game: await toGamePayload(completedGame),
          winners: completionResult.winners,
          finalLeaderboard,
        });
      }
    }
  });

  socket.on("create_new_game", async () => {
    try {
      await createNewGame();
      await emitGameStartedToAll();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create new game";
      socket.emit("create_new_game_rejected", { reason: message });
    }
  });

  socket.on("disconnect", () => {
    clearCooldown(service.getGame().id, playerId);
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
  const gameId = getActiveGameService().getGame().id;
  const entries = await getLeaderboard(gameId);
  res.json(entries);
});

// ── boot ───────────────────────────────────────────────────────────────────

AppDataSource.initialize()
  .then(async () => {
    await ActiveGameService.getInstance().initialize();
    const activeGame = ActiveGameService.getInstance().getGame();
    console.log(
      `✓ Database connected (game: ${activeGame.name}, status: ${activeGame.status})`
    );

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
