import "reflect-metadata";
import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Game } from "./Game";

@Entity("cells")
export class Cell {
  @PrimaryColumn({ type: "varchar", length: 64 })
  gameId!: string;

  @PrimaryColumn({ type: "int" })
  row!: number;

  @PrimaryColumn({ type: "int" })
  col!: number;

  @Column({ type: "varchar", length: 64, nullable: true, default: null })
  ownerId!: string | null;

  @Column({ type: "varchar", length: 64, nullable: true, default: null })
  ownerName!: string | null;

  @Column({ type: "varchar", length: 10, nullable: true, default: null })
  ownerColor!: string | null;

  @Column({ type: "timestamptz", nullable: true, default: null })
  capturedAt!: Date | null;

  @ManyToOne(() => Game, (game) => game.cells, { onDelete: "CASCADE" })
  @JoinColumn({ name: "gameId" })
  game!: Game;
}
