import type { Handler } from "@netlify/functions";
import { InvestigationError, investigate } from "../../server/aiInvestigation.js";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: { Allow: "POST" }, body: JSON.stringify({ message: "Method not allowed." }) };
  }

  let requestBody: unknown;
  try {
    requestBody = JSON.parse(event.body ?? "");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ message: "Invalid request body." }) };
  }

  try {
    return { statusCode: 200, body: JSON.stringify(await investigate(requestBody, process.env)) };
  } catch (error) {
    if (error instanceof InvestigationError) {
      return { statusCode: error.statusCode, body: JSON.stringify({ message: error.message }) };
    }
    return { statusCode: 502, body: JSON.stringify({ message: "AI investigation could not be completed." }) };
  }
};