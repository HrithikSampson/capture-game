import "dotenv/config";
import "reflect-metadata";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { AppDataSource } from "./data-source";
import { Cell } from "./entity/Cell";
import { User } from "./entity/User";
import { Game } from "./entity/Game";
import { generateUser } from "./userGenerator";
import { getDefaultGame, toGamePayload } from "./game/getDefaultGame";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  CellPayload,
  LeaderboardEntry,
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

async function getLeaderboard(gameId: string): Promise<LeaderboardEntry[]> {
  const users = await AppDataSource.getRepository(User).find({
    where: { gameId },
    order: { score: "DESC" },
    take: 10,
  });
  return users.map((u) => ({ id: u.id, name: u.name, color: u.color, score: u.score }));
}

function broadcastLeaderboard() {
  getLeaderboard(activeGame.id).then((entries) =>
    io.emit("leaderboard_update", entries)
  );
}

// ── socket handlers ────────────────────────────────────────────────────────

io.on("connection", async (socket) => {
  const gameId = activeGame.id;
  const cellRepo = AppDataSource.getRepository(Cell);
  const userRepo = AppDataSource.getRepository(User);

  const { name, color } = generateUser();
  const user = userRepo.create({
    gameId,
    id: socket.id,
    name,
    color,
    score: 0,
    cooldownUntil: null,
  });
  await userRepo.save(user);

  const cells = await cellRepo.find({
    where: { gameId },
    order: { row: "ASC", col: "ASC" },
  });
  const onlineCount = io.engine.clientsCount;

  socket.emit("init_state", {
    game: toGamePayload(activeGame),
    cells: cells.map(toPayload),
    me: { id: user.id, name: user.name, color: user.color, score: user.score },
    onlineCount,
  });

  io.emit("online_count", onlineCount);

  socket.on("claim_cell", async ({ row, col }) => {
    await AppDataSource.transaction(async (em) => {
      const freshUser = await em.findOne(User, {
        where: { gameId, id: socket.id },
      });
      if (!freshUser) return;

      const now = new Date();
      if (freshUser.cooldownUntil && freshUser.cooldownUntil > now) {
        const remainingMs = freshUser.cooldownUntil.getTime() - now.getTime();
        socket.emit("cooldown_rejected", { remainingMs });
        return;
      }

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

      if (cell.ownerId === socket.id) {
        cell.ownerId = null;
        cell.ownerName = null;
        cell.ownerColor = null;
        cell.capturedAt = null;
        freshUser.score = Math.max(0, freshUser.score - 1);
      } else {
        if (previousOwnerId) {
          await em
            .createQueryBuilder()
            .update(User)
            .set({ score: () => `GREATEST(0, score - 1)` })
            .where("gameId = :gameId AND id = :id", {
              gameId,
              id: previousOwnerId,
            })
            .execute();
        }
        cell.ownerId = freshUser.id;
        cell.ownerName = freshUser.name;
        cell.ownerColor = freshUser.color;
        cell.capturedAt = now;
        freshUser.score = freshUser.score + 1;
      }

      freshUser.cooldownUntil = new Date(now.getTime() + activeGame.cooldownMs);

      await em.save(cell);
      await em.save(freshUser);

      io.emit("cell_updated", toPayload(cell));
    });

    broadcastLeaderboard();
  });

  socket.on("disconnect", async () => {
    await AppDataSource.getRepository(User).delete({ gameId, id: socket.id });
    io.emit("online_count", io.engine.clientsCount);
    broadcastLeaderboard();
  });
});

// ── REST ───────────────────────────────────────────────────────────────────

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
    httpServer.listen(PORT, () => {
      console.log(`✓ Server listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to database:", err);
    process.exit(1);
  });
