interface LoosePostgrestError {
  message: string;
}

export interface LoosePostgrestResult {
  data: unknown;
  error: LoosePostgrestError | null;
}

export interface LoosePostgrestQueryBuilder extends PromiseLike<LoosePostgrestResult> {
  select(columns?: string): LoosePostgrestQueryBuilder;
  insert(values: unknown): LoosePostgrestQueryBuilder;
  update(values: unknown): LoosePostgrestQueryBuilder;
  delete(): LoosePostgrestQueryBuilder;
  eq(column: string, value: unknown): LoosePostgrestQueryBuilder;
  or(filters: string): LoosePostgrestQueryBuilder;
  in(column: string, values: unknown[]): LoosePostgrestQueryBuilder;
  gte(column: string, value: unknown): LoosePostgrestQueryBuilder;
  lte(column: string, value: unknown): LoosePostgrestQueryBuilder;
  order(column: string, options?: { ascending?: boolean }): LoosePostgrestQueryBuilder;
  limit(count: number): LoosePostgrestQueryBuilder;
  range(from: number, to: number): LoosePostgrestQueryBuilder;
  maybeSingle(): Promise<LoosePostgrestResult>;
  single(): Promise<LoosePostgrestResult>;
}

export interface LooseSupabaseClient {
  from(table: string): LoosePostgrestQueryBuilder;
}

export function asLooseSupabaseClient(client: unknown): LooseSupabaseClient {
  return client as LooseSupabaseClient;
}
