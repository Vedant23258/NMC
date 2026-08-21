export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(message: string, status = 500, code = 'unknown_error', details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const getUserFacingError = (error: unknown) => {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Your session has expired. Please sign in again.';
    if (error.status === 403) return 'You do not have permission to perform this action.';
    if (error.status === 404) return 'The requested record could not be found.';
    if (error.status === 429) return 'The service is busy. Please try again shortly.';
    if (error.status >= 500) return 'The dashboard service is currently unavailable.';
    return error.message;
  }

  return 'Something went wrong while loading this view.';
};
