const getEnv = (key: string, fallback?: string) => {
  const value = import.meta.env[key];
  return typeof value === 'string' && value.length > 0 ? value : fallback;
};

export const appEnv = {
  appName: 'NMC Smart Sanitation Dashboard',
  apiMode: getEnv('VITE_API_MODE', 'mock'),
  apiBaseUrl: getEnv('VITE_API_BASE_URL', '/api') ?? '/api',
  enableDevtools: getEnv('VITE_ENABLE_QUERY_DEVTOOLS', 'false') === 'true',
  realtimePollMs: Number(getEnv('VITE_REALTIME_POLL_MS', '15000')),
};
