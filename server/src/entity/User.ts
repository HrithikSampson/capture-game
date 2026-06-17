import "reflect-metadata";
import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Game } from "./Game";

@Entity("users")
export class User {
  @PrimaryColumn({ type: "varchar", length: 64 })
  gameId!: string;

  @PrimaryColumn({ type: "varchar", length: 64 })
  id!: string; // socket id

  @Column({ type: "varchar", length: 64 })
  name!: string;

  @Column({ type: "varchar", length: 10 })
  color!: string;

  @Column({ type: "int", default: 0 })
  score!: number;

  @Column({ type: "timestamptz", nullable: true, default: null })
  cooldownUntil!: Date | null;

  @Column({ type: "timestamptz", default: () => "NOW()" })
  joinedAt!: Date;

  @ManyToOne(() => Game, (game) => game.users, { onDelete: "CASCADE" })
  @JoinColumn({ name: "gameId" })
  game!: Game;
}
