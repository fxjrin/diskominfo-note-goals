import app from "./app.js";
import { config } from "./config/env.js";
import { Database } from "./database/Database.js";

async function main(): Promise<void> {
  await Database.get().ping();
  const server = app.listen(config.port, () => {
    console.log(`API listening on http://localhost:${config.port}/api`);
  });

  const shutdown = async (): Promise<void> => {
    server.close();
    await Database.get().close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error: unknown) => {
  console.error("Failed to start:", error);
  process.exit(1);
});
