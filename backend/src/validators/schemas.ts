import { z } from "zod";

const title = z.string().trim().min(1).max(150);
const year = z.coerce.number().int().min(2000).max(2100);

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD")
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().startsWith(value), {
    message: "Tanggal tidak valid",
  });

export const idParam = z.object({ id: z.coerce.number().int().positive() });

export const listGoalsQuery = z.object({ year: year.optional() });

const period = z
  .object({
    id: z.coerce.number().int().positive().optional(),
    name: z.string().trim().min(1).max(60),
    startDate: isoDate,
    endDate: isoDate,
    weight: z.coerce.number().min(0).max(100),
  })
  .refine((p) => p.startDate <= p.endDate, { message: "Tanggal mulai harus sebelum atau sama dengan tanggal selesai" });

const periods = z
  .array(period)
  .min(1)
  .max(24)
  .refine((list) => list.reduce((sum, p) => sum + p.weight, 0) <= 100.01, {
    message: "Total bobot periode tidak boleh lebih dari 100%",
  })
  .refine((list) => new Set(list.map((p) => p.id).filter((id) => id !== undefined)).size === list.filter((p) => p.id !== undefined).length, {
    message: "Periode duplikat",
  });

export const createGoalBody = z.object({
  title,
  description: z.string().trim().max(2000).nullable().optional(),
  year,
  periods: periods.optional(),
});

export const updateGoalBody = createGoalBody.partial().refine((body) => Object.keys(body).length > 0, {
  message: "At least one field is required",
});

export const createTaskBody = z.object({
  title,
  periodId: z.coerce.number().int().positive(),
  dueDate: isoDate,
});

export const updateTaskBody = z
  .object({
    title: title.optional(),
    periodId: z.coerce.number().int().positive().optional(),
    dueDate: isoDate.optional(),
    status: z.enum(["pending", "done"]).optional(),
  })
  .refine((body) => Object.keys(body).length > 0, { message: "At least one field is required" });

export const taskStatusBody = z.object({ status: z.enum(["pending", "done"]) });

export const loginBody = z.object({
  username: z.string().trim().min(1).max(50),
  password: z.string().min(1).max(200),
});
