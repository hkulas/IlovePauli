import { describe, expect, it } from "vitest";
import { keepIfTopicExists } from "./filters";

describe("keepIfTopicExists", () => {
  it("keeps all", () => {
    expect(keepIfTopicExists("all", [])).toBe("all");
  });

  it("keeps a topic that still exists", () => {
    expect(keepIfTopicExists("food", ["food", "verbs"])).toBe("food");
  });

  it("falls back to all when the topic is gone", () => {
    expect(keepIfTopicExists("gone", ["food"])).toBe("all");
    expect(keepIfTopicExists("gone", [])).toBe("all");
  });
});
