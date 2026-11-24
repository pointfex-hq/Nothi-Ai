const { readFileSync } = require('node:fs');
const suite = require('./legal-search.json');

const trackedScenarios = ['sale-and-contract', 'lease-notice-outside-corpus'];

function answerProse(content) {
  return content.replace(/\[(?:\\.|[^\]\\])*\]\(#source-\d+\)/gu, '').normalize('NFC');
}

function foreignWordsInBangla(prose) {
  const words = prose.match(/\p{L}[\p{L}\p{M}\u200c\u200d]*/gu) ?? [];
  return [...new Set(words.filter(word =>
    [...word].some(character => /\p{L}/u.test(character) && !/\p{Script=Bengali}/u.test(character))))];
}

// These are coverage signals for review. A positive match cannot establish that
// the model assigned the alternatives to the right rule or cited each one.
function mentionsMixedPrice(prose, language) {
  const sentences = prose.split(/[।.!?\n]/u);
  if (language === 'en') {
    return sentences.some(sentence =>
      /\b(?:part(?:ly|ially)?[\s-]+paid|paid in part|(?:part|portion)\s+(?:of\s+(?:it|the price)\s+)?(?:is\s+)?paid)\b/iu.test(sentence) &&
      /\b(?:part(?:ly|ially)?[\s-]+promised|promised in part|(?:rest|remainder|balance|part|portion)\s+(?:of\s+(?:it|the price)\s+)?(?:is\s+)?promised)\b/iu.test(sentence));
  }
  return sentences.some(sentence =>
    /(?:আংশিক|(?:এক|কিছু)\s*অংশ).{0,24}(?:পরিশোধ|প্রদান|দে[য়ও]|দিয়)/u.test(sentence) &&
    /(?:আংশিক|অবশিষ্ট|বাকি|অন্য\s*অংশ|আরেক\s*অংশ).{0,35}(?:প্রতিশ্রুত|অঙ্গীকার)/u.test(sentence));
}

function reviewLegalResult(row) {
  const scenario = suite.scenarios.find(item => item.questions[row.language] === row.question);
  if (!scenario || !trackedScenarios.includes(scenario.id)) return null;

  const { type, content = '', citations = [] } = row.answer;
  const prose = answerProse(content);
  const foreignWords = row.language === 'bn' && type !== 'source material' ? foreignWordsInBangla(prose) : [];
  const capVerified = row.provider?.length > 0 && row.provider.every(call => call.cap === suite.maxOutputTokens);
  const checks = { capVerified };
  const result = { id: row.id, verdict: 'fail', checks, foreignWords };
  if (type === 'error' || row.provider?.some(call => call.status === 429)) {
    result.verdict = 'blocked';
    return result;
  }

  checks.cleanBanglaProse = foreignWords.length === 0;
  if (scenario.expected === 'abstain') {
    checks.localizedAbstention = type === 'abstention' && content === scenario.expectedAbstention[row.language];
    checks.zeroCitations = citations.length === 0 && content === prose;
    if (Object.values(checks).every(Boolean)) result.verdict = 'pass';
    return result;
  }

  checks.complete = type === 'generated answer' && row.provider?.some(call => call.finish === 'stop');
  checks.mixedPriceMentioned = mentionsMixedPrice(prose, row.language);
  checks.expectedCitations = scenario.claims.every(claim => citations.some(citation =>
    citation.matchesSuppliedSource && citation.section === claim.section && citation.officialUrl === suite.sources[claim.section]));
  if (Object.values(checks).every(Boolean)) result.verdict = 'needs claim review';
  result.requiredClaimReview = scenario.claims.map(({ statement, requiredAnswerElements = [] }) => ({ statement, requiredAnswerElements }));
  return result;
}

if (require.main === module) {
  const report = JSON.parse(readFileSync(process.argv[2], 'utf8'));
  console.log(JSON.stringify({ providerMode: report.providerMode, cases: report.cases.map(reviewLegalResult).filter(Boolean) }, null, 2));
}

module.exports = { reviewLegalResult };
