import { z } from "zod";

/** Structured fix plan from `plan_fix` (LLM JSON or fallback). */
export const fixPlanSchema = z.object({
  summary: z.string(),
  suggested_files: z
    .array(
      z.object({
        path: z.string(),
        change: z.string(),
      }),
    )
    .optional(),
  risk: z.enum(["low", "medium", "high"]).optional(),
});

export type FixPlan = z.infer<typeof fixPlanSchema>;
