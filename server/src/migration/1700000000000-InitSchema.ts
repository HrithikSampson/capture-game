import { MigrationInterface, QueryRunner } from "typeorm";

const GRID_ROWS = 30;
const GRID_COLS = 50;

export class InitSchema1700000000000 implements MigrationInterface {
  name = "InitSchema1700000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id"           VARCHAR(64)  NOT NULL,
        "name"         VARCHAR(64)  NOT NULL,
        "color"        VARCHAR(10)  NOT NULL,
        "score"        INTEGER      NOT NULL DEFAULT 0,
        "cooldownUntil" TIMESTAMPTZ          DEFAULT NULL,
        "joinedAt"     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "cells" (
        "id"          VARCHAR(20)  NOT NULL,
        "row"         INTEGER      NOT NULL,
        "col"         INTEGER      NOT NULL,
        "ownerId"     VARCHAR(64)            DEFAULT NULL,
        "ownerName"   VARCHAR(64)            DEFAULT NULL,
        "ownerColor"  VARCHAR(10)            DEFAULT NULL,
        "capturedAt"  TIMESTAMPTZ            DEFAULT NULL,
        CONSTRAINT "PK_cells" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_cells_owner" ON "cells" ("ownerId")
    `);

    // Seed all cells
    const values: string[] = [];
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        values.push(`('${r}_${c}', ${r}, ${c})`);
      }
    }

    // Insert in batches of 500 to stay within parameter limits
    const batchSize = 500;
    for (let i = 0; i < values.length; i += batchSize) {
      const batch = values.slice(i, i + batchSize).join(", ");
      await queryRunner.query(`
        INSERT INTO "cells" ("id", "row", "col")
        VALUES ${batch}
        ON CONFLICT ("id") DO NOTHING
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "cells"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
  }
}
