import { AppDataSource } from "../data-source";
import { Game } from "../entity/Game";
import { DEFAULT_GAME_ID } from "../constants/game";

export async function getDefaultGame(): Promise<Game> {
  const game = await AppDataSource.getRepository(Game).findOne({
    where: { id: DEFAULT_GAME_ID },
  });

  if (!game) {
    throw new Error(
      `Default game "${DEFAULT_GAME_ID}" not found. Run migrations first.`
    );
  }

  return game;
}

export { toGamePayload } from "./gamePayload";
