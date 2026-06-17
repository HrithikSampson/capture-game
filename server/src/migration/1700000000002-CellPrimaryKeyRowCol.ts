import { MigrationInterface, QueryRunner } from "typeorm";

export class CellPrimaryKeyRowCol1700000000002 implements MigrationInterface {
  name = "CellPrimaryKeyRowCol1700000000002";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "cells" DROP CONSTRAINT IF EXISTS "PK_cells"
    `);
    await queryRunner.query(`
      ALTER TABLE "cells" DROP COLUMN IF EXISTS "id"
    `);
    await queryRunner.query(`
      ALTER TABLE "cells" ADD CONSTRAINT "PK_cells"
        PRIMARY KEY ("gameId", "row", "col")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "cells" DROP CONSTRAINT IF EXISTS "PK_cells"
    `);
    await queryRunner.query(`
      ALTER TABLE "cells" ADD COLUMN IF NOT EXISTS "id" VARCHAR(20)
    `);
    await queryRunner.query(`
      UPDATE "cells" SET "id" = "row"::text || '_' || "col"::text
      WHERE "id" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "cells" ALTER COLUMN "id" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "cells" ADD CONSTRAINT "PK_cells"
        PRIMARY KEY ("gameId", "id")
    `);
  }
}
