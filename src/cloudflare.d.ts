// Minimal typings for the Cloudflare runtime pieces the Worker uses (avoids pulling in the full types package).
interface D1Result<T = unknown> { results?: T[]; meta: { changes?: number } }
interface D1PreparedStatement { bind(...values: unknown[]): D1PreparedStatement; run(): Promise<D1Result>; all<T = unknown>(): Promise<D1Result<T>> }
interface D1Database { prepare(query: string): D1PreparedStatement; batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> }
interface Fetcher { fetch(request: Request): Promise<Response> }
interface ExecutionContext { waitUntil(promise: Promise<unknown>): void }
interface ScheduledController { scheduledTime: number; cron: string }
type PagesFunction<E = unknown> = (context: { request: Request; env: E; waitUntil(promise: Promise<unknown>): void }) => Response | Promise<Response>;
