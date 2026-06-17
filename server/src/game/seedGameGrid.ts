import { EntityManager } from "typeorm";
import { Cell } from "../entity/Cell";

/** Seeds an empty grid for a game. Used by migrations and future game creation. */
export async function seedGameGrid(
  manager: EntityManager,
  gameId: string,
  rows: number,
  cols: number
): Promise<void> {
  const batchSize = 500;
  const cells: Partial<Cell>[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      cells.push({ gameId, row, col });
    }
  }

  for (let i = 0; i < cells.length; i += batchSize) {
    const batch = cells.slice(i, i + batchSize);
    await manager
      .createQueryBuilder()
      .insert()
      .into(Cell)
      .values(batch)
      .orIgnore()
      .execute();
  }
}
