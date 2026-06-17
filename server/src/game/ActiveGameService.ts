import { AppDataSource } from "../data-source";
import { Game } from "../entity/Game";
import { getDefaultGame } from "./getDefaultGame";

export class ActiveGameService {
  private static instance: ActiveGameService | null = null;
  private game!: Game;

  private constructor() {}

  static getInstance(): ActiveGameService {
    if (!ActiveGameService.instance) {
      ActiveGameService.instance = new ActiveGameService();
    }
    return ActiveGameService.instance;
  }

  async initialize(): Promise<void> {
    const repo = AppDataSource.getRepository(Game);

    const active = await repo.findOne({
      where: { status: "active" },
      order: { createdAt: "DESC" },
    });
    if (active) {
      this.game = active;
      return;
    }

    const completed = await repo.findOne({
      where: { status: "completed" },
      order: { createdAt: "DESC" },
    });
    if (completed) {
      this.game = completed;
      return;
    }

    this.game = await getDefaultGame();
  }

  getGame(): Game {
    return this.game;
  }

  isPlayable(): boolean {
    return this.game.status === "active";
  }

  switchTo(game: Game): void {
    this.game = game;
  }
}
