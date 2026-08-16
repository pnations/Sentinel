import { useState } from "react";

const STORAGE_KEY = "sentinel.reviewerName";

export function useReviewerName() {
  const [name, setNameState] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) ?? "";
    } catch {
      return "";
    }
  });

  const setName = (value: string) => {
    setNameState(value);
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // localStorage may be unavailable (e.g. private browsing) — name still works for this session
    }
  };

  return { name, setName } as const;
}
