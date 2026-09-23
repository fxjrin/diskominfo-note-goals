import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../errors/HttpError.js";

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: "Route not found" });
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message, details: error.details ?? undefined });
    return;
  }
  if (error instanceof SyntaxError && "body" in error) {
    res.status(400).json({ error: "Malformed JSON body" });
    return;
  }
  console.error(error);
  res.status(500).json({ error: "Internal server error" });
}
