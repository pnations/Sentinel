import { ragCorpus } from "./corpus.js";
import type { RetrievedChunk } from "./types.js";

const STOP_WORDS = new Set(["about", "after", "from", "that", "this", "with", "your"]);

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

export function retrieve(query: string, limit = 4): RetrievedChunk[] {
  const queryTokens = new Set(tokenize(query));
  if (queryTokens.size === 0) return [];

  return ragCorpus
    .map((chunk) => {
      const searchable = new Set(tokenize(`${chunk.title} ${chunk.text} ${chunk.keywords.join(" ")}`));
      const matches = [...queryTokens].filter((token) => searchable.has(token));
      const score = matches.length / Math.sqrt(queryTokens.size);
      return { ...chunk, score };
    })
    .filter((chunk) => chunk.score > 0)
    .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id))
    .slice(0, limit);
}