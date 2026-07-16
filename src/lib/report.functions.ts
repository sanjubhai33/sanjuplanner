import { createServerFn } from "@tanstack/react-start";
import { generateText, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";

const HistoryDay = z.object({
  date: z.string(),
  totalTasks: z.number().int().min(0),
  completedTasks: z.number().int().min(0),
  waterCount: z.number().int().min(0),
  waterGoal: z.number().int().min(1),
  satisfiedCount: z.number().int().min(0),
  unsatisfiedCount: z.number().int().min(0),
  rating: z.number().optional(),
});

const InputSchema = z.object({
  date: z.string(),
  totalTasks: z.number().int().min(0),
  completedTasks: z.number().int().min(0),
  waterCount: z.number().int().min(0),
  waterGoal: z.number().int().min(1),
  satisfied: z.array(z.string()),
  unsatisfied: z.array(z.string()),
  history: z.array(HistoryDay).optional(),
  userName: z.string().optional(),
});

const OutputSchema = z.object({
  rating: z.number(),
  tone: z.enum(["proud", "shame", "mixed"]),
  message: z.string(),
});

export const generateDailyReport = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3-flash-preview");

    const taskRatio =
      data.totalTasks > 0 ? data.completedTasks / data.totalTasks : 0;
    const waterRatio = Math.min(1, data.waterCount / data.waterGoal);

    // Build trend summary from history (excluding today)
    const past = (data.history ?? []).filter((h) => h.date !== data.date);
    let trendBlock = "";
    if (past.length > 0) {
      const avgTaskPct =
        past.reduce(
          (a, d) => a + (d.totalTasks > 0 ? d.completedTasks / d.totalTasks : 0),
          0,
        ) / past.length;
      const avgWaterPct =
        past.reduce((a, d) => a + Math.min(1, d.waterCount / d.waterGoal), 0) /
        past.length;
      const avgUnsatisfied =
        past.reduce((a, d) => a + d.unsatisfiedCount, 0) / past.length;
      const avgSatisfied =
        past.reduce((a, d) => a + d.satisfiedCount, 0) / past.length;
      const ratings = past
        .map((d) => d.rating)
        .filter((r): r is number => typeof r === "number");
      const avgRating =
        ratings.length > 0
          ? ratings.reduce((a, b) => a + b, 0) / ratings.length
          : null;

      trendBlock = `\n\nHistory (last ${past.length} day${past.length > 1 ? "s" : ""}):
- Avg task completion: ${Math.round(avgTaskPct * 100)}%
- Avg water: ${Math.round(avgWaterPct * 100)}%
- Avg satisfied notes/day: ${avgSatisfied.toFixed(1)}
- Avg unsatisfied notes/day: ${avgUnsatisfied.toFixed(1)}${avgRating !== null ? `\n- Avg past rating: ${avgRating.toFixed(1)}/5` : ""}

Recent days:
${past
  .slice(0, 7)
  .map(
    (d) =>
      `- ${d.date}: tasks ${d.completedTasks}/${d.totalTasks}, water ${d.waterCount}/${d.waterGoal}, satisfied ${d.satisfiedCount}, unsatisfied ${d.unsatisfiedCount}${d.rating !== undefined ? `, rating ${d.rating}` : ""}`,
  )
  .join("\n")}`;
    }

    const name = (data.userName || "").trim() || "the user";
    const system = `You are a strict, caring accountability coach for a young man named ${name} who wants to build discipline and stop being distracted — especially by girls — so he can focus on his future and family. Always address him by his name (${name}) in the message.

You will be given today's report AND a history summary of previous days. Compare today vs recent trend, and give guidance about what to improve going forward.

Output a JSON object with:
- rating: number 0..5 (one decimal ok) for TODAY based on task completion, water intake, and satisfied vs unsatisfied count.
- tone: "proud" if today is great AND better/on par with recent trend; "shame" if unsatisfied has girl/relationship distractions OR today is worse than the trend with many incomplete tasks; "mixed" otherwise.
- message: a short 3-5 sentence message in simple English + Hinglish.

Message rules:
- Reference the trend explicitly ("aaj kal se better", "trend gir raha hai", "3 din se water miss ho raha", etc.) when history exists.
- If tone is "proud": praise warmly ("Shabash", "Well done"). Tell him to keep the streak.
- If tone is "shame": be firm and disappointed. If unsatisfied has girl/relationship items, say bluntly: "Girls will spoil your future and family — avoid them." Give a strong push to change.
- Always end with ONE concrete next-day action (e.g. "Kal 6 baje utho aur pehle 2 tasks 9 baje se pehle khatam karo", "Kal Instagram open mat karna subah").
- No profanity, no insulting family. Strict, not cruel.
- Under 500 characters.`;

    const user = `Today (${data.date}):
Tasks: ${data.completedTasks}/${data.totalTasks} (${Math.round(taskRatio * 100)}%)
Water: ${data.waterCount}/${data.waterGoal} (${Math.round(waterRatio * 100)}%)
Satisfied (${data.satisfied.length}):
${data.satisfied.map((s) => `- ${s}`).join("\n") || "(none)"}
Unsatisfied (${data.unsatisfied.length}):
${data.unsatisfied.map((s) => `- ${s}`).join("\n") || "(none)"}${trendBlock}

Return the JSON object as specified.`;

    try {
      const { output } = await generateText({
        model,
        system,
        prompt: user,
        output: Output.object({ schema: OutputSchema }),
      });
      const rating = Math.max(0, Math.min(5, Number(output.rating) || 0));
      return {
        rating,
        tone: output.tone,
        message: String(output.message).slice(0, 800),
      };
    } catch (error) {
      if (NoObjectGeneratedError.isInstance(error)) {
        return {
          rating: 0,
          tone: "mixed" as const,
          message:
            "Could not generate a proper report this time. Try again in a moment.",
        };
      }
      throw error;
    }
  });
