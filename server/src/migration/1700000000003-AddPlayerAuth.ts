import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPlayerAuth1700000000003 implements MigrationInterface {
  name = "AddPlayerAuth1700000000003";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "players" (
        "id"           UUID         NOT NULL DEFAULT gen_random_uuid(),
        "username"     VARCHAR(64)  NOT NULL,
        "passwordHash" VARCHAR(128) NOT NULL,
        "color"        VARCHAR(10)  NOT NULL,
        "createdAt"    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_players" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_players_username" UNIQUE ("username")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "game_players" (
        "gameId"   VARCHAR(64) NOT NULL,
        "playerId" UUID        NOT NULL,
        "score"    INTEGER     NOT NULL DEFAULT 0,
        "joinedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_game_players" PRIMARY KEY ("gameId", "playerId"),
        CONSTRAINT "FK_game_players_game"
          FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_game_players_player"
          FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE
      )
    `);

    // Clear stale cell ownership (old socket ids are invalid)
    await queryRunner.query(`
      UPDATE "cells"
      SET "ownerId" = NULL, "ownerName" = NULL, "ownerColor" = NULL, "capturedAt" = NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "FK_users_game"
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "gameId"        VARCHAR(64) NOT NULL,
        "id"            VARCHAR(64) NOT NULL,
        "name"          VARCHAR(64) NOT NULL,
        "color"         VARCHAR(10) NOT NULL,
        "score"         INTEGER     NOT NULL DEFAULT 0,
        "cooldownUntil" TIMESTAMPTZ          DEFAULT NULL,
        "joinedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_users" PRIMARY KEY ("gameId", "id")
      )
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "game_players"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "players"`);
  }
}
