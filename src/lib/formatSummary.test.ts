import { describe, expect, it } from "vitest";
import {
  extractKeyPointsHeuristic,
  formatHandoffSummary,
} from "./formatSummary";
import type { ParsedConversation } from "../parsers/types";

const sample: ParsedConversation = {
  platform: "chatgpt",
  title: "TypeScript generics",
  turns: [
    {
      role: "user",
      content: "How do TypeScript generics work?",
      index: 0,
    },
    {
      role: "assistant",
      content:
        "Generics let you write reusable types. They preserve type information across functions.",
      index: 1,
    },
    {
      role: "user",
      content: "Show a simple example.",
      index: 2,
    },
    {
      role: "assistant",
      content: "function identity<T>(value: T): T { return value; }",
      index: 3,
    },
  ],
};

describe("formatHandoffSummary", () => {
  it("builds a handoff block with topic, key points, and last exchange", () => {
    const result = formatHandoffSummary(sample);

    expect(result).toContain("Continuing a conversation from ChatGPT.");
    expect(result).toContain("Topic: TypeScript generics");
    expect(result).toContain("Key points so far:");
    expect(result).toContain("- Generics let you write reusable types.");
    expect(result).toContain("Last exchange:");
    expect(result).toContain("Show a simple example.");
    expect(result).toContain("function identity<T>(value: T): T { return value; }");
    expect(result.startsWith("---")).toBe(true);
    expect(result.endsWith("---")).toBe(true);
  });

  it("uses ... when the user is waiting on a reply", () => {
    const pending: ParsedConversation = {
      platform: "claude",
      turns: [
        { role: "user", content: "Hello", index: 0 },
        { role: "assistant", content: "Hi there.", index: 1 },
        { role: "user", content: "What is a monad?", index: 2 },
      ],
    };

    const result = formatHandoffSummary(pending);
    expect(result).toContain("What is a monad?");
    expect(result).toMatch(/What is a monad\?\n\.\.\./);
  });

  it("respects maxTurns and custom extractKeyPoints", () => {
    const result = formatHandoffSummary(sample, {
      maxTurns: 2,
      extractKeyPoints: () => ["custom point"],
    });

    expect(result).toContain("- custom point");
    expect(result).not.toContain("Generics let you write reusable types.");
    expect(result).toContain("Show a simple example.");
  });
});

describe("extractKeyPointsHeuristic", () => {
  it("deduplicates identical first sentences", () => {
    const points = extractKeyPointsHeuristic([
      { role: "assistant", content: "Same point. Extra.", index: 0 },
      { role: "assistant", content: "Same point. Different rest.", index: 1 },
      { role: "user", content: "ignored", index: 2 },
    ]);
    expect(points).toEqual(["Same point."]);
  });
});
