const { createClient } = require('@redis/client');
const RequestError = require('./request-error');

let client;
let connecting;

async function runQuotaScript(script, keys, args) {
  try {
    if (!client) {
      const url = process.env.REDIS_URL?.trim();
      if (!url) throw new Error('Redis configuration is missing.');
      client = createClient({
        url,
        disableOfflineQueue: true,
        socket: { connectTimeout: 4000, socketTimeout: 8000, reconnectStrategy: false },
      });
      // Commands surface connection errors without printing connection details.
      client.on('error', () => {});
    }
    if (!client.isReady) {
      connecting ??= client.connect().finally(() => { connecting = null; });
      await connecting;
    }
    return await client.eval(script, { keys, arguments: args.map(String) });
  } catch {
    throw new RequestError(503, 'Usage limits are temporarily unavailable. Try again shortly.');
  }
}

module.exports = { runQuotaScript };
