export type DataAccessErrorCode =
  | "NOT_CONFIGURED"
  | "UNAUTHENTICATED"
  | "NOT_FOUND"
  | "INVALID_INPUT"
  | "DB_ERROR";

export interface DataAccessError {
  code: DataAccessErrorCode;
  message: string;
  cause?: string;
}

export type DataAccessResult<T> =
  | { data: T; error: null }
  | { data: null; error: DataAccessError };

export function ok<T>(data: T): DataAccessResult<T> {
  return { data, error: null };
}

export function fail<T>(error: DataAccessError): DataAccessResult<T> {
  return { data: null, error };
}
