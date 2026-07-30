/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parseFromDOM as parseChatGptFromDOM } from "./chatgpt";
import { parseFromDOM as parseClaudeFromDOM } from "./claude";

function setHostname(hostname: string): void {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: {
      ...window.location,
      hostname,
      href: `https://${hostname}/`,
    },
  });
}

describe("bookmarklet DOM parsers (fixture pages)", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    document.title = "";
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("reads a ChatGPT-style conversation from the DOM", () => {
    setHostname("chatgpt.com");
    document.title = "TypeScript help";
    document.body.innerHTML = `
      <main>
        <div data-message-author-role="user">
          <div class="markdown">What is TypeScript?</div>
        </div>
        <div data-message-author-role="assistant">
          <div class="markdown">TypeScript is a typed superset of JavaScript.</div>
        </div>
        <div data-message-author-role="user">
          <div class="markdown">Why use it?</div>
        </div>
        <div data-message-author-role="assistant">
          <div class="markdown">It catches type errors early.</div>
        </div>
      </main>
    `;

    const conversation = parseChatGptFromDOM();
    expect(conversation.platform).toBe("chatgpt");
    expect(conversation.title).toBe("TypeScript help");
    expect(conversation.turns).toHaveLength(4);
    expect(conversation.turns[0]).toMatchObject({
      role: "user",
      content: "What is TypeScript?",
    });
    expect(conversation.turns[1]).toMatchObject({
      role: "assistant",
      content: "TypeScript is a typed superset of JavaScript.",
    });
    expect(conversation.turns[3]).toMatchObject({
      role: "assistant",
      content: "It catches type errors early.",
    });
  });

  it("reads a Claude-style conversation from the DOM", () => {
    setHostname("claude.ai");
    document.title = "Closures";
    document.body.innerHTML = `
      <main>
        <div data-testid="user-message">Explain closures.</div>
        <div class="font-claude-response">
          A closure captures variables from its outer scope.
        </div>
        <div data-testid="user-message">Give a tiny example.</div>
        <div class="font-claude-response">
          function outer() { const x = 1; return () => x; }
        </div>
      </main>
    `;

    const conversation = parseClaudeFromDOM();
    expect(conversation.platform).toBe("claude");
    expect(conversation.turns).toHaveLength(4);
    expect(conversation.turns[0]).toMatchObject({
      role: "user",
      content: "Explain closures.",
    });
    expect(conversation.turns[1].role).toBe("assistant");
    expect(conversation.turns[1].content).toContain("closure captures");
    expect(conversation.turns[3].content).toContain("function outer");
  });

  it("throws a clear error on the wrong host", () => {
    setHostname("example.com");
    expect(() => parseChatGptFromDOM()).toThrow(/expected one of/i);
    expect(() => parseClaudeFromDOM()).toThrow(/expected one of/i);
  });
});
