import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  generateDailyReportForInput,
} from "./report.server";
import { DailyReportInputSchema } from "./report.shared";

export const generateDailyReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DailyReportInputSchema.parse(input))
  .handler(async ({ data }) => generateDailyReportForInput(data));
