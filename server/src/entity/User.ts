import "reflect-metadata";
import { Entity, PrimaryColumn, Column } from "typeorm";

@Entity("users")
export class User {
  @PrimaryColumn({ type: "varchar", length: 64 })
  id!: string; // socket id or session uuid

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
}
