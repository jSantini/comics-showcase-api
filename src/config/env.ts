export function readEnv(env: NodeJS.ProcessEnv = process.env) {
  const rawPort = env.PORT ?? '3000';
  if (!/^[0-9]+$/.test(rawPort) || Number(rawPort) < 1 || Number(rawPort) > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }
  const level = env.LOG_LEVEL ?? 'info';
  if (!['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'].includes(level)) {
    throw new Error('LOG_LEVEL is invalid');
  }
  return { port: Number(rawPort), host: '0.0.0.0', level };
}
