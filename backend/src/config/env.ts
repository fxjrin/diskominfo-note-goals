import "dotenv/config";

export class Config {
  readonly port: number;
  readonly corsOrigin: string;
  readonly jwtSecret: string;
  readonly jwtExpiresIn: string;
  readonly db: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  };

  constructor(env: NodeJS.ProcessEnv = process.env) {
    this.port = Number(env.PORT ?? 4000);
    this.corsOrigin = env.CORS_ORIGIN ?? "http://localhost:5173";
    this.jwtSecret = this.require(env, "JWT_SECRET");
    this.jwtExpiresIn = env.JWT_EXPIRES_IN ?? "8h";
    this.db = {
      host: this.require(env, "DB_HOST"),
      port: Number(env.DB_PORT ?? 3306),
      user: this.require(env, "DB_USER"),
      password: env.DB_PASSWORD ?? "",
      database: env.DB_NAME ?? "fajrin_firmana",
    };
  }

  private require(env: NodeJS.ProcessEnv, key: string): string {
    const value = env[key];
    if (!value) {
      throw new Error(`Missing required environment variable ${key}`);
    }
    return value;
  }
}

export const config = new Config();
