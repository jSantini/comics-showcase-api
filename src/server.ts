import { buildApp } from './app.js';
import { readEnv } from './config/env.js';

async function main() {
  const env = readEnv();
  const app = buildApp({
    logger: { level: env.level },
    disableRequestLogging: true,
  });
  // Log route templates only; never raw URLs, headers or request payloads.
  app.addHook('onResponse', (request, reply, done) => {
    request.log.info({ method: request.method, route: request.routeOptions.url ?? 'unmatched', statusCode: reply.statusCode }, 'Request completed');
    done();
  });
  let closing = false;
  const shutdown = async () => {
    if (closing) return;
    closing = true;
    const deadline = setTimeout(() => process.exit(1), 10000);
    deadline.unref();
    try {
      await app.close();
      clearTimeout(deadline);
    } catch {
      app.log.error('Shutdown failed');
      process.exitCode = 1;
    }
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
  try {
    await app.listen({ port: env.port, host: env.host });
  } catch {
    app.log.error('Server startup failed');
    await shutdown();
    process.exitCode = 1;
  }
}
main().catch(() => {
  console.error('Server initialization failed; check configuration');
  process.exitCode = 1;
});
