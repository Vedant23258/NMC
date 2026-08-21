import type { RealtimeClient, RealtimeSnapshot } from '@/core/realtime/realtime-client';

export const createPollingClient = <TParams, TResult>(
  fetcher: (params: TParams) => Promise<TResult>,
): RealtimeClient<TParams, TResult> => ({
  async getSnapshot(params: TParams): Promise<RealtimeSnapshot<TResult>> {
    const data = await fetcher(params);
    return {
      data,
      status: 'live',
      lastUpdatedAt: new Date().toISOString(),
    };
  },
});
