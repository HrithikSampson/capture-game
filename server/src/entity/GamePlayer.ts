import "reflect-metadata";
import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Game } from "./Game";
import { Player } from "./Player";

@Entity("game_players")
export class GamePlayer {
  @PrimaryColumn({ type: "varchar", length: 64 })
  gameId!: string;

  @PrimaryColumn({ type: "uuid" })
  playerId!: string;

  @Column({ type: "int", default: 0 })
  score!: number;

  @Column({ type: "timestamptz", default: () => "NOW()" })
  joinedAt!: Date;

  @ManyToOne(() => Game, (game) => game.gamePlayers, { onDelete: "CASCADE" })
  @JoinColumn({ name: "gameId" })
  game!: Game;

  @ManyToOne(() => Player, (player) => player.gamePlayers, { onDelete: "CASCADE" })
  @JoinColumn({ name: "playerId" })
  player!: Player;
}
