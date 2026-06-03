let summarizerWorker: Worker | null = null;
const pendingWorkerRequests = new Map<
  number,
  { resolve: (value: string) => void; reject: (reason: Error) => void }
>();
let workerRequestId = 0;

function getSummarizerWorker(): Worker {
  if (!summarizerWorker) {
    summarizerWorker = new Worker(
      new URL("./summarizer.worker.ts", import.meta.url),
      { type: "module" }
    );

    summarizerWorker.onmessage = (
      event: MessageEvent<{ id: number; summary?: string; error?: string }>
    ) => {
      const { id, summary, error } = event.data;
      const pending = pendingWorkerRequests.get(id);
      if (!pending) return;
      pendingWorkerRequests.delete(id);

      if (error) {
        pending.reject(new Error(error));
        return;
      }
      pending.resolve(summary ?? "");
    };

    summarizerWorker.onerror = (event) => {
      for (const [, pending] of pendingWorkerRequests) {
        pending.reject(new Error(event.message || "Summarizer worker failed"));
      }
      pendingWorkerRequests.clear();
      summarizerWorker?.terminate();
      summarizerWorker = null;
    };
  }

  return summarizerWorker;
}

export function summarizeText(text: string): Promise<string> {
  const id = ++workerRequestId;

  return new Promise((resolve, reject) => {
    pendingWorkerRequests.set(id, { resolve, reject });
    getSummarizerWorker().postMessage({ type: "summarize", id, text });
  });
}
