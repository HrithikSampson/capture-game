import "reflect-metadata";
import { Entity, PrimaryColumn, Column } from "typeorm";

@Entity("cells")
export class Cell {
  @PrimaryColumn({ type: "varchar", length: 20 })
  id!: string; // "row_col" e.g. "0_0"

  @Column({ type: "int" })
  row!: number;

  @Column({ type: "int" })
  col!: number;

  @Column({ type: "varchar", length: 64, nullable: true, default: null })
  ownerId!: string | null;

  @Column({ type: "varchar", length: 64, nullable: true, default: null })
  ownerName!: string | null;

  @Column({ type: "varchar", length: 10, nullable: true, default: null })
  ownerColor!: string | null;

  @Column({ type: "timestamptz", nullable: true, default: null })
  capturedAt!: Date | null;
}
