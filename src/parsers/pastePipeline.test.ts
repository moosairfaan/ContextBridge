import { describe, expect, it } from "vitest";
import { formatHandoffSummary } from "../lib/formatSummary";
import { parsePastedConversation } from "./index";

/**
 * End-to-end paste pipeline: parse → format, for each label style from the
 * generic parser. Must never throw.
 */
describe("paste mode pipeline", () => {
  const cases: { name: string; paste: string; expectedPlatform: string }[] = [
    {
      name: "ChatGPT You:/ChatGPT:",
      paste: `You: What is TypeScript?
ChatGPT: A typed superset of JavaScript.`,
      expectedPlatform: "chatgpt",
    },
    {
      name: "Claude Human:/Claude:",
      paste: `Human: Explain closures.
Claude: Closures capture outer scope variables.`,
      expectedPlatform: "claude",
    },
    {
      name: "Gemini You:/Gemini:",
      paste: `You: Name two fruits.
Gemini: Apple and banana.`,
      expectedPlatform: "gemini",
    },
    {
      name: "blank-line fallback",
      paste: `What is 2+2?

Four.`,
      expectedPlatform: "unknown",
    },
  ];

  for (const testCase of cases) {
    it(`formats ${testCase.name} without throwing`, () => {
      expect(() => {
        const conversation = parsePastedConversation(testCase.paste, "auto");
        expect(conversation.platform).toBe(testCase.expectedPlatform);
        expect(conversation.turns.length).toBeGreaterThanOrEqual(1);

        const summary = formatHandoffSummary(conversation);
        expect(summary).toContain("---");
        expect(summary).toContain("Key points so far:");
        expect(summary).toContain("Last exchange:");
      }).not.toThrow();
    });
  }
});
