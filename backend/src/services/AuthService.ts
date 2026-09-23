import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../config/env.js";
import { HttpError } from "../errors/HttpError.js";
import type { AuthUser, User } from "../models/User.js";
import { UserRepository } from "../repositories/UserRepository.js";

interface TokenPayload {
  sub: number;
  username: string;
}

export class AuthService {
  constructor(private readonly users: UserRepository = new UserRepository()) {}

  async login(username: string, password: string): Promise<{ token: string; user: User }> {
    const user = await this.users.findByUsername(username);
    // Same error for unknown user and wrong password so usernames cannot be enumerated.
    const valid = user ? await bcrypt.compare(password, user.passwordHash) : false;
    if (!user || !valid) {
      throw new HttpError(401, "Username atau password salah");
    }
    const payload: TokenPayload = { sub: user.id, username: user.username };
    const token = jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn as jwt.SignOptions["expiresIn"],
    });
    return { token, user };
  }

  async verify(token: string): Promise<AuthUser> {
    let payload: TokenPayload;
    try {
      payload = jwt.verify(token, config.jwtSecret) as unknown as TokenPayload;
    } catch {
      throw new HttpError(401, "Token tidak valid atau kedaluwarsa");
    }
    const user = await this.users.findById(Number(payload.sub));
    if (!user) {
      throw new HttpError(401, "Pengguna tidak ditemukan");
    }
    return user.toJSON();
  }
}
