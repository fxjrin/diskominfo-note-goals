import { readFile } from "node:fs/promises";
import path from "node:path";
import mysql from "mysql2/promise";
import { config } from "../config/env.js";

async function migrate(): Promise<void> {
  const schemaPath = path.resolve(process.cwd(), "sql/schema.sql");
  const sql = await readFile(schemaPath, "utf8");
  const { database: _database, ...serverConfig } = config.db; // schema creates the database itself
  const conn = await mysql.createConnection({ ...serverConfig, multipleStatements: true });
  try {
    await conn.query(sql);
    console.log(`Schema applied to ${config.db.host}:${config.db.port}/${config.db.database}`);
  } finally {
    await conn.end();
  }
}

migrate().catch((error: unknown) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
