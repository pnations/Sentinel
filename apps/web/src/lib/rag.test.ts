import { describe, expect, it } from "vitest";
import { retrieve } from "../../../../server/rag/retriever.js";

describe("public-source retrieval", () => {
  it("finds OT remote access guidance from MITRE and CISA context", () => {
    const results = retrieve("unapproved remote access to an ICS asset");

    expect(results.map((result) => result.id)).toEqual(
      expect.arrayContaining(["mitre-ics-remote-services", "cisa-ics-advisories"])
    );
  });

  it("finds water-sector incident response guidance", () => {
    expect(retrieve("water utility incident response asset inventory")[0]).toMatchObject({
      id: "epa-water-sector-cybersecurity",
      source: "epa"
    });
  });

  it("returns no references for an unrelated query", () => {
    expect(retrieve("astronomy telescope maintenance")).toEqual([]);
  });
});