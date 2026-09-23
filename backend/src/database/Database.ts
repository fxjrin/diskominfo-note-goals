import mysql, {
  type Pool,
  type PoolConnection,
  type ResultSetHeader,
  type RowDataPacket,
} from "mysql2/promise";
import { config } from "../config/env.js";

export type Queryable = Pool | PoolConnection;
export type SqlParam = string | number | boolean | Date | null;

export class Database {
  private static instance: Database | undefined;
  readonly pool: Pool;

  private constructor() {
    this.pool = mysql.createPool({
      ...config.db,
      waitForConnections: true,
      connectionLimit: 10,
      decimalNumbers: true,
      namedPlaceholders: false,
    });
  }

  static get(): Database {
    Database.instance ??= new Database();
    return Database.instance;
  }

  async query<T extends RowDataPacket>(sql: string, params: SqlParam[] = []): Promise<T[]> {
    const [rows] = await this.pool.execute<T[]>(sql, params);
    return rows;
  }

  async execute(sql: string, params: SqlParam[] = []): Promise<ResultSetHeader> {
    const [result] = await this.pool.execute<ResultSetHeader>(sql, params);
    return result;
  }

  async transaction<T>(work: (conn: PoolConnection) => Promise<T>): Promise<T> {
    const conn = await this.pool.getConnection();
    try {
      await conn.beginTransaction();
      const result = await work(conn);
      await conn.commit();
      return result;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  async ping(): Promise<void> {
    await this.pool.query("SELECT 1");
  }

  async close(): Promise<void> {
    await this.pool.end();
    Database.instance = undefined;
  }
}
