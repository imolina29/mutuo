// Smoke test: verifies the project scaffolding is correctly set up
describe("Project Setup", () => {
  it("should have the correct TypeScript environment", () => {
    const value: string = "mutuo";
    expect(value).toBe("mutuo");
  });

  it("should correctly use path aliases", async () => {
    // Dynamic import to verify the alias works at test time
    const { cn } = await import("@/lib/utils");
    expect(typeof cn).toBe("function");
    expect(cn("a", "b")).toBe("a b");
  });
});
