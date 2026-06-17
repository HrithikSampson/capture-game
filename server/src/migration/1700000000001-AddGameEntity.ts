import { MigrationInterface, QueryRunner } from "typeorm";
import { DEFAULT_GAME } from "../constants/game";

export class AddGameEntity1700000000001 implements MigrationInterface {
  name = "AddGameEntity1700000000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "games" (
        "id"         VARCHAR(64)  NOT NULL,
        "name"       VARCHAR(128) NOT NULL,
        "rows"       INTEGER      NOT NULL,
        "cols"       INTEGER      NOT NULL,
        "cooldownMs" INTEGER      NOT NULL DEFAULT 1500,
        "status"     VARCHAR(20)  NOT NULL DEFAULT 'active',
        "createdAt"  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_games" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `
      INSERT INTO "games" ("id", "name", "rows", "cols", "cooldownMs", "status")
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT ("id") DO NOTHING
    `,
      [
        DEFAULT_GAME.id,
        DEFAULT_GAME.name,
        DEFAULT_GAME.rows,
        DEFAULT_GAME.cols,
        DEFAULT_GAME.cooldownMs,
        DEFAULT_GAME.status,
      ]
    );

    // Scope existing cells to the default game
    await queryRunner.query(`
      ALTER TABLE "cells" ADD COLUMN IF NOT EXISTS "gameId" VARCHAR(64)
    `);
    await queryRunner.query(`
      UPDATE "cells" SET "gameId" = $1 WHERE "gameId" IS NULL
    `, [DEFAULT_GAME.id]);
    await queryRunner.query(`
      ALTER TABLE "cells" ALTER COLUMN "gameId" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "cells" DROP CONSTRAINT IF EXISTS "PK_cells"
    `);
    await queryRunner.query(`
      ALTER TABLE "cells" ADD CONSTRAINT "PK_cells" PRIMARY KEY ("gameId", "id")
    `);
    await queryRunner.query(`
      ALTER TABLE "cells" DROP CONSTRAINT IF EXISTS "FK_cells_game"
    `);
    await queryRunner.query(`
      ALTER TABLE "cells" ADD CONSTRAINT "FK_cells_game"
        FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_cells_owner"`);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_cells_game_owner"
        ON "cells" ("gameId", "ownerId")
    `);

    // Scope existing users to the default game
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "gameId" VARCHAR(64)
    `);
    await queryRunner.query(`
      UPDATE "users" SET "gameId" = $1 WHERE "gameId" IS NULL
    `, [DEFAULT_GAME.id]);
    await queryRunner.query(`
      ALTER TABLE "users" ALTER COLUMN "gameId" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "PK_users"
    `);
    await queryRunner.query(`
      ALTER TABLE "users" ADD CONSTRAINT "PK_users" PRIMARY KEY ("gameId", "id")
    `);
    await queryRunner.query(`
      ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "FK_users_game"
    `);
    await queryRunner.query(`
      ALTER TABLE "users" ADD CONSTRAINT "FK_users_game"
        FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "FK_users_game"
    `);
    await queryRunner.query(`
      ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "PK_users"
    `);
    await queryRunner.query(`
      ALTER TABLE "users" ADD CONSTRAINT "PK_users" PRIMARY KEY ("id")
    `);
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "gameId"
    `);

    await queryRunner.query(`
      ALTER TABLE "cells" DROP CONSTRAINT IF EXISTS "FK_cells_game"
    `);
    await queryRunner.query(`
      ALTER TABLE "cells" DROP CONSTRAINT IF EXISTS "PK_cells"
    `);
    await queryRunner.query(`
      ALTER TABLE "cells" ADD CONSTRAINT "PK_cells" PRIMARY KEY ("id")
    `);
    await queryRunner.query(`
      ALTER TABLE "cells" DROP COLUMN IF EXISTS "gameId"
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_cells_owner" ON "cells" ("ownerId")
    `);

    await queryRunner.query(`DROP TABLE IF EXISTS "games"`);
  }
}
