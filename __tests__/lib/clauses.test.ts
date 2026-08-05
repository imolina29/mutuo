// __tests__/lib/clauses.test.ts
import { describe, it, expect } from "@jest/globals";
import { CLAUSE_TEMPLATES, getClauseTemplate } from "@/lib/clauses";

describe("clauses", () => {
  it("has VOLUNTARY_MEETING as required", () => {
    const voluntary = CLAUSE_TEMPLATES.find((c) => c.type === "VOLUNTARY_MEETING");
    expect(voluntary).toBeDefined();
    expect(voluntary!.required).toBe(true);
  });

  it("all other clauses are optional", () => {
    const optional = CLAUSE_TEMPLATES.filter((c) => c.type !== "VOLUNTARY_MEETING");
    expect(optional.every((c) => c.required === false)).toBe(true);
  });

  it("getClauseTemplate returns correct template", () => {
    const template = getClauseTemplate("NO_RECORDING");
    expect(template).toBeDefined();
    expect(template!.text).toContain("grabaciones");
  });

  it("getClauseTemplate returns undefined for CUSTOM", () => {
    const template = getClauseTemplate("CUSTOM");
    expect(template).toBeUndefined();
  });
});
