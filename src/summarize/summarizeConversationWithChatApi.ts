import type { ExtensionSettings } from "../storage/extensionSettings";

const SUMMARIZATION_PROMPT = `Summarize this conversation for use as context when continuing in a different AI chat. Include key facts, decisions, and open questions. Be concise.

`;

function buildSummarizationPrompt(conversationText: string): string {
  return SUMMARIZATION_PROMPT + conversationText;
}

function buildChatCompletionsRequestBody(
  conversationText: string,
  extensionSettings: Pick<ExtensionSettings, "apiModel">
): string {
  return JSON.stringify({
    model: extensionSettings.apiModel,
    messages: [
      {
        role: "user",
        content: buildSummarizationPrompt(conversationText),
      },
    ],
  });
}

async function postConversationToChatCompletionsApi(
  extensionSettings: Pick<ExtensionSettings, "apiUrl" | "apiKey">,
  requestBody: string
): Promise<Response> {
  return fetch(extensionSettings.apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${extensionSettings.apiKey}`,
    },
    body: requestBody,
  });
}

function extractSummaryTextFromChatCompletionsResponse(responseBody: {
  choices?: { message?: { content?: string } }[];
}): string {
  const summaryText = responseBody.choices?.[0]?.message?.content;
  if (typeof summaryText !== "string" || !summaryText.trim()) {
    throw new Error("Empty summary from API");
  }
  return summaryText.trim();
}

export async function summarizeConversationWithChatApi(
  conversationText: string,
  extensionSettings: Pick<ExtensionSettings, "apiUrl" | "apiKey" | "apiModel">
): Promise<string> {
  const requestBody = buildChatCompletionsRequestBody(
    conversationText,
    extensionSettings
  );
  const httpResponse = await postConversationToChatCompletionsApi(
    extensionSettings,
    requestBody
  );

  if (!httpResponse.ok) {
    throw new Error(
      `API error ${httpResponse.status}: ${await httpResponse.text()}`
    );
  }

  const responseBody = (await httpResponse.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return extractSummaryTextFromChatCompletionsResponse(responseBody);
}
