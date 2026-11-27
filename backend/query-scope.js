const propertyTerms = /\b(?:nothi[ -]?ai|lawlens|bangladesh(?:i)? (?:property|land) law|land (?:law|ownership|registration|transfer|records?|tax|mutation|boundary|acquisition|survey|lease)|property (?:law|ownership|registration|transfer|sale|deed|inheritance|tax|dispute|lease)|real estate law|transfer of property|registration act|stamp act|state acquisition and tenancy|specific relief act|non.agricultural tenancy act|khatian|porcha|mouza|kabala|namjari|kharij|(?:saf|sale|gift|partition|title|mortgage|registered) deed|deeds?|pre.emption|(?:title|document) vetting|vetting (?:memo|packet)|title examination|dag (?:number|no)|(?:section|sec\.?|s\.)\s*(?:17|23|49|54)\b)\b/iu;
const banglaTerms = /নথি\s*(?:এআই|এ আই)|জমি|ভূমি|সম্পত্তি|দলিল|খতিয়ান|খতিয়ান|পর্চা|মৌজা|কবলা|নামজারি|খারিজ|দাগ\s*(?:নম্বর|নং)|অগ্রক্রয়|অগ্রক্রয়|রেজিস্ট্রেশন\s*আইন|স্ট্যাম্প\s*(?:আইন|শুল্ক)|ধারা\s*(?:১৭|২৩|৪৯|৫৪)/u;
const documentQuestion = /\b(?:what (?:type|kind) of (?:document|file) is this|this (?:document|scan|file|photo|image|attachment)|(?:uploaded|attached) (?:document|scan|file|photo|image)|page\s+\d+|(?:who is|name of) the (?:seller|buyer|grantor|grantee)|extract (?:the )?(?:text|names|fields)|summari[sz]e (?:it|the document)|(?:deed|khatian|nid) (?:number|no))\b|এই\s*(?:নথি|ছবি|ফাইল|কাগজ)|(?:ক্রেতা|বিক্রেতা)\s*কে/u;
const followUp = /^(?:and\s+)?(?:what (?:about (?:the )?(?:deadline|fees?|exceptions?|penalt(?:y|ies))|(?:are|is) the (?:deadline|fees?|exceptions?|penalt(?:y|ies)))|how long (?:does it take|do i have)|can you (?:explain|clarify) (?:that|it)|which section (?:covers|says) (?:that|this))(?:[?.!]|\s*)$/iu;
const otherJurisdiction = /\b(?:under (?:the )?(?:indian|pakistani|british|english|american|canadian|australian|californian) law|(?:in|of) (?:india|pakistan|nepal|england|scotland|canada|australia|california|texas|new york|(?:the )?united (?:states|kingdom))|(?:u\.?s\.?|u\.?k\.?) (?:property|land) law)\b|(?:ভারত|পাকিস্তান|যুক্তরাষ্ট্র|যুক্তরাজ্য)(?:ের|ে)\s*(?:জমি|ভূমি|সম্পত্তি)/iu;
const bangladesh = /\bbangladesh(?:i)?\b|বাংলাদেশ/u;

function isInScope(question, { hasDocument = false, previousQuestion = '' } = {}) {
  if (typeof question !== 'string') return false;
  const text = question.normalize('NFKC').trim().toLowerCase();
  if (otherJurisdiction.test(text) && !bangladesh.test(text)) return false;
  if (propertyTerms.test(text) || banglaTerms.test(text)) return true;
  if (hasDocument && documentQuestion.test(text)) return true;
  return followUp.test(text) && Boolean(previousQuestion) && isInScope(previousQuestion, { hasDocument });
}

const emptyScopeAnswer = { content: '', citations: [], outOfScope: true };

module.exports = { isInScope, emptyScopeAnswer };
