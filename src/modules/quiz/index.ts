/**
 * src/modules/quiz/index.ts
 * ─────────────────────────
 * Barrel file — re-export everything from the quiz module for clean imports.
 *
 * Usage:
 *   import { useGenerateQuizMutation, useSubmitQuizMutation, useAnalyticsMeQuery } from "@/src/modules/quiz";
 */

export * from "./types";
export * from "@/api/quizAPI";
export * from "./quizHooks";
