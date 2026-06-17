import "reflect-metadata";
import { DataSource } from "typeorm";
import { Cell } from "./entity/Cell";
import { User } from "./entity/User";
import { Game } from "./entity/Game";
import { InitSchema1700000000000 } from "./migration/1700000000000-InitSchema";
import { AddGameEntity1700000000001 } from "./migration/1700000000001-AddGameEntity";
import { CellPrimaryKeyRowCol1700000000002 } from "./migration/1700000000002-CellPrimaryKeyRowCol";

export const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  synchronize: false,
  logging: false,
  entities: [Game, Cell, User],
  migrations: [
    InitSchema1700000000000,
    AddGameEntity1700000000001,
    CellPrimaryKeyRowCol1700000000002,
  ],
});
