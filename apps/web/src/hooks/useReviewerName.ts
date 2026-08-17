import { useState } from "react";

export function useReviewerName() {
  const [name, setName] = useState("");

  return { name, setName } as const;
}
