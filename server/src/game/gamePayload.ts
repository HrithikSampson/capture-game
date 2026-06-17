import { In } from "typeorm";
import { AppDataSource } from "../data-source";
import { Game } from "../entity/Game";
import { Player } from "../entity/Player";
import { GamePlayer } from "../entity/GamePlayer";
import type { GamePayload, LeaderboardEntry } from "../types";

export async function resolveWinners(
  game: Game
): Promise<LeaderboardEntry[]> {
  if (!game.winnerIds || game.winnerIds.length === 0) return [];

  const players = await AppDataSource.getRepository(Player).find({
    where: { id: In(game.winnerIds) },
  });
  const playerMap = new Map(players.map((p) => [p.id, p]));

  const gamePlayers = await AppDataSource.getRepository(GamePlayer).find({
    where: { gameId: game.id, playerId: In(game.winnerIds) },
  });
  const scoreMap = new Map(gamePlayers.map((gp) => [gp.playerId, gp.score]));

  return game.winnerIds
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

export async function toGamePayload(game: Game): Promise<GamePayload> {
  const payload: GamePayload = {
    id: game.id,
    name: game.name,
    rows: game.rows,
    cols: game.cols,
    cooldownMs: game.cooldownMs,
    status: game.status,
    completedAt: game.completedAt?.toISOString() ?? null,
  };

  if (game.status === "completed") {
    payload.winners = await resolveWinners(game);
  }

  return payload;
}
