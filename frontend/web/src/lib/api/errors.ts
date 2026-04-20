export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}

export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  if (err instanceof Error) return new ApiError("unknown", err.message, 0);
  return new ApiError("unknown", String(err), 0);
}
