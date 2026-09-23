import { User, type UserRow } from "../models/User.js";
import { BaseRepository } from "./BaseRepository.js";

const COLUMNS = "id, username, name, password_hash, created_at";

export class UserRepository extends BaseRepository {
  constructor() {
    super();
  }

  async findByUsername(username: string): Promise<User | null> {
    const rows = await this.rows<UserRow>(`SELECT ${COLUMNS} FROM users WHERE username = ?`, [username]);
    return rows[0] ? User.fromRow(rows[0]) : null;
  }

  async findById(id: number): Promise<User | null> {
    const rows = await this.rows<UserRow>(`SELECT ${COLUMNS} FROM users WHERE id = ?`, [id]);
    return rows[0] ? User.fromRow(rows[0]) : null;
  }
}
