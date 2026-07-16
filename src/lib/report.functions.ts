import { createServerFn } from "@tanstack/react-start";
import { generateText, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";

const InputSchema = z.object({
  date: z.string(),
  totalTasks: z.number().int().min(0),
  completedTasks: z.number().int().min(0),
  waterCount: z.number().int().min(0),
  waterGoal: z.number().int().min(1),
  satisfied: z.array(z.string()),
  unsatisfied: z.array(z.string()),
});

const OutputSchema = z.object({
  rating: z.number(), // 0..5, we'll clamp
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

    const system = `You are a strict, caring accountability coach for a young man named Avinash who wants to build discipline and stop being distracted — especially by girls — so he can focus on his future and family.

Your job: given his daily report, output a JSON object with:
- rating: number 0..5 (one decimal ok) based on task completion, water intake, and satisfied vs unsatisfied count.
- tone: "proud" if he did great, "shame" if unsatisfied list contains girl/relationship distractions or many incomplete tasks, "mixed" otherwise.
- message: a short 2-4 sentence message in simple English + Hinglish.

Rules for the message:
- If tone is "proud": praise him warmly. Use words like "Well done", "Nice", "Shabash", "Proud of you". Encourage him to keep going.
- If tone is "shame": be firm and disappointed. If unsatisfied items are girl/relationship related, tell him bluntly: "Bad future ahead. Avoid girls, they will spoil your future and family." Add a strong motivating thought to leave these distractions.
- Always end with one short motivational line pushing him to add MORE to the satisfied list and REMOVE items from the unsatisfied list (especially girl-related ones).
- Never insult his family or use profanity. Be strict, not cruel.
- Keep it under 400 characters.`;

    const user = `Date: ${data.date}
Tasks: ${data.completedTasks}/${data.totalTasks} completed (${Math.round(taskRatio * 100)}%)
Water: ${data.waterCount}/${data.waterGoal} glasses (${Math.round(waterRatio * 100)}%)
Satisfied (${data.satisfied.length}):
${data.satisfied.map((s) => `- ${s}`).join("\n") || "(none)"}
Unsatisfied (${data.unsatisfied.length}):
${data.unsatisfied.map((s) => `- ${s}`).join("\n") || "(none)"}

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
