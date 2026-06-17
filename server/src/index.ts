import "dotenv/config";
import "reflect-metadata";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { AppDataSource } from "./data-source";
import { Cell } from "./entity/Cell";
import { User } from "./entity/User";
import { generateUser } from "./userGenerator";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  CellPayload,
  LeaderboardEntry,
} from "./types";

const PORT = parseInt(process.env.PORT ?? "3001", 10);
const COOLDOWN_MS = 1500;

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: "*" },
});

// ── helpers ────────────────────────────────────────────────────────────────

function toPayload(cell: Cell): CellPayload {
  return {
    id: cell.id,
    row: cell.row,
    col: cell.col,
    ownerId: cell.ownerId,
    ownerName: cell.ownerName,
    ownerColor: cell.ownerColor,
    capturedAt: cell.capturedAt?.toISOString() ?? null,
  };
}

async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const users = await AppDataSource.getRepository(User).find({
    order: { score: "DESC" },
    take: 10,
  });
  return users.map((u) => ({ id: u.id, name: u.name, color: u.color, score: u.score }));
}

function broadcastLeaderboard() {
  getLeaderboard().then((entries) => io.emit("leaderboard_update", entries));
}

// ── socket handlers ────────────────────────────────────────────────────────

io.on("connection", async (socket) => {
  const cellRepo = AppDataSource.getRepository(Cell);
  const userRepo = AppDataSource.getRepository(User);

  // Create user record
  const { name, color } = generateUser();
  const user = userRepo.create({ id: socket.id, name, color, score: 0, cooldownUntil: null });
  await userRepo.save(user);

  // Send initial state
  const cells = await cellRepo.find({ order: { row: "ASC", col: "ASC" } });
  const onlineCount = io.engine.clientsCount;

  socket.emit("init_state", {
    cells: cells.map(toPayload),
    me: { id: user.id, name: user.name, color: user.color, score: user.score },
    onlineCount,
  });

  // Broadcast updated count to everyone
  io.emit("online_count", onlineCount);

  // ── claim_cell ──────────────────────────────────────────────────────────
  socket.on("claim_cell", async ({ cellId }) => {
    await AppDataSource.transaction(async (em) => {
      const freshUser = await em.findOne(User, { where: { id: socket.id } });
      if (!freshUser) return;

      // Enforce cooldown
      const now = new Date();
      if (freshUser.cooldownUntil && freshUser.cooldownUntil > now) {
        const remainingMs = freshUser.cooldownUntil.getTime() - now.getTime();
        socket.emit("cooldown_rejected", { remainingMs });
        return;
      }

      // Pessimistic write lock on the cell
      const cell = await em
        .getRepository(Cell)
        .createQueryBuilder("cell")
        .setLock("pessimistic_write")
        .where("cell.id = :id", { id: cellId })
        .getOne();

      if (!cell) return;

      const previousOwnerId = cell.ownerId;

      // Toggle off if clicking own cell
      if (cell.ownerId === socket.id) {
        cell.ownerId = null;
        cell.ownerName = null;
        cell.ownerColor = null;
        cell.capturedAt = null;
        freshUser.score = Math.max(0, freshUser.score - 1);
      } else {
        // Decrement previous owner's score
        if (previousOwnerId) {
          await em
            .createQueryBuilder()
            .update(User)
            .set({ score: () => `GREATEST(0, score - 1)` })
            .where("id = :id", { id: previousOwnerId })
            .execute();
        }
        cell.ownerId = freshUser.id;
        cell.ownerName = freshUser.name;
        cell.ownerColor = freshUser.color;
        cell.capturedAt = now;
        freshUser.score = freshUser.score + 1;
      }

      freshUser.cooldownUntil = new Date(now.getTime() + COOLDOWN_MS);

      await em.save(cell);
      await em.save(freshUser);

      io.emit("cell_updated", toPayload(cell));
    });

    broadcastLeaderboard();
  });

  // ── disconnect ──────────────────────────────────────────────────────────
  socket.on("disconnect", async () => {
    await AppDataSource.getRepository(User).delete({ id: socket.id });
    const count = io.engine.clientsCount;
    io.emit("online_count", count);
    broadcastLeaderboard();
  });
});

// ── REST: health + leaderboard ─────────────────────────────────────────────

app.get("/health", (_req, res) => res.json({ ok: true }));

app.get("/api/leaderboard", async (_req, res) => {
  const entries = await getLeaderboard();
  res.json(entries);
});

// ── boot ───────────────────────────────────────────────────────────────────

AppDataSource.initialize()
  .then(() => {
    console.log("✓ Database connected");
    httpServer.listen(PORT, () => {
      console.log(`✓ Server listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to database:", err);
    process.exit(1);
  });
