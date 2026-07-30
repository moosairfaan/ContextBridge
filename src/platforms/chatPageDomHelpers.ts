const MESSAGE_BODY_CSS_SELECTORS = [
  ".standard-markdown",
  ".progressive-markdown",
  ".markdown",
  ".prose",
  '[class*="markdown"]',
];

export function findFirstMatchingElement(
  cssSelectors: string[]
): HTMLElement | null {
  for (const cssSelector of cssSelectors) {
    const matchingElement = document.querySelector(cssSelector);
    if (matchingElement instanceof HTMLElement) return matchingElement;
  }
  return null;
}

export function findAllMatchingElements(cssSelectors: string[]): Element[] {
  const seenElements = new Set<Element>();
  const matchingElements: Element[] = [];
  for (const cssSelector of cssSelectors) {
    document.querySelectorAll(cssSelector).forEach((element) => {
      if (!seenElements.has(element)) {
        seenElements.add(element);
        matchingElements.push(element);
      }
    });
  }
  return matchingElements;
}

export function readVisibleTextFromChatMessageElement(
  messageElement: Element
): string {
  for (const cssSelector of MESSAGE_BODY_CSS_SELECTORS) {
    const messageBodyElement = messageElement.querySelector(cssSelector);
    if (messageBodyElement?.textContent?.trim()) {
      return messageBodyElement.textContent.trim();
    }
  }
  return messageElement.textContent?.trim() ?? "";
}

export function sortElementsByDocumentPosition(
  elements: Element[]
): Element[] {
  return [...elements].sort((leftElement, rightElement) => {
    const documentPosition = leftElement.compareDocumentPosition(rightElement);
    if (documentPosition & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
    if (documentPosition & Node.DOCUMENT_POSITION_PRECEDING) return 1;
    return 0;
  });
}

export function keepOutermostElementsOnly(elements: Element[]): Element[] {
  return elements.filter(
    (element) =>
      !elements.some(
        (otherElement) =>
          otherElement !== element && otherElement.contains(element)
      )
  );
}

function formatConversationLine(
  speakerRole: "user" | "assistant",
  messageText: string
): string {
  const speakerLabel = speakerRole === "user" ? "User" : "Assistant";
  return `${speakerLabel}: ${messageText}`;
}

function orderMessageElementsForConversation(
  messageElements: Element[]
): Element[] {
  return sortElementsByDocumentPosition(
    keepOutermostElementsOnly(messageElements)
  );
}

export function buildConversationTextFromMessageElements(
  messageElements: Element[],
  readSpeakerRole: (element: Element) => "user" | "assistant" | null
): string {
  const conversationLines: string[] = [];
  for (const messageElement of orderMessageElementsForConversation(
    messageElements
  )) {
    const speakerRole = readSpeakerRole(messageElement);
    const messageText = readVisibleTextFromChatMessageElement(messageElement);
    if (!speakerRole || !messageText) continue;
    conversationLines.push(formatConversationLine(speakerRole, messageText));
  }
  return conversationLines.join("\n\n");
}

function dispatchPasteEventOnElement(
  inputElement: HTMLElement,
  pastedText: string
): boolean {
  try {
    const clipboardTransfer = new DataTransfer();
    clipboardTransfer.setData("text/plain", pastedText);
    const pasteWasAccepted = inputElement.dispatchEvent(
      new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: clipboardTransfer,
      })
    );
    if (!pasteWasAccepted) return false;
    inputElement.dispatchEvent(
      new InputEvent("input", { bubbles: true, inputType: "insertFromPaste" })
    );
    return true;
  } catch {
    return false;
  }
}

function dispatchInputEventOnElement(
  inputElement: HTMLElement,
  inputType: string
): void {
  inputElement.dispatchEvent(
    new InputEvent("input", { bubbles: true, inputType, cancelable: true })
  );
}

function doesElementContainTextSample(
  inputElement: HTMLElement,
  expectedText: string
): boolean {
  const textSample = expectedText.trim().slice(0, 48);
  if (!textSample) return true;
  return (inputElement.textContent ?? "").includes(textSample);
}

function focusInputElementAtCursorPosition(
  inputElement: HTMLElement,
  cursorPosition: "start" | "end"
): void {
  inputElement.focus();

  const textSelection = window.getSelection();
  if (!textSelection) return;

  const textRange = document.createRange();
  textRange.selectNodeContents(inputElement);
  textRange.collapse(cursorPosition === "start");
  textSelection.removeAllRanges();
  textSelection.addRange(textRange);
}

function tryPasteTextWithExecCommand(
  inputElement: HTMLElement,
  textToInsert: string
): boolean {
  document.execCommand("insertText", false, textToInsert);
  dispatchInputEventOnElement(inputElement, "insertText");
  return true;
}

function tryPasteTextWithSyntheticPasteEvent(
  inputElement: HTMLElement,
  textToInsert: string
): boolean {
  return dispatchPasteEventOnElement(inputElement, textToInsert);
}

function pasteTextUsingProseMirrorParagraphs(
  inputElement: HTMLElement,
  textToInsert: string,
  cursorPosition: "start" | "end"
): void {
  const textLines = textToInsert.split("\n");
  const paragraphFragment = document.createDocumentFragment();
  for (const textLine of textLines) {
    const paragraphElement = document.createElement("p");
    paragraphElement.textContent = textLine.length > 0 ? textLine : "\u200b";
    paragraphFragment.append(paragraphElement);
  }

  if (cursorPosition === "start" && inputElement.childElementCount > 0) {
    inputElement.insertBefore(paragraphFragment, inputElement.firstChild);
  } else {
    inputElement.append(paragraphFragment);
  }

  dispatchInputEventOnElement(inputElement, "insertFromPaste");
}

function pasteTextUsingPlainTextContent(
  inputElement: HTMLElement,
  textToInsert: string,
  cursorPosition: "start" | "end"
): void {
  if (cursorPosition === "start") {
    inputElement.textContent =
      `${textToInsert}\n\n${inputElement.textContent ?? ""}`.trim();
  } else {
    inputElement.textContent =
      `${inputElement.textContent ?? ""}\n\n${textToInsert}`.trim();
  }
  dispatchInputEventOnElement(inputElement, "insertFromPaste");
}

export function pasteTextIntoContentEditableInput(
  inputElement: HTMLElement,
  textToInsert: string,
  cursorPosition: "start" | "end" = "end"
): void {
  focusInputElementAtCursorPosition(inputElement, cursorPosition);

  tryPasteTextWithExecCommand(inputElement, textToInsert);
  if (doesElementContainTextSample(inputElement, textToInsert)) return;

  if (
    tryPasteTextWithSyntheticPasteEvent(inputElement, textToInsert) &&
    doesElementContainTextSample(inputElement, textToInsert)
  ) {
    return;
  }

  pasteTextUsingProseMirrorParagraphs(inputElement, textToInsert, cursorPosition);
  if (doesElementContainTextSample(inputElement, textToInsert)) return;

  pasteTextUsingPlainTextContent(inputElement, textToInsert, cursorPosition);
}

function writeTextareaValue(
  textareaElement: HTMLTextAreaElement,
  textToInsert: string
): void {
  textareaElement.value = textToInsert;
  textareaElement.dispatchEvent(new Event("input", { bubbles: true }));
}

export function pasteTextIntoChatInputElement(
  chatInputElement: HTMLElement,
  textToInsert: string,
  cursorPosition: "start" | "end" = "start"
): void {
  if (chatInputElement instanceof HTMLTextAreaElement) {
    writeTextareaValue(chatInputElement, textToInsert);
    return;
  }
  pasteTextIntoContentEditableInput(chatInputElement, textToInsert, cursorPosition);
}
