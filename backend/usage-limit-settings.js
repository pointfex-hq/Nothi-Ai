const { usageLimitsFile, readLocalJson } = require('./local-data');
const RequestError = require('./request-error');
const store = require('./auth-store');

function readDefault(name, fallback) {
  const value = process.env[name]?.trim();
  if (!value) return fallback;
  const limit = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(limit) || limit < 1) {
    throw new Error(name + ' must be a positive integer.');
  }
  return limit;
}

const defaults = {
  questionsPerMinute: readDefault('NOTHI_ASK_PER_MINUTE', 5),
  questionsPerDay: readDefault('NOTHI_ASK_PER_DAY', 10),
  maxOutputTokens: readDefault('NOTHI_ASK_MAX_OUTPUT_TOKENS', 500),
  dailyTokenBudget: readDefault('NOTHI_ASK_DAILY_TOKEN_BUDGET', 50_000),
};
const fields = {
  questionsPerMinute: 'Questions per rolling minute',
  questionsPerDay: 'Questions per UTC day',
  maxOutputTokens: 'Maximum output tokens per answer',
  dailyTokenBudget: 'Daily tokens per user',
};

function validateLimits(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).some(name => !Object.hasOwn(fields, name))) {
    throw new RequestError(400, 'Submit only the four usage limits.');
  }
  return Object.fromEntries(Object.entries(fields).map(([name, label]) => {
    const limit = value[name];
    if (!Number.isSafeInteger(limit) || limit < 1) {
      throw new RequestError(400, label + ' must be a positive whole number.');
    }
    return [name, limit];
  }));
}

const fallbackLimits = store.readAdminSettings() ?? validateLimits(readLocalJson(usageLimitsFile, defaults));

function getUsageLimits() {
  return store.readAdminSettings() ?? fallbackLimits;
}

function saveUsageLimits(value, actorId) {
  const limits = validateLimits(value);
  return store.transaction(() => {
    store.writeAdminSettings(limits);
    store.recordAuditLog({
      action: 'QUOTA_UPDATED', adminId: actorId,
      details: JSON.stringify(limits),
    });
    return limits;
  });
}

module.exports = { getUsageLimits, saveUsageLimits };
