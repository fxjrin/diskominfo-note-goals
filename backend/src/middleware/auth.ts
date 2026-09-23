import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../errors/HttpError.js";
import type { AuthUser } from "../models/User.js";
import { AuthService } from "../services/AuthService.js";

export function requireAuth(auth: AuthService = new AuthService()) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const header = req.headers.authorization ?? "";
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) {
      next(new HttpError(401, "Authorization header required"));
      return;
    }
    auth
      .verify(token)
      .then((user) => {
        res.locals.user = user;
        next();
      })
      .catch(next);
  };
}

export function currentUser(res: Response): AuthUser {
  return res.locals.user as AuthUser;
}
