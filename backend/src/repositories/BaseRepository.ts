import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { Database, type SqlParam } from "../database/Database.js";

export abstract class BaseRepository {
  protected constructor(protected readonly db: Database = Database.get()) {}

  protected async rows<T extends RowDataPacket>(
    sql: string,
    params: SqlParam[],
    conn?: PoolConnection,
  ): Promise<T[]> {
    if (conn) {
      const [rows] = await conn.execute<T[]>(sql, params);
      return rows;
    }
    return this.db.query<T>(sql, params);
  }

  protected async run(sql: string, params: SqlParam[], conn?: PoolConnection): Promise<ResultSetHeader> {
    if (conn) {
      const [result] = await conn.execute<ResultSetHeader>(sql, params);
      return result;
    }
    return this.db.execute(sql, params);
  }
}
