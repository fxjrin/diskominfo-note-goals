import cors from "cors";
import express, { type Express } from "express";
import { config } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { createRouter } from "./routes/index.js";

export function createApp(): Express {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", true);
  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json({ limit: "64kb" }));
  app.use("/api", createRouter());
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

// Vercel runs the Express app as one function and requires a default export
export default createApp();
