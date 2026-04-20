import { toApiError, type ApiError } from "$lib/api/errors";

export interface QueryState<T> {
  data: T | undefined;
  error: ApiError | undefined;
  loading: boolean;
  fetchedAt: number | undefined;
}

export function createQuery<P, T>(
  fetcher: (params: P, signal?: AbortSignal) => Promise<T>,
  opts: { staleMs?: number; keepPrevious?: boolean } = {},
) {
  const { staleMs = 5_000, keepPrevious = true } = opts;
  let state = $state<QueryState<T>>({
    data: undefined,
    error: undefined,
    loading: false,
    fetchedAt: undefined,
  });
  let lastKey: string | undefined;
  let abort: AbortController | undefined;

  async function run(params: P): Promise<T | undefined> {
    const key = JSON.stringify(params);
    const now = Date.now();

    if (
      key === lastKey &&
      state.fetchedAt !== undefined &&
      now - state.fetchedAt < staleMs
    ) {
      return state.data;
    }

    abort?.abort();
    abort = new AbortController();
    lastKey = key;

    state = keepPrevious
      ? { ...state, loading: true, error: undefined }
      : { data: undefined, error: undefined, loading: true, fetchedAt: undefined };

    try {
      const data = await fetcher(params, abort.signal);
      state = { data, error: undefined, loading: false, fetchedAt: Date.now() };
      return data;
    } catch (err) {
      if ((err as Error)?.name === "AbortError") {
        state = { ...state, loading: false };
        return undefined;
      }
      state = { ...state, error: toApiError(err), loading: false };
      throw err;
    }
  }

  function reset() {
    abort?.abort();
    abort = undefined;
    lastKey = undefined;
    state = { data: undefined, error: undefined, loading: false, fetchedAt: undefined };
  }

  return {
    get state() {
      return state;
    },
    run,
    reset,
  };
}
