import { MigrationInterface, QueryRunner } from "typeorm";

export class GameCompletion1700000000004 implements MigrationInterface {
  name = "GameCompletion1700000000004";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "games"
      ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMPTZ DEFAULT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "games"
      ADD COLUMN IF NOT EXISTS "winnerIds" JSONB DEFAULT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "games" DROP COLUMN IF EXISTS "winnerIds"
    `);
    await queryRunner.query(`
      ALTER TABLE "games" DROP COLUMN IF EXISTS "completedAt"
    `);
  }
}
