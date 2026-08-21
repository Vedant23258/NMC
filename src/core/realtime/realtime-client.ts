export interface RealtimeSnapshot<T> {
  data?: T;
  status: 'idle' | 'refreshing' | 'live' | 'stale' | 'unavailable';
  lastUpdatedAt?: string;
}

export interface RealtimeClient<TParams, TResult> {
  getSnapshot: (params: TParams) => Promise<RealtimeSnapshot<TResult>>;
}
