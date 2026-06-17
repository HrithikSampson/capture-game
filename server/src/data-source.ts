import "reflect-metadata";
import { DataSource } from "typeorm";
import { Cell } from "./entity/Cell";
import { User } from "./entity/User";
import { InitSchema1700000000000 } from "./migration/1700000000000-InitSchema";

export const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  synchronize: false,
  logging: false,
  entities: [Cell, User],
  migrations: [InitSchema1700000000000],
});
