const SESSION_TITLE_MAX_LENGTH = 50;

function normalizeWhitespaceInTitle(titleText: string): string {
  return titleText.replace(/\s+/g, " ").trim();
}

export function truncateConversationSessionTitle(
  titleText: string,
  maxLength = SESSION_TITLE_MAX_LENGTH
): string {
  const normalizedTitle = normalizeWhitespaceInTitle(titleText);
  if (!normalizedTitle) return "";
  if (normalizedTitle.length <= maxLength) return normalizedTitle;
  return `${normalizedTitle.slice(0, maxLength)}…`;
}
