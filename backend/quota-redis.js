const { createClient } = require('@redis/client');
const RequestError = require('./request-error');

let client;
let connecting;
const readDailyQuota = `
  local values = redis.call('HMGET', KEYS[1], 'resetAt', 'questions', 'tokens')
  if tonumber(values[1]) ~= tonumber(ARGV[1]) then return { 0, 0 } end
  return { tonumber(values[2]) or 0, tonumber(values[3]) or 0 }
`;

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

async function getDailyQuota(userId, resetAt) {
  const key = 'nothi:ask:v1:{' + userId + '}:day';
  return runQuotaScript(readDailyQuota, [key], [resetAt]);
}

module.exports = { runQuotaScript, getDailyQuota };
