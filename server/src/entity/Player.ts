import "reflect-metadata";
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from "typeorm";
import { GamePlayer } from "./GamePlayer";

@Entity("players")
export class Player {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 64, unique: true })
  username!: string;

  @Column({ type: "varchar", length: 128 })
  passwordHash!: string;

  @Column({ type: "varchar", length: 10 })
  color!: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @OneToMany(() => GamePlayer, (gp) => gp.player)
  gamePlayers!: GamePlayer[];
}
