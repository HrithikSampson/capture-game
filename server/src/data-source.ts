import "reflect-metadata";
import { DataSource } from "typeorm";
import { Cell } from "./entity/Cell";
import { Game } from "./entity/Game";
import { Player } from "./entity/Player";
import { GamePlayer } from "./entity/GamePlayer";
import { InitSchema1700000000000 } from "./migration/1700000000000-InitSchema";
import { AddGameEntity1700000000001 } from "./migration/1700000000001-AddGameEntity";
import { CellPrimaryKeyRowCol1700000000002 } from "./migration/1700000000002-CellPrimaryKeyRowCol";
import { AddPlayerAuth1700000000003 } from "./migration/1700000000003-AddPlayerAuth";

export const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  synchronize: false,
  logging: false,
  entities: [Game, Cell, Player, GamePlayer],
  migrations: [
    InitSchema1700000000000,
    AddGameEntity1700000000001,
    CellPrimaryKeyRowCol1700000000002,
    AddPlayerAuth1700000000003,
  ],
});
