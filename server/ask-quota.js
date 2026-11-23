const RequestError = require('./request-error');
const { getUsageLimits } = require('./usage-limit-settings');

const minuteMs = 60_000;
const dayMs = 86_400_000;
const usageByUser = new Map();

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

function prepareAsk(userId, estimatedInputTokens) {
  if (!userId) throw new RequestError(401, 'Sign in to continue.');
  const { questionsPerMinute, questionsPerDay, maxOutputTokens, dailyTokenBudget } = getUsageLimits();
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

  return { account, day, now, maxOutputTokens, reservedTokens };
}

function recordQuestion({ account, day, now }) {
  account.recent.push(now);
  day.questions += 1;
}

function checkAskAllowance(userId) {
  prepareAsk(userId, 0);
}

function recordAskWithoutModel(userId) {
  recordQuestion(prepareAsk(userId, 0));
}

function reserveAsk(userId, messages) {
  // The free router can select different tokenizers, so use a conservative UTF-8 byte estimate.
  const estimatedInputTokens = Buffer.byteLength(JSON.stringify(messages), 'utf8') + 8 * messages.length;
  const reservation = prepareAsk(userId, estimatedInputTokens);
  const { day, maxOutputTokens, reservedTokens } = reservation;
  // Keep checks and updates synchronous so in-flight calls share the same quota.
  recordQuestion(reservation);
  day.tokens += reservedTokens;

  function reconcileUsage(usage) {
    const total = reportedCount(usage?.total_tokens);
    const prompt = reportedCount(usage?.prompt_tokens);
    const completion = reportedCount(usage?.completion_tokens);
    const used = total === null
      ? (prompt ?? estimatedInputTokens) + (completion ?? maxOutputTokens)
      : Math.max(total, (prompt ?? 0) + (completion ?? 0));
    day.tokens += used - reservedTokens;
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

module.exports = { checkAskAllowance, recordAskWithoutModel, reserveAsk, sendAskQuotaError };
