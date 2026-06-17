import { In } from "typeorm";
import { AppDataSource } from "../data-source";
import { GamePlayer } from "../entity/GamePlayer";
import { Player } from "../entity/Player";
import { getRedis } from "../redis/client";
import type { LeaderboardEntry } from "../types";

const TOP_N = 10;

function leaderboardKey(gameId: string): string {
  return `leaderboard:${gameId}`;
}

/** Rebuild sorted set from Postgres (run on server boot). */
export async function rebuildLeaderboard(gameId: string): Promise<void> {
  const redis = getRedis();
  const key = leaderboardKey(gameId);

  const rows = await AppDataSource.getRepository(GamePlayer).find({
    where: { gameId },
  });

  const pipeline = redis.pipeline();
  pipeline.del(key);

  const withScore = rows.filter((r) => r.score > 0);
  if (withScore.length > 0) {
    const args: (string | number)[] = [];
    for (const row of withScore) {
      args.push(row.score, row.playerId);
    }
    pipeline.zadd(key, ...args);
  }

  await pipeline.exec();
}

/** Apply a score change after a successful DB transaction. */
export async function applyScoreDelta(
  gameId: string,
  playerId: string,
  delta: number
): Promise<void> {
  if (delta === 0) return;

  const redis = getRedis();
  const key = leaderboardKey(gameId);
  const newScore = await redis.zincrby(key, delta, playerId);

  if (Number(newScore) <= 0) {
    await redis.zrem(key, playerId);
  }
}

export async function getLeaderboard(
  gameId: string,
  limit = TOP_N
): Promise<LeaderboardEntry[]> {
  const redis = getRedis();
  const key = leaderboardKey(gameId);

  const raw = await redis.zrevrange(key, 0, limit - 1, "WITHSCORES");
  if (raw.length === 0) return [];

  const entries: { playerId: string; score: number }[] = [];
  for (let i = 0; i < raw.length; i += 2) {
    entries.push({
      playerId: raw[i],
      score: parseInt(raw[i + 1], 10),
    });
  }

  const playerIds = entries.map((e) => e.playerId);
  const players = await AppDataSource.getRepository(Player).find({
    where: { id: In(playerIds) },
  });
  const playerMap = new Map(players.map((p) => [p.id, p]));

  return entries
    .map(({ playerId, score }) => {
      const player = playerMap.get(playerId);
      if (!player) return null;
      return {
        id: player.id,
        username: player.username,
        color: player.color,
        score,
      };
    })
    .filter((e): e is LeaderboardEntry => e !== null);
}
