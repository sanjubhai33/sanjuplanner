import { z } from "zod";

export const HistoryDaySchema = z.object({
  date: z.string(),
  totalTasks: z.number().int().min(0),
  completedTasks: z.number().int().min(0),
  waterCount: z.number().int().min(0),
  waterGoal: z.number().int().min(1),
  satisfiedCount: z.number().int().min(0),
  unsatisfiedCount: z.number().int().min(0),
  rating: z.number().optional(),
});

export const DailyReportInputSchema = z.object({
  date: z.string(),
  totalTasks: z.number().int().min(0),
  completedTasks: z.number().int().min(0),
  waterCount: z.number().int().min(0),
  waterGoal: z.number().int().min(1),
  satisfied: z.array(z.string()),
  unsatisfied: z.array(z.string()),
  history: z.array(HistoryDaySchema).optional(),
  userName: z.string().optional(),
});

export const DailyReportOutputSchema = z.object({
  rating: z.number(),
  tone: z.enum(["proud", "shame", "mixed"]),
  message: z.string(),
});

export type DailyReportInput = z.infer<typeof DailyReportInputSchema>;
export type DailyReportOutput = z.infer<typeof DailyReportOutputSchema>;