import "server-only";
import Groq from "groq-sdk";
import { EXERCISES } from "@/config/exercises";
import { logger } from "@/lib/logger";
import type { CoachingRequestInput } from "@/lib/validations/coaching";
import {
  COACHING_SYSTEM_PROMPT,
  getDeterministicFallbackCue,
} from "@/services/coaching/prompts";

const NON_MAJOR_COOLDOWN_MS = 5_000;
const GROQ_TIMEOUT_MS = 4_000;
const MAX_OUTPUT_CHARS = 180;
export const DEFAULT_PRIMARY_MODEL = "openai/gpt-oss-120b";
export const DEFAULT_FALLBACK_MODEL = "openai/gpt-oss-20b";

const MAJOR_EVENTS = new Set([
  "workout_started",
  "set_completed",
  "workout_completed",
]);

const MEDICAL_CLAIM_PATTERN =
  /\b(diagnos(e|is)|torn\s+(acl|ligament|rotator)|herniated|fracture|prescribe|medical\s+condition)\b/i;

export interface CoachingCompletionClient {
  complete(params: {
    model: string;
    systemPrompt: string;
    userPrompt: string;
    signal: AbortSignal;
  }): Promise<string>;
}

export interface CoachingResponse {
  feedback: string;
  source: "groq" | "fallback";
  modelUsed?: string;
  throttled: boolean;
  event: CoachingRequestInput["event"];
  exercise: CoachingRequestInput["exercise"];
}

export function sanitizeCoachingText(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  const cleaned = raw
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[*_`#>]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/^["']+|["']+$/g, "")
    .trim();

  if (cleaned.length < 4) return null;
  if (MEDICAL_CLAIM_PATTERN.test(cleaned)) return null;
  return cleaned.slice(0, MAX_OUTPUT_CHARS);
}

function createGroqClient(apiKey: string): CoachingCompletionClient {
  const groq = new Groq({ apiKey });
  return {
    async complete({ model, systemPrompt, userPrompt, signal }) {
      const response = await groq.chat.completions.create(
        {
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.4,
          max_tokens: 60,
        },
        { signal }
      );
      return response.choices[0]?.message?.content ?? "";
    },
  };
}

export function createCoachingService(options?: {
  client?: CoachingCompletionClient | null;
  model?: string;
  fallbackModel?: string;
  timeoutMs?: number;
  cooldownMs?: number;
}) {
  const lastCueByUser = new Map<string, number>();
  const timeoutMs = options?.timeoutMs ?? GROQ_TIMEOUT_MS;
  const cooldownMs = options?.cooldownMs ?? NON_MAJOR_COOLDOWN_MS;

  function resolveClient(): CoachingCompletionClient | null {
    if (options && "client" in options) {
      return options.client ?? null;
    }
    const apiKey = process.env.GROQ_API_KEY?.trim();
    if (!apiKey) return null;
    return createGroqClient(apiKey);
  }

  return {
    resetCooldowns(): void {
      lastCueByUser.clear();
    },

    async generateFeedback(
      userId: string,
      input: CoachingRequestInput,
      now = Date.now()
    ): Promise<CoachingResponse> {
      const isMajor = MAJOR_EVENTS.has(input.event);
      const lastSent = lastCueByUser.get(userId) ?? 0;

      if (!isMajor && now - lastSent < cooldownMs) {
        return {
          feedback: "",
          source: "fallback",
          throttled: true,
          event: input.event,
          exercise: input.exercise,
        };
      }

      const fallback = getDeterministicFallbackCue({
        event: input.event,
        exercise: input.exercise,
        issue: input.issue,
        currentSet: input.currentSet,
      });

      const client = resolveClient();
      if (!client) {
        lastCueByUser.set(userId, now);
        return {
          feedback: fallback,
          source: "fallback",
          throttled: false,
          event: input.event,
          exercise: input.exercise,
        };
      }

      const exerciseLabel = EXERCISES[input.exercise].label;
      const lines = [
        `Exercise: ${exerciseLabel}`,
        `Event: ${input.event}`,
        `Progress: Rep ${input.repCount}, Set ${input.currentSet} of ${input.targetSets}`,
      ];
      if (input.issue) {
        lines.push(`Form Issue: ${input.issue}`);
      }

      const primaryModel =
        options?.model ??
        process.env.GROQ_MODEL?.trim() ??
        DEFAULT_PRIMARY_MODEL;

      const fallbackModel =
        options?.fallbackModel ??
        process.env.GROQ_FALLBACK_MODEL?.trim() ??
        (primaryModel === DEFAULT_PRIMARY_MODEL ? DEFAULT_FALLBACK_MODEL : undefined);

      const candidateModels = [primaryModel, fallbackModel].filter(
        (m): m is string => Boolean(m && m.trim().length > 0)
      );

      // Try primary model first, then secondary fallback model if provided
      for (const currentModel of candidateModels) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        try {
          const rawText = await client.complete({
            model: currentModel,
            systemPrompt: COACHING_SYSTEM_PROMPT,
            userPrompt: lines.join("\n"),
            signal: controller.signal,
          });

          const sanitized = sanitizeCoachingText(rawText);
          if (sanitized) {
            lastCueByUser.set(userId, now);
            return {
              feedback: sanitized,
              source: "groq",
              modelUsed: currentModel,
              throttled: false,
              event: input.event,
              exercise: input.exercise,
            };
          }

          logger.warn("Model returned empty or medical-filtered response", {
            userId,
            model: currentModel,
            event: input.event,
          });
        } catch (err) {
          logger.warn("Coaching call failed on model", {
            userId,
            model: currentModel,
            event: input.event,
            error: err instanceof Error ? err.message : "Unknown error",
          });
        } finally {
          clearTimeout(timer);
        }
      }

      // If all candidate LLM models fail/filter, return deterministic voice cue
      lastCueByUser.set(userId, now);
      return {
        feedback: fallback,
        source: "fallback",
        throttled: false,
        event: input.event,
        exercise: input.exercise,
      };
    },
  };
}

export const coachingService = createCoachingService();
