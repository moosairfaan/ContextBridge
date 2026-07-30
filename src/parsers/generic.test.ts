import { describe, expect, it } from "vitest";
import { parseGenericConversation } from "./generic";

describe("parseGenericConversation", () => {
  it("parses ChatGPT-style You:/ChatGPT: labels", () => {
    const result = parseGenericConversation(`You: What is TypeScript?
ChatGPT: TypeScript is a typed superset of JavaScript.`);

    expect(result.platform).toBe("chatgpt");
    expect(result.turns).toEqual([
      { role: "user", content: "What is TypeScript?", index: 0 },
      {
        role: "assistant",
        content: "TypeScript is a typed superset of JavaScript.",
        index: 1,
      },
    ]);
  });

  it("parses Claude-style Human:/Claude: labels case-insensitively", () => {
    const result = parseGenericConversation(`human: Explain closures.
claude: A closure captures variables from its outer scope.
ASSISTANT: They are common in JavaScript.`);

    expect(result.platform).toBe("claude");
    expect(result.turns).toHaveLength(3);
    expect(result.turns[0]).toMatchObject({
      role: "user",
      content: "Explain closures.",
      index: 0,
    });
    expect(result.turns[1]).toMatchObject({
      role: "assistant",
      content: "A closure captures variables from its outer scope.",
      index: 1,
    });
    expect(result.turns[2]).toMatchObject({
      role: "assistant",
      content: "They are common in JavaScript.",
      index: 2,
    });
  });

  it("parses Gemini-style You:/Gemini: labels with multiline content", () => {
    const result = parseGenericConversation(`You: List two fruits:
1 preference apple
Gemini: Here are two fruits:
- Apple
- Banana`);

    expect(result.platform).toBe("gemini");
    expect(result.turns).toHaveLength(2);
    expect(result.turns[0].role).toBe("user");
    expect(result.turns[0].content).toContain("List two fruits:");
    expect(result.turns[0].content).toContain("1 preference apple");
    expect(result.turns[1].role).toBe("assistant");
    expect(result.turns[1].content).toContain("Apple");
    expect(result.turns[1].content).toContain("Banana");
  });

  it("falls back to blank-line-separated alternating turns when no labels", () => {
    const result = parseGenericConversation(`What is 2+2?

Four.

Why?

Basic arithmetic.`);

    expect(result.platform).toBe("unknown");
    expect(result.turns).toEqual([
      { role: "user", content: "What is 2+2?", index: 0 },
      { role: "assistant", content: "Four.", index: 1 },
      { role: "user", content: "Why?", index: 2 },
      { role: "assistant", content: "Basic arithmetic.", index: 3 },
    ]);
  });

  it("returns a single unknown blob when turns cannot be detected confidently", () => {
    const blob = "Just some notes without any structure or labels.";
    const result = parseGenericConversation(blob);

    expect(result.platform).toBe("unknown");
    expect(result.turns).toEqual([
      { role: "user", content: blob, index: 0 },
    ]);
  });

  it("does not throw on empty or odd input", () => {
    expect(parseGenericConversation("")).toEqual({
      platform: "unknown",
      turns: [],
    });
    expect(parseGenericConversation("   \n\t  ")).toEqual({
      platform: "unknown",
      turns: [],
    });
    // Only one labeled turn is not confident enough
    const singleLabel = parseGenericConversation("You: hello alone");
    expect(singleLabel.platform).toBe("unknown");
    expect(singleLabel.turns).toHaveLength(1);
    expect(singleLabel.turns[0].content).toBe("You: hello alone");
  });
});
