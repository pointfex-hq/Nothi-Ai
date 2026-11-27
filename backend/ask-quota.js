const { randomUUID } = require('node:crypto');
const RequestError = require('./request-error');
const { getUsageLimits } = require('./usage-limit-settings');
const { runQuotaScript } = require('./quota-redis');
const { recordTokenReservation, recordTokenReconciliation, listRecordedTokenUsage } = require('./auth-store');

const minuteMs = 60_000;
const dayMs = 86_400_000;
const usageByUser = new Map();

const checkAndReserve = `
  local minuteMs = 60000
  local dayMs = 86400000
  local minuteKey, dayKey = KEYS[1], KEYS[2]
  local action, id = ARGV[1], ARGV[2]
  local perMinute, perDay = tonumber(ARGV[3]), tonumber(ARGV[4])
  local budget, output, input = tonumber(ARGV[5]), tonumber(ARGV[6]), tonumber(ARGV[7])

  local clock = redis.call('TIME')
  local now = tonumber(clock[1]) * 1000 + math.floor(tonumber(clock[2]) / 1000)
  local resetAt = (math.floor(now / dayMs) + 1) * dayMs
  local day = redis.call('HMGET', dayKey, 'resetAt', 'questions', 'tokens')
  local sameDay = tonumber(day[1]) == resetAt
  local questions = sameDay and (tonumber(day[2]) or 0) or 0
  local tokens = sameDay and (tonumber(day[3]) or 0) or 0

  if questions >= perDay then return { 'daily_questions', resetAt } end
  if input > budget - output then return { 'question_too_large', resetAt } end
  local reserved = input + output
  if reserved > budget - tokens then return { 'daily_tokens', resetAt } end

  redis.call('ZREMRANGEBYSCORE', minuteKey, '-inf', now - minuteMs)
  local recent = redis.call('ZCARD', minuteKey)
  if recent >= perMinute then
    local blocking = redis.call('ZRANGE', minuteKey, recent - perMinute, recent - perMinute, 'WITHSCORES')
    return { 'minute_questions', tonumber(blocking[2]) + minuteMs }
  end

  if action ~= 'check' then
    redis.call('ZADD', minuteKey, now, id)
    redis.call('PEXPIRE', minuteKey, minuteMs)
    if not sameDay then redis.call('DEL', dayKey) end
    local expiry = string.format('%.0f', resetAt)
    redis.call('HSET', dayKey, 'resetAt', expiry)
    redis.call('HINCRBY', dayKey, 'questions', 1)
    if action == 'reserve' then
      local charge = string.format('%.0f', reserved)
      redis.call('HINCRBY', dayKey, 'tokens', charge)
      redis.call('HSET', dayKey, 'reservation:' .. id, charge)
    end
    redis.call('PEXPIREAT', dayKey, expiry)
  end
  return { 'ok', resetAt }
`;

const applyReportedUsage = `
  local dayKey = KEYS[1]
  if redis.call('HGET', dayKey, 'resetAt') ~= ARGV[1] then return 0 end
  local field = 'reservation:' .. ARGV[2]
  local reserved = redis.call('HGET', dayKey, field)
  if not reserved then return 0 end
  local difference = tonumber(ARGV[3]) - tonumber(reserved)
  redis.call('HINCRBY', dayKey, 'tokens', string.format('%.0f', difference))
  redis.call('HDEL', dayKey, field)
  return 1
`;

const readDailyUsage = `
  local clock = redis.call('TIME')
  local resetAt = (math.floor(tonumber(clock[1]) / 86400) + 1) * 86400000
  local day = redis.call('HMGET', KEYS[1], 'resetAt', 'questions', 'tokens')
  if tonumber(day[1]) ~= resetAt then return {0, 0, resetAt} end
  return {tonumber(day[2]) or 0, tonumber(day[3]) or 0, resetAt}
`;

function quotaPrefix(userId) {
  return 'nothi:ask:v1:{' + userId + '}';
}

class AskQuotaError extends RequestError {
  constructor(limit, message, resetAt) {
    super(429, message);
    this.limit = limit;
    this.resetAt = resetAt;
  }
}

function reportedCount(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function questionLimitMessage(limit, period) {
  const noun = limit === 1 ? 'question' : 'questions';
  return 'You’ve reached your limit of ' + limit + ' ' + noun + ' per ' + period + '.';
}

async function applyQuota(userId, action, reservationId = '', estimatedInputTokens = 0) {
  if (!userId) throw new RequestError(401, 'Sign in to continue.');
  const { questionsPerMinute, questionsPerDay, maxOutputTokens, dailyTokenBudget } = getUsageLimits();

  const hasRedis = Boolean(process.env.REDIS_URL?.trim());
  if (!hasRedis) {
    const now = Date.now();
    let account = usageByUser.get(userId);
    if (!account) {
      account = { recent: [], day: null };
      usageByUser.set(userId, account);
    }
    if (!account.day || account.day.resetAt <= now) {
      account.day = { questions: 0, tokens: 0, resetAt: Math.floor(now / dayMs) * dayMs + dayMs };
    }
    const day = account.day;
    account.recent = account.recent.filter(time => time > now - minuteMs);
    if (day.questions >= questionsPerDay) {
      throw new AskQuotaError('daily_questions', questionLimitMessage(questionsPerDay, 'day'), day.resetAt);
    }
    const reservedTokens = estimatedInputTokens + maxOutputTokens;
    if (reservedTokens > dailyTokenBudget) {
      throw new AskQuotaError('daily_tokens', 'This question and its source context are larger than your daily token budget.', day.resetAt);
    }
    if (day.tokens + reservedTokens > dailyTokenBudget) {
      throw new AskQuotaError('daily_tokens', 'This question would exceed your daily token budget.', day.resetAt);
    }
    if (account.recent.length >= questionsPerMinute) {
      const lastBlockingRequest = account.recent[account.recent.length - questionsPerMinute];
      throw new AskQuotaError('minute_questions', questionLimitMessage(questionsPerMinute, 'minute'), lastBlockingRequest + minuteMs);
    }
    if (action !== 'check') {
      account.recent.push(now);
      day.questions += 1;
      if (action === 'reserve') day.tokens += reservedTokens;
    }
    return { dayKey: '', resetAt: day.resetAt, maxOutputTokens };
  }

  // A hash tag keeps both keys on the same shard on clustered Redis.
  const prefix = quotaPrefix(userId);
  const dayKey = prefix + ':day';
  const [decision, resetAt] = await runQuotaScript(checkAndReserve, [prefix + ':minute', dayKey], [
    action, reservationId, questionsPerMinute, questionsPerDay, dailyTokenBudget, maxOutputTokens, estimatedInputTokens,
  ]);
  switch (decision) {
    case 'ok':
      return { dayKey, resetAt, maxOutputTokens };
    case 'daily_questions':
      throw new AskQuotaError('daily_questions', questionLimitMessage(questionsPerDay, 'day'), resetAt);
    case 'question_too_large':
      throw new AskQuotaError('daily_tokens', 'This question and its source context are larger than your daily token budget.', resetAt);
    case 'daily_tokens':
      throw new AskQuotaError('daily_tokens', 'This question would exceed your daily token budget.', resetAt);
    case 'minute_questions':
      throw new AskQuotaError('minute_questions', questionLimitMessage(questionsPerMinute, 'minute'), resetAt);
    default:
      throw new RequestError(503, 'Usage limits are temporarily unavailable. Try again shortly.');
  }
}

function checkAskAllowance(userId) {
  return applyQuota(userId, 'check');
}

function recordAskWithoutModel(userId) {
  return applyQuota(userId, 'question', randomUUID());
}

async function reserveAsk(userId, messages) {
  // The free router can select different tokenizers, so use a conservative UTF-8 byte estimate.
  const estimatedInputTokens = Buffer.byteLength(JSON.stringify(messages), 'utf8') + 8 * messages.length;
  const reservationId = randomUUID();
  const timestamp = Date.now();
  const { dayKey, resetAt, maxOutputTokens } = await applyQuota(userId, 'reserve', reservationId, estimatedInputTokens);

  const reservedTokens = estimatedInputTokens + maxOutputTokens;
  const username = recordTokenReservation(reservationId, userId, reservedTokens, timestamp);
  if (!username) throw new RequestError(403, 'Your account is no longer active.');

  async function reconcileUsage(usage) {
    const total = reportedCount(usage?.total_tokens);
    const prompt = reportedCount(usage?.prompt_tokens);
    const completion = reportedCount(usage?.completion_tokens);
    const used = total === null
      ? (prompt ?? estimatedInputTokens) + (completion ?? maxOutputTokens)
      : Math.max(total, (prompt ?? 0) + (completion ?? 0));
    const accountedTokens = Math.min(used, Number.MAX_SAFE_INTEGER);
    const reported = total !== null || (prompt !== null && completion !== null);
    if (!recordTokenReconciliation(reservationId, userId, accountedTokens, reported, username)) return;
    if (!dayKey) {
      const day = usageByUser.get(userId)?.day;
      if (day?.resetAt === resetAt) day.tokens = Math.min(Number.MAX_SAFE_INTEGER, day.tokens - reservedTokens + accountedTokens);
      return;
    }

    try {
      await runQuotaScript(applyReportedUsage, [dayKey], [resetAt, reservationId, accountedTokens]);
    } catch {
      // The request already reached OpenRouter. Keep the original reservation if Redis cannot reconcile it.
    }
  }

  return { maxOutputTokens, reconcileUsage };
}

function sendAskQuotaError(error, response) {
  if (!(error instanceof AskQuotaError)) return false;
  const retryAfter = Math.max(1, Math.ceil((error.resetAt - Date.now()) / 1000));
  response.set('Retry-After', String(retryAfter));
  response.status(429).json({
    error: error.message,
    limit: error.limit,
    resetAt: new Date(error.resetAt).toISOString(),
  });
  return true;
}

async function getUserUsage(userId) {
  const limits = getUsageLimits();
  const account = usageByUser.get(userId);
  const now = Date.now();
  let day = account?.day && account.day.resetAt > now
    ? account.day
    : { questions: 0, tokens: 0, resetAt: Math.floor(now / dayMs) * dayMs + dayMs };
  if (process.env.REDIS_URL?.trim()) {
    const [questions, tokens, resetAt] = await runQuotaScript(readDailyUsage, [quotaPrefix(userId) + ':day'], []);
    day = { questions, tokens, resetAt };
  }
  return {
    questionsUsed: day.questions,
    questionsLimit: limits.questionsPerDay,
    tokensUsed: day.tokens,
    tokensLimit: limits.dailyTokenBudget,
    questionsPerMinute: limits.questionsPerMinute,
    resetAt: new Date(day.resetAt).toISOString(),
  };
}

function getRecordedTokenUsage() {
  const dayStart = Math.floor(Date.now() / dayMs) * dayMs;
  return new Map(listRecordedTokenUsage(dayStart).map(({ accountId, ...usage }) => [accountId, usage]));
}

module.exports = { checkAskAllowance, recordAskWithoutModel, reserveAsk, sendAskQuotaError, getUserUsage, getRecordedTokenUsage };
