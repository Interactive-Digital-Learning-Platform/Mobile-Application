export type MaterialStatus = "not_requested" | "queued" | "generating" | "ready" | "failed";
export interface MaterialsOverview {
  generatedTypes: string[];
  missingCount: number;
  hasActiveJobs: boolean;
  states: { type: string; status: MaterialStatus; available: boolean; error?: string }[];
}

/** One request at a time, only while the server reports actual active jobs.
 * A bounded session and an explicit refresh replace endless retry loops. */
export function createMaterialPoller(options: {
  request: (signal: AbortSignal) => Promise<MaterialsOverview>;
  onUpdate: (overview: MaterialsOverview) => void;
  onStop: (reason: "idle" | "error" | "paused") => void;
  schedule?: (callback: () => void, ms: number) => ReturnType<typeof setTimeout>;
  cancel?: (timer: ReturnType<typeof setTimeout>) => void;
  now?: () => number;
  maxMs?: number;
}) {
  const schedule = options.schedule ?? setTimeout;
  const cancel = options.cancel ?? clearTimeout;
  const now = options.now ?? Date.now;
  let startedAt = now();
  let disposed = false;
  let inFlight = false;
  let refreshPending = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | undefined;
  const run = async () => {
    if (disposed) return;
    if (inFlight) { refreshPending = true; return; }
    inFlight = true;
    controller = new AbortController();
    try {
      const overview = await options.request(controller.signal);
      if (disposed) return;
      options.onUpdate(overview);
      if (refreshPending) {
        refreshPending = false;
        timer = schedule(() => { void run(); }, 0);
      } else if (!overview.hasActiveJobs) options.onStop("idle");
      else if (now() - startedAt >= (options.maxMs ?? 120_000)) options.onStop("paused");
      else timer = schedule(() => { void run(); }, 3500);
    } catch {
      if (!disposed) options.onStop("error");
    } finally { inFlight = false; }
  };
  return {
    refresh() {
      if (disposed) return;
      startedAt = now();
      if (timer !== undefined) cancel(timer);
      void run();
    },
    stop() {
      disposed = true;
      if (timer !== undefined) cancel(timer);
      controller?.abort();
    },
  };
}

export function materialLabel(status: MaterialStatus, available: boolean) {
  if (available) {
    if (status === "generating" || status === "queued") return "Ready to open · updating";
    if (status === "failed") return "Previous version ready · update failed";
    return "Ready — tap to open";
  }
  return { not_requested: "Tap to create", queued: "Waiting its turn…", generating: "Creating your material…", failed: "Couldn't finish — tap to retry", ready: "Ready — tap to open" }[status];
}
