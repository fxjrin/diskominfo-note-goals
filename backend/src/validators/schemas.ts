import { z } from "zod";

const title = z.string().trim().min(1).max(150);
const year = z.coerce.number().int().min(2000).max(2100);
const month = z.coerce.number().int().min(1).max(12);

export const idParam = z.object({ id: z.coerce.number().int().positive() });

export const listGoalsQuery = z.object({ year: year.optional() });

export const createGoalBody = z.object({
  title,
  description: z.string().trim().max(2000).nullable().optional(),
  year,
});

export const updateGoalBody = createGoalBody.partial().refine(
  (body) => Object.keys(body).length > 0,
  { message: "At least one field is required" },
);

export const createTaskBody = z.object({ title, month });

export const updateTaskBody = z
  .object({
    title: title.optional(),
    month: month.optional(),
    status: z.enum(["pending", "done"]).optional(),
  })
  .refine((body) => Object.keys(body).length > 0, { message: "At least one field is required" });

export const taskStatusBody = z.object({ status: z.enum(["pending", "done"]) });

export const loginBody = z.object({
  username: z.string().trim().min(1).max(50),
  password: z.string().min(1).max(200),
});
