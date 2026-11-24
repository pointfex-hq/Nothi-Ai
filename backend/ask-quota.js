const { randomUUID } = require('node:crypto');
const RequestError = require('./request-error');
const { getUsageLimits } = require('./usage-limit-settings');
const { runQuotaScript } = require('./quota-redis');

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
  const prefix = 'nothi:ask:v1:{' + userId + '}';
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
  const { dayKey, resetAt, maxOutputTokens } = await applyQuota(userId, 'reserve', reservationId, estimatedInputTokens);

  async function reconcileUsage(usage) {
    if (!dayKey) return;
    const total = reportedCount(usage?.total_tokens);
    const prompt = reportedCount(usage?.prompt_tokens);
    const completion = reportedCount(usage?.completion_tokens);
    const used = total === null
      ? (prompt ?? estimatedInputTokens) + (completion ?? maxOutputTokens)
      : Math.max(total, (prompt ?? 0) + (completion ?? 0));
    try {
      await runQuotaScript(applyReportedUsage, [dayKey], [resetAt, reservationId, Math.min(used, Number.MAX_SAFE_INTEGER)]);
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

function getUserUsage(userId) {
  const limits = getUsageLimits();
  const account = usageByUser.get(userId);
  const now = Date.now();
  const day = account?.day && account.day.resetAt > now
    ? account.day
    : { questions: 0, tokens: 0, resetAt: Math.floor(now / dayMs) * dayMs + dayMs };
  return {
    questionsUsed: day.questions,
    questionsLimit: limits.questionsPerDay,
    tokensUsed: day.tokens,
    tokensLimit: limits.dailyTokenBudget,
    questionsPerMinute: limits.questionsPerMinute,
    resetAt: new Date(day.resetAt).toISOString(),
  };
}

module.exports = { checkAskAllowance, recordAskWithoutModel, reserveAsk, sendAskQuotaError, getUserUsage };
