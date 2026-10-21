/**
 * Performance Profiler Utility for DigiPro Store
 * Tracks route rendering time, DB query counts, and execution metrics in development.
 */

export interface ProfileResult<T> {
  result: T;
  durationMs: number;
}

export async function profileRoute<T>(
  routeName: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  try {
    const res = await fn();
    const duration = Math.round(performance.now() - start);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[PROFILE] ${routeName} completed in ${duration}ms`);
    }
    return res;
  } catch (error) {
    const duration = Math.round(performance.now() - start);
    console.error(`[PROFILE ERROR] ${routeName} failed after ${duration}ms:`, error);
    throw error;
  }
}
