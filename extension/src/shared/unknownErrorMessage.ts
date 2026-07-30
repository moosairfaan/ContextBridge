export function messageFromUnknownError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function failedServiceWorkerResponse(error: unknown): {
  ok: false;
  error: string;
} {
  return { ok: false, error: messageFromUnknownError(error) };
}
