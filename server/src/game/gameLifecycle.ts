import { EntityManager, In } from "typeorm";
import { randomUUID } from "crypto";
import { AppDataSource } from "../data-source";
import { Game } from "../entity/Game";
import { Cell } from "../entity/Cell";
import { GamePlayer } from "../entity/GamePlayer";
import { Player } from "../entity/Player";
import { seedGameGrid } from "./seedGameGrid";
import { ActiveGameService } from "./ActiveGameService";
import { clearGameCooldowns } from "./cooldownStore";
import { rebuildLeaderboard } from "./leaderboardRedis";
import type { LeaderboardEntry } from "../types";

export interface GameCompletionResult {
  winners: LeaderboardEntry[];
  completedAt: Date;
}

async function buildWinnerEntries(
  em: EntityManager,
  gameId: string,
  winnerIds: string[]
): Promise<LeaderboardEntry[]> {
  const players = await em.find(Player, { where: { id: In(winnerIds) } });
  const playerMap = new Map(players.map((p) => [p.id, p]));

  const gamePlayers = await em.find(GamePlayer, {
    where: { gameId, playerId: In(winnerIds) },
  });
  const scoreMap = new Map(gamePlayers.map((gp) => [gp.playerId, gp.score]));

  return winnerIds
    .map((id) => {
      const player = playerMap.get(id);
      if (!player) return null;
      return {
        id: player.id,
        username: player.username,
        color: player.color,
        score: scoreMap.get(id) ?? 0,
      };
    })
    .filter((e): e is LeaderboardEntry => e !== null);
}

export async function checkAndCompleteGame(
  gameId: string,
  em: EntityManager
): Promise<GameCompletionResult | null> {
  const game = await em
    .getRepository(Game)
    .createQueryBuilder("game")
    .setLock("pessimistic_write")
    .where("game.id = :gameId", { gameId })
    .getOne();

  if (!game || game.status !== "active") return null;

  const claimedCount = await em
    .getRepository(Cell)
    .createQueryBuilder("cell")
    .where("cell.gameId = :gameId AND cell.ownerId IS NOT NULL", { gameId })
    .getCount();

  const totalCells = game.rows * game.cols;
  if (claimedCount < totalCells) return null;

  const topScorers = await em
    .getRepository(GamePlayer)
    .createQueryBuilder("gp")
    .where("gp.gameId = :gameId", { gameId })
    .orderBy("gp.score", "DESC")
    .getMany();

  if (topScorers.length === 0) return null;

  const topScore = topScorers[0].score;
  const winnerIds = topScorers
    .filter((gp) => gp.score === topScore)
    .map((gp) => gp.playerId);

  const completedAt = new Date();
  game.status = "completed";
  game.completedAt = completedAt;
  game.winnerIds = winnerIds;
  await em.save(game);

  ActiveGameService.getInstance().switchTo(game);

  const winners = await buildWinnerEntries(em, gameId, winnerIds);
  return { winners, completedAt };
}

export interface NewGameResult {
  game: Game;
  cells: Cell[];
}

export async function createNewGame(): Promise<NewGameResult> {
  const service = ActiveGameService.getInstance();
  const current = service.getGame();

  if (current.status !== "completed") {
    throw new Error("GAME_NOT_COMPLETED");
  }

  const existingActive = await AppDataSource.getRepository(Game).findOne({
    where: { status: "active" },
  });
  if (existingActive) {
    throw new Error("GAME_ALREADY_STARTED");
  }

  const newGame = await AppDataSource.transaction(async (em) => {
    const game = em.create(Game, {
      id: randomUUID(),
      name: "Capture Grid",
      rows: current.rows,
      cols: current.cols,
      cooldownMs: current.cooldownMs,
      status: "active" as const,
      completedAt: null,
      winnerIds: null,
    });
    await em.save(game);
    await seedGameGrid(em, game.id, game.rows, game.cols);
    return game;
  });

  clearGameCooldowns(current.id);
  service.switchTo(newGame);
  await rebuildLeaderboard(newGame.id);

  const cells = await AppDataSource.getRepository(Cell).find({
    where: { gameId: newGame.id },
    order: { row: "ASC", col: "ASC" },
  });

  return { game: newGame, cells };
}
