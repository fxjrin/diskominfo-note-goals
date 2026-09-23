import { Router } from "express";
import { AuthController } from "../controllers/AuthController.js";
import { ExportController } from "../controllers/ExportController.js";
import { GoalController } from "../controllers/GoalController.js";
import { TaskController } from "../controllers/TaskController.js";
import { Database } from "../database/Database.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  createGoalBody,
  createTaskBody,
  idParam,
  listGoalsQuery,
  loginBody,
  taskStatusBody,
  updateGoalBody,
  updateTaskBody,
} from "../validators/schemas.js";

export function createRouter(): Router {
  const router = Router();
  const auth = new AuthController();
  const goals = new GoalController();
  const tasks = new TaskController();
  const exports = new ExportController();

  router.get(
    "/health",
    asyncHandler(async (_req, res) => {
      await Database.get().ping();
      res.json({ status: "ok", database: "connected" });
    }),
  );

  router.post("/auth/login", validate("body", loginBody), asyncHandler(auth.login));

  const protectedRoutes = Router();
  protectedRoutes.use(requireAuth());

  protectedRoutes.get("/auth/me", asyncHandler(auth.me));

  protectedRoutes.get("/export/goals", validate("query", listGoalsQuery), asyncHandler(exports.year));
  protectedRoutes.get("/export/goals/:id", validate("params", idParam), asyncHandler(exports.goal));

  protectedRoutes.get("/goals", validate("query", listGoalsQuery), asyncHandler(goals.list));
  protectedRoutes.post("/goals", validate("body", createGoalBody), asyncHandler(goals.create));
  protectedRoutes.get("/goals/:id", validate("params", idParam), asyncHandler(goals.detail));
  protectedRoutes.put(
    "/goals/:id",
    validate("params", idParam),
    validate("body", updateGoalBody),
    asyncHandler(goals.update),
  );
  protectedRoutes.delete("/goals/:id", validate("params", idParam), asyncHandler(goals.remove));

  protectedRoutes.get("/goals/:id/tasks", validate("params", idParam), asyncHandler(tasks.listByGoal));
  protectedRoutes.post(
    "/goals/:id/tasks",
    validate("params", idParam),
    validate("body", createTaskBody),
    asyncHandler(tasks.create),
  );
  protectedRoutes.put(
    "/tasks/:id",
    validate("params", idParam),
    validate("body", updateTaskBody),
    asyncHandler(tasks.update),
  );
  protectedRoutes.patch(
    "/tasks/:id/status",
    validate("params", idParam),
    validate("body", taskStatusBody),
    asyncHandler(tasks.setStatus),
  );
  protectedRoutes.delete("/tasks/:id", validate("params", idParam), asyncHandler(tasks.remove));

  router.use(protectedRoutes);
  return router;
}
