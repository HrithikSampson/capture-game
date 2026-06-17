import "dotenv/config";
import { AppDataSource } from "./data-source";

AppDataSource.initialize()
  .then(async () => {
    console.log("Reverting last migration...");
    await AppDataSource.undoLastMigration();
    console.log("Revert complete.");
    await AppDataSource.destroy();
  })
  .catch((err) => {
    console.error("Revert failed:", err);
    process.exit(1);
  });
