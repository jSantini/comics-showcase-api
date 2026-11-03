export function readEnv(env: NodeJS.ProcessEnv = process.env) {
  const rawPort = env.PORT ?? '3000';
  if (!/^[0-9]+$/.test(rawPort) || Number(rawPort) < 1 || Number(rawPort) > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }
  const level = env.LOG_LEVEL ?? 'info';
  if (!['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'].includes(level)) {
    throw new Error('LOG_LEVEL is invalid');
  }
  return { port: Number(rawPort), host: '0.0.0.0', level, publicBaseUrl: validatePublicBaseUrl(env.PUBLIC_BASE_URL) };
}

export function validatePublicBaseUrl(value?: string): string | undefined {
  if (value === undefined) return undefined;
  let url: URL;
  try { url = new URL(value); } catch { throw new Error('PUBLIC_BASE_URL must be a public HTTPS origin'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash ||
      value.includes('?') || value.includes('#')) {
    throw new Error('PUBLIC_BASE_URL must be an HTTPS origin without credentials, path, query or fragment');
  }
  return url.origin;
}
