import { readFile } from "node:fs/promises";
import path from "node:path";
import mysql, { type RowDataPacket } from "mysql2/promise";
import { config } from "../config/env.js";

async function migrate(): Promise<void> {
  const schema = await readFile(path.resolve(process.cwd(), "sql/schema.sql"), "utf8");
  const { database: _database, ...serverConfig } = config.db; // schema creates the database itself
  const conn = await mysql.createConnection({ ...serverConfig, multipleStatements: true });
  try {
    await conn.query(schema);
    console.log(`Schema applied to ${config.db.host}:${config.db.port}/${config.db.database}`);

    // Databases created by the earlier quarter-based version still carry goal_quarters
    const [legacy] = await conn.query<RowDataPacket[]>(
      "SELECT 1 FROM information_schema.tables WHERE table_schema = ? AND table_name = 'goal_quarters'",
      [config.db.database],
    );
    if (legacy.length > 0) {
      const upgrade = await readFile(path.resolve(process.cwd(), "sql/upgrade-from-quarters.sql"), "utf8");
      await conn.query(`USE ${config.db.database}; ${upgrade}`);
      console.log("Upgraded quarter-based data to periods with due dates");
    }
  } finally {
    await conn.end();
  }
}

migrate().catch((error: unknown) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
