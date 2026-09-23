import type { RowDataPacket } from "mysql2/promise";

export interface UserRow extends RowDataPacket {
  id: number;
  username: string;
  name: string;
  password_hash: string;
  created_at: Date;
}

export class User {
  constructor(
    readonly id: number,
    readonly username: string,
    readonly name: string,
    readonly passwordHash: string,
  ) {}

  static fromRow(row: UserRow): User {
    return new User(row.id, row.username, row.name, row.password_hash);
  }

  toJSON() {
    return { id: this.id, username: this.username, name: this.name };
  }
}

export interface AuthUser {
  id: number;
  username: string;
  name: string;
}
