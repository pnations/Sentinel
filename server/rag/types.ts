export type RagSource = "cisa" | "epa" | "nist" | "mitre";

export type RagChunk = {
  id: string;
  source: RagSource;
  organization: string;
  title: string;
  url: string;
  publishedAt: string;
  text: string;
  keywords: string[];
};

export type RetrievedChunk = RagChunk & {
  score: number;
};