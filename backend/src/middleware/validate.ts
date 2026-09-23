import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { ValidationError } from "../errors/HttpError.js";

type Source = "body" | "params" | "query";

// Express 5 exposes req.query and req.params as getters, so parsed values are
// stored on res.locals instead of being written back to the request.
export function validate(source: Source, schema: ZodType) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      next(new ValidationError(result.error.flatten()));
      return;
    }
    res.locals[source] = result.data;
    next();
  };
}
