import {
  env,
  pipeline,
  type SummarizationPipeline,
} from "@xenova/transformers";

env.allowLocalModels = false;
env.useBrowserCache = true;

type SummarizeMessage = {
  type: "summarize";
  id: number;
  text: string;
};

type WorkerResponse = {
  id: number;
  summary?: string;
  error?: string;
};

let summarizer: SummarizationPipeline | null = null;
let modelLoadPromise: Promise<void> | null = null;

async function ensureModel(): Promise<void> {
  if (summarizer) return;
  if (!modelLoadPromise) {
    modelLoadPromise = (async () => {
      summarizer = (await pipeline(
        "summarization",
        "Xenova/distilbart-cnn-12-6"
      )) as SummarizationPipeline;
    })();
  }
  await modelLoadPromise;
}

self.onmessage = async (event: MessageEvent<SummarizeMessage>) => {
  const { type, id, text } = event.data;
  if (type !== "summarize") return;

  try {
    await ensureModel();
    const output = await summarizer!(text, {
      max_length: 256,
      min_length: 32,
    });

    const summary = Array.isArray(output)
      ? (output[0] as { summary_text?: string })?.summary_text ?? ""
      : String(output);

    const response: WorkerResponse = { id, summary };
    self.postMessage(response);
  } catch (err) {
    const response: WorkerResponse = {
      id,
      error: err instanceof Error ? err.message : String(err),
    };
    self.postMessage(response);
  }
};
