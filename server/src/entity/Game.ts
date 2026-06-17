import "reflect-metadata";
import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from "typeorm";
import { Cell } from "./Cell";
import { User } from "./User";

export type GameStatus = "active" | "inactive";

@Entity("games")
export class Game {
  @PrimaryColumn({ type: "varchar", length: 64 })
  id!: string;

  @Column({ type: "varchar", length: 128 })
  name!: string;

  @Column({ type: "int" })
  rows!: number;

  @Column({ type: "int" })
  cols!: number;

  @Column({ type: "int", default: 1500 })
  cooldownMs!: number;

  @Column({ type: "varchar", length: 20, default: "active" })
  status!: GameStatus;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @OneToMany(() => Cell, (cell) => cell.game)
  cells!: Cell[];

  @OneToMany(() => User, (user) => user.game)
  users!: User[];
}
