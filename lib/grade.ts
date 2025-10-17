import { diffTokens, isPunct, normalizeForCompare, tokenize } from "./utils";
import type { GradeResponse } from "./types";

export function gradeAttempt(targetText: string, attemptText: string): GradeResponse {
  const target = String(targetText ?? "").trim();
  const attempt = String(attemptText ?? "").trim();

  if (!target || !attempt) {
    throw new Error("Se requieren el texto objetivo y el intento para calificar.");
  }

  const targetTokens = tokenize(target);
  const attemptTokens = tokenize(attempt);
  const diff = diffTokens(targetTokens, attemptTokens, { normalize: normalizeForCompare });
  const scoringTokens = diff.filter((token) => token.status !== "punct");
  const matchCount = scoringTokens.filter(
    (token) => token.status === "match" && !isPunct(token.token)
  ).length;
  const targetCount = targetTokens.filter((token) => !isPunct(token.text)).length;
  const missedWords = scoringTokens
    .filter((token) => token.status === "missing")
    .filter((token) => !isPunct(token.token))
    .map((token) => token.token);
  const extraWords = scoringTokens
    .filter((token) => token.status === "extra")
    .filter((token) => !isPunct(token.token))
    .map((token) => token.token);

  const rawAccuracy =
    targetCount === 0
      ? (extraWords.length === 0 ? 100 : 0)
      : Math.round((matchCount / targetCount) * 100);
  const accuracy = Math.min(100, Math.max(0, rawAccuracy));

  return {
    accuracy,
    missedWords,
    extraWords,
    diff,
    feedback:
      accuracy === 100
        ? "¡Perfecto! Sigue reforzándolo."
        : "Concéntrate en las palabras omitidas e inténtalo de nuevo.",
    paraphraseOk: false,
    gradedBy: "naive",
  };
}
