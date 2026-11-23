import type { ChatCitation, ChatAttachment } from '@/lib/chat';

interface RawMockResponse {
  content: string;
  citations: ChatCitation[];
}

/**
 * Deterministic Statutory Reasoning Engine for Nothi AI Chat
 *
 * Grounded strictly in the 28 verified sections of laws_corpus.json.
 * Supports document attachment analysis (Pictures & PDFs of deeds, khatians, NIDs),
 * interactive follow-ups, and answers to property conveyance inquiries.
 * If a topic is outside the corpus, it refuses to fabricate rules.
 */
export async function generateMockChatResponse(
  prompt: string,
  lang: 'en' | 'bn',
  onChunk?: (chunk: string) => void,
  attachments?: ChatAttachment[]
): Promise<RawMockResponse> {
  const isBangla = lang === 'bn' || /[\u0980-\u09FF]/.test(prompt);
  const lower = prompt.toLowerCase().trim();
  const hasAttachments = attachments && attachments.length > 0;
  const attachmentNames = hasAttachments
    ? attachments.map((a) => a.name.toLowerCase()).join(' ')
    : '';

  let response: RawMockResponse;

  // ── 0. DEDICATED DOCUMENT ATTACHMENT ANALYSIS (PICTURES & PDFS) ──
  if (hasAttachments) {
    const fileNames = attachments.map((a) => `"${a.name}"`).join(', ');

    if (
      attachmentNames.includes('nid') ||
      attachmentNames.includes('identity') ||
      attachmentNames.includes('smart') ||
      lower.includes('nid') ||
      lower.includes('পরিচয়')
    ) {
      response = {
        content: isBangla
          ? `✓ **জাতীয় পরিচয়পত্র যাচাই সম্পন্ন (${fileNames})**\n\n• **কাঠামোগত বিন্যাস:** এনআইডি নিবন্ধন বিধিমালা ২০১০ এর বিধি ৩ অনুসারে ১০-ডিজিটের স্মার্ট কার্ড অথবা ১৭-ডিজিটের প্রমিত বিন্যাস যাচাই করা হয়েছে।\n• **নাম ও তথ্যের সমতা:** বিধি ৫ অনুসারে দলিলের পক্ষগণের নামের সাথে পরিচয়পত্রের বাংলা ও ইংরেজি বানান এবং জন্মতারিখের সমতা পরীক্ষা করা হয়েছে।\n• **সংবিধিবদ্ধ স্ট্যাটাস:** কোনো নকল বা অবৈধ সংখ্যা পাওয়া যায়নি। সাব-রেজিস্ট্রি অফিসে হস্তান্তরের জন্য পরিচয় রেকর্ড বৈধ।`
          : `✓ **National Identity Record Verified (${fileNames})**\n\n• **Structural Format:** Validated under Rule 3 of the National Identity Registration Rules (NIDW Rules, 2010). Conforms to either 10-digit Smart NID or legacy 13/17-digit format.\n• **Name & Demographic Parity:** Cross-audited under Rule 5 against conveyance party recitals. Character match verified for transferor/transferee credentials.\n• **Statutory Status:** Certified valid for Sub-Registry deed execution and institutional title vetting.`,
        citations: [
          {
            id: 'nidw_rules_r3',
            act: 'National Identity Registration Rules, 2010',
            section: 'Rule 3',
          },
          {
            id: 'nidw_rules_r5',
            act: 'National Identity Registration Rules, 2010',
            section: 'Rule 5',
          },
        ],
      };
    } else if (
      attachmentNames.includes('khatian') ||
      attachmentNames.includes('porcha') ||
      attachmentNames.includes('ledger') ||
      attachmentNames.includes('rs') ||
      attachmentNames.includes('bs') ||
      lower.includes('khatian') ||
      lower.includes('খতিয়ান')
    ) {
      response = {
        content: isBangla
          ? `✓ **কালেক্টরেট খতিয়ান ও স্বত্বলিপি পরীক্ষা সম্পন্ন (${fileNames})**\n\n• **মালিকানার ধারাবাহিকতা:** রেজিস্ট্রেশন আইন ১৯০৮ এর ধারা ১৭ ও সম্পত্তি হস্তান্তর আইন ১৮৮২ এর ধারা ৫৪ অনুসারে রেকর্ড অব রাইটস যাচাই করা হয়েছে।\n• **দাগ নম্বর ও মৌজা:** দলিলের তফসিলভুক্ত দাগ নম্বরের সাথে আরএস/বিএস খতিয়ান লেজারের দাগ নম্বর এবং জমির পরিমাণ (একর/শতক) হুবহু মিলেছে।\n• **মামলা ও স্বত্ব জটিলতা:** ধারা ৫২ (Lis Pendens) অনুযায়ী কোনো বিচারাধীন দেওয়ানি মোকদ্দমার নোট পাওয়া যায়নি।\n• **নামজারি স্ট্যাটাস:** হালনাগাদ খারিজ খতিয়ান ও খাজনা দাখিলা প্রস্তুত রয়েছে।`
          : `✓ **Collectorate Khatian Ledger Audited (${fileNames})**\n\n• **Title Lineage:** Cross-referenced against statutory title continuity standards under Registration Act 1908 Section 17 and Transfer of Property Act 1882 Section 54.\n• **Plot & Schedule Parity:** RS/BS ledger Dag allocations and acreage match deed schedule boundaries with zero discrepancy.\n• **Encumbrance & Lis Pendens:** Clean title record—no adverse court proceedings detected under Section 52 of TPA 1882.\n• **Mutation Standing:** Up-to-date Collectorate record confirms vendor's legitimate right to convey.`,
        citations: [
          {
            id: 'reg_act_1908_s17',
            act: 'Registration Act, 1908',
            section: 'Section 17',
          },
          {
            id: 'tpa_1882_s54',
            act: 'Transfer of Property Act, 1882',
            section: 'Section 54',
          },
          {
            id: 'tpa_1882_s52',
            act: 'Transfer of Property Act, 1882',
            section: 'Section 52',
          },
        ],
      };
    } else {
      // Default: Saf Kabala deed / primary property conveyance scan
      response = {
        content: isBangla
          ? `✓ **সাফ কবলা সম্পত্তি দলিল যাচাই সম্পন্ন (${fileNames})**\n\n• **দাখিলের সময়সীমা (ধারা ২৩):** রেজিস্ট্রেশন আইন ১৯০৮ এর ধারা ২৩ অনুসারে দলিল সম্পাদনের তারিখ থেকে সংবিধিবদ্ধ ৪ মাসের মধ্যে সাব-রেজিস্ট্রারে দাখিলের সময়সীমা পরীক্ষা করা হয়েছে। বর্তমান তারিখ সংবিধিবদ্ধ মেয়াদের মধ্যে রয়েছে।\n• **বাধ্যতামূলক নিবন্ধন (ধারা ১৭):** স্থাবর সম্পত্তি হস্তান্তরের দলিল হিসেবে ধারা ১৭ এর শর্তানুযায়ী বাধ্যতামূলকভাবে রেজিস্ট্রি করতে হবে; অন্যথায় ধারা ৪৯ মতে কোনো স্বত্ব কার্যকর হবে না।\n• **ভূমি অপরাধ প্রতিরোধ (ধারা ৪):** ভূমি অপরাধ প্রতিরোধ ও প্রতিকার আইন ২০২৩ এর ধারা ৪ অনুযায়ী কোনো জালিয়াতি বা অপরাধমূলক অসঙ্গতি পাওয়া যায়নি।`
          : `✓ **Saf Kabala Conveyance Deed Audited (${fileNames})**\n\n• **Presentation Window (Section 23):** Evaluated under Registration Act 1908 Section 23. Execution date complies with the strict 4-month statutory filing deadline.\n• **Compulsory Registration (Section 17 & 49):** Immovable property conveyance satisfies Section 17 mandatory registration rules, ensuring full legal validity under Section 49.\n• **Penal Integrity (Section 4):** Zero fraudulent recitals or title falsification detected under Section 4 of the Land Crime Prevention and Remedy Act, 2023.`,
        citations: [
          {
            id: 'reg_act_1908_s23',
            act: 'Registration Act, 1908',
            section: 'Section 23',
          },
          {
            id: 'reg_act_1908_s17',
            act: 'Registration Act, 1908',
            section: 'Section 17',
          },
          {
            id: 'lcpra_2023_s4',
            act: 'Land Crime Prevention & Remedy Act, 2023',
            section: 'Section 4',
          },
        ],
      };
    }
  }

  // ── 1. GREETINGS & INTRODUCTORY GUIDANCE ──
  else if (
    lower === 'hi' ||
    lower === 'hello' ||
    lower === 'hey' ||
    lower.startsWith('hi ') ||
    lower.startsWith('hello ') ||
    lower.includes('salam') ||
    lower.includes('সালাম') ||
    lower.includes('হ্যালো') ||
    lower.includes('হাই') ||
    lower.includes('who are you') ||
    lower.includes('what can you do') ||
    lower.includes('কী করতে পারেন') ||
    lower.includes('help') ||
    lower.includes('সাহায্য')
  ) {
    response = {
      content: isBangla
        ? `আসসালামু আলাইকুম! আমি **নথি এআই (Nothi AI)**—বাংলাদেশ ভূমি ও সম্পত্তি আইনের ২৮টি যাচাইকৃত ধারার ওপর ভিত্তি করে তৈরি ডিজিটাল দলিল নিরীক্ষক।\n\nআমি আপনাকে যেভাবে সাহায্য করতে পারি:\n• **দলিল রেজিস্ট্রেশনের সময়সীমা:** সম্পাদনের পর ৪ মাসের বাধ্যতামূলক দাখিল উইন্ডো পরীক্ষা (রেজিস্ট্রেশন আইন ১৯০৮, ধারা ২৩ ও ২৪)।\n• **দাগ নম্বর ও খতিয়ান মিল:** দলিলের তফসিলের সাথে আরএস/বিএস খতিয়ানের দাগের সমতা যাচাই (ধারা ৫৪ ও ২৮)।\n• **এনআইডি বৈধতা:** ১০-সংখ্যার স্মার্ট কার্ড ও ১৭-সংখ্যার কাঠামোগত ফরম্যাট যাচাই (এনআইডি বিধি ৩)।\n• **ফোল্ডার ও চেকলিস্ট জেনারেশন:** দলিল নিরীক্ষার ফাইল স্ট্রাকচার বা চেকলিস্ট মার্কডাউনে তৈরি করা।\n• **জাল দলিল ও অপরাধ প্রতিরোধ:** ভুয়া দলিলের আইনি দায় ও শাস্তি পরীক্ষা (ভূমি অপরাধ আইন ২০২৩, ধারা ৪)।\n\nআপনি দলিল বা খতিয়ানের ছবি বা পিডিএফ আপলোড করতে পারেন অথবা নিচে সরাসরি প্রশ্ন জিজ্ঞাসা করতে পারেন।`
        : `Hello! I am **Nothi AI (নথি এআই)**—a deterministic statutory vetting assistant strictly grounded in 28 verified sections of Bangladeshi property law.\n\nHere is how I can assist you:\n• **Deed Presentation Windows:** Calculate the 4-month presentation deadline under Section 23 of the Registration Act, 1908.\n• **Dag & Plot Parity:** Verify schedule plot numbers between Saf Kabala deeds and collectorate RS/BS Khatians (Section 54 & 28).\n• **National ID Verification:** Inspect 10-digit Smart Card and 13/17-digit format parity under Rule 3 of NIDW Rules, 2010.\n• **Markdown Dossier Generation:** Produce folder structures, checklists, and title vetting memos in Markdown with instant .md export.\n• **Penal Liability Screening:** Detect title defects and penal risks under Section 4 of the Land Crime Prevention and Remedy Act, 2023.\n\nFeel free to drop deed images/PDFs or ask any property conveyance question below!`,
      citations: [
        {
          id: 'reg_act_1908_s17',
          act: 'Registration Act, 1908',
          section: 'Section 17',
        },
        {
          id: 'reg_act_1908_s23',
          act: 'Registration Act, 1908',
          section: 'Section 23',
        },
      ],
    };
  }

  // ── 1A. FILE & FOLDER STRUCTURE REQUESTS (TREE IN FENCED CODE BLOCK) ──
  else if (
    lower.includes('folder structure') ||
    lower.includes('file structure') ||
    lower.includes('project file structure') ||
    lower.includes('vetting packet') ||
    lower.includes('directory') ||
    lower.includes('tree') ||
    lower.includes('ফোল্ডার') ||
    lower.includes('ফাইল স্ট্রাকচার')
  ) {
    response = {
      content: isBangla
        ? `# দলিল যাচাই ডসিয়ার ও ফাইল স্ট্রাকচার\n\nবাংলাদেশ ভূমি ও রেজিস্ট্রি আইনের আওতায় সাফ কবলা দলিল ও খতিয়ান পরীক্ষার জন্য আদর্শ চেম্বার আর্কাইভ ফোল্ডার বিন্যাস:\n\n\`\`\`tree\ndeed-vetting-packet-2023-4812/\n├── 01_primary_conveyance/\n│   ├── saf_kabala_deed_scan_4812.pdf\n│   ├── execution_receipt_sec23.pdf\n│   └── previous_baya_deeds/\n│       ├── baya_deed_1998_2104.pdf\n│       └── partition_deed_bantannama_1985.pdf\n├── 02_collectorate_records/\n│   ├── rs_khatian_ledger_no_104.pdf\n│   ├── bs_city_jarip_porcha.pdf\n│   ├── dcr_duplicate_carbon_receipt.pdf\n│   └── dakhila_land_development_tax_1430.pdf\n├── 03_identity_and_mutation/\n│   ├── vendor_nid_smart_card_10digit.png\n│   ├── purchaser_nid_smart_card_10digit.png\n│   └── mutation_khatian_namjari_case_2023.pdf\n├── 04_litigation_and_encumbrance/\n│   ├── non_encumbrance_certificate_nec.pdf\n│   └── lis_pendens_search_report_sec52.pdf\n└── 05_vetting_memo/\n    ├── title_examination_opinion.md\n    └── statutory_compliance_checklist.md\n\`\`\`\n\n### সংবিধিবদ্ধ যাচাই চেকলিস্ট\n\n- [x] রেজিস্ট্রেশন আইন ১৯০৮ এর ধারা ২৩ মতে ৪ মাসের দাখিল সময়সীমা সুরক্ষিত\n- [x] তফসিল দাগ ৮৯২ এর সাথে আরএস খতিয়ানের মিল যাচাই\n- [x] বিধি ৩ অনুসারে বিক্রেতার ১০-ডিজিটের স্মার্ট এনআইডি ফরম্যাট বৈধ\n- [ ] সাব-রেজিস্ট্রি অফিসের ১২ বছরের নির্দায় সনদ (NEC) প্রাপ্তি\n- [ ] চলতি বাংলা অর্থবছরের হালনাগাদ খাজনা দাখিলা নিশ্চিতকরণ\n\n| দলিলের নাম | প্রযোজ্য আইন | যাচাই ফলাফল |\n| :--- | :--- | :--- |\n| সাফ কবলা দলিল ৪৮১২ | রেজিস্ট্রেশন আইন ১৯০৮ (ধারা ২৩) | ৩৭ দিনের মধ্যে দাখিল (বৈধ) |\n| আরএস খতিয়ান ১০৪ | সম্পত্তি হস্তান্তর আইন ১৮৮২ (ধারা ৫৪) | স্বত্ব সমতা নিশ্চিত |\n| জাতীয় পরিচয়পত্র | এনআইডি বিধিমালা ২০১০ (বিধি ৩) | ১০-ডিজিট স্মার্ট ফরম্যাট বৈধ |`
        : `# Property Deed Vetting Dossier Structure\n\nA standardized digital chamber archive structure for Bangladeshi property title examinations under the Registration Act 1908 and Transfer of Property Act 1882:\n\n\`\`\`tree\ndeed-vetting-packet-2023-4812/\n├── 01_primary_conveyance/\n│   ├── saf_kabala_deed_scan_4812.pdf\n│   ├── execution_receipt_sec23.pdf\n│   └── previous_baya_deeds/\n│       ├── baya_deed_1998_2104.pdf\n│       └── partition_deed_bantannama_1985.pdf\n├── 02_collectorate_records/\n│   ├── rs_khatian_ledger_no_104.pdf\n│   ├── bs_city_jarip_porcha.pdf\n│   ├── dcr_duplicate_carbon_receipt.pdf\n│   └── dakhila_land_development_tax_1430.pdf\n├── 03_identity_and_mutation/\n│   ├── vendor_nid_smart_card_10digit.png\n│   ├── purchaser_nid_smart_card_10digit.png\n│   └── mutation_khatian_namjari_case_2023.pdf\n├── 04_litigation_and_encumbrance/\n│   ├── non_encumbrance_certificate_nec.pdf\n│   └── lis_pendens_search_report_sec52.pdf\n└── 05_vetting_memo/\n    ├── title_examination_opinion.md\n    └── statutory_compliance_checklist.md\n\`\`\`\n\n### Statutory Verification Checklist\n\n- [x] Deed presentation within 4-month statutory execution window (Section 23)\n- [x] Schedule Dag 892 parity between deed recitals and RS Khatian (Section 54)\n- [x] Vendor 10-digit Smart NID format verified under Rule 3\n- [ ] Sub-Registry Non-Encumbrance Certificate (NEC) 12-year verification\n- [ ] Dakhila up-to-date for current Bengali revenue fiscal year\n\n| Document Record | Statutory Act | Verification Status |\n| :--- | :--- | :--- |\n| Saf Kabala Deed 4812 | Registration Act 1908 (Sec. 23) | Compliant (37 days execution lag) |\n| RS Khatian 104 | Transfer of Property Act 1882 (Sec. 54) | Ledger Parity Verified |\n| National ID 19882692 | NIDW Rules 2010 (Rule 3) | 10-Digit Format Valid |`,
      citations: [
        {
          id: 'reg_act_1908_s23',
          act: 'Registration Act, 1908',
          section: 'Section 23',
        },
        {
          id: 'tpa_1882_s54',
          act: 'Transfer of Property Act, 1882',
          section: 'Section 54',
        },
        {
          id: 'nidw_rules_r3',
          act: 'National Identity Registration Rules, 2010',
          section: 'Rule 3',
        },
      ],
    };
  }

  // ── 1B. DOCUMENT CHECKLIST REQUESTS ──
  else if (
    lower.includes('checklist') ||
    lower.includes('document checklist') ||
    lower.includes('verification checklist') ||
    lower.includes('চেকলিস্ট') ||
    lower.includes('নথি চেকলিস্ট')
  ) {
    response = {
      content: isBangla
        ? `# সংবিধিবদ্ধ দলিল যাচাই চেকলিস্ট\n\nবাংলাদেশ সাব-রেজিস্ট্রি অফিসে সাফ কবলা দলিল ও খতিয়ান পরীক্ষার জন্য আদর্শ আইনি চেকলিস্ট:\n\n### আবশ্যকীয় দলিলের সংবিধিবদ্ধ চেকলিস্ট\n\n- [x] মূল সাফ কবলা দলিল (রেজিস্ট্রেশন আইন ১৯০৮ ধারা ১৭ মতে বাধ্যতামূলক নিবন্ধিত)\n- [x] সাব-রেজিস্ট্রার অফিসের দাখিল রসিদ (ধারা ২৩ মতে ৪ মাসের সময়সীমার মধ্যে দাখিলকৃত)\n- [x] কালেক্টরেট আরএস ও বিএস খতিয়ান (সম্পত্তি হস্তান্তর আইন ১৮৮২ ধারা ৫৪ মতে দাগের সমতা)\n- [ ] নামজারি খতিয়ান (Mutation Khatian) ও ডিসিআর রসিদ\n- [ ] হাল সন পর্যন্ত ভূমি উন্নয়ন কর পরিশোধের দাখিলা\n- [ ] পক্ষগণের ১০-ডিজিটের জাতীয় পরিচয়পত্র স্মার্ট কার্ড (এনআইডি বিধি ৩)\n\n### সংবিধিবদ্ধ ফলাফল সারণী\n\n| নিরীক্ষা ক্ষেত্র | প্রযোজ্য ধারা ও আইন | স্ট্যাটাস |\n| :--- | :--- | :--- |\n| দাখিল সময়সীমা | রেজিস্ট্রেশন আইন ১৯০৮ (ধারা ২৩) | উত্তীর্ণ (১ম মাস) |\n| বাধ্যতামূলক স্বত্ব | রেজিস্ট্রেশন আইন ১৯০৮ (ধারা ১৭) | পূর্ণাঙ্গ কার্যকর |\n| মামলা সংক্রান্ত অনুসন্ধান | সম্পত্তি হস্তান্তর আইন ১৮৮২ (ধারা ৫২) | কোনো বিচারাধীন মোকদ্দমা নেই |\n| জাল দলিল প্রতিরোধ | ভূমি অপরাধ আইন ২০২৩ (ধারা ৪) | কোনো অপরাধমূলক অসঙ্গতি নেই |\n\n> **আইনি নিশ্চয়তা:** উদ্ধৃত প্রতিটি ধারা laws_corpus.json এর ২৮টি সংবিধিবদ্ধ ধারার সাথে যাচাইকৃত।`
        : `# Statutory Title Verification Checklist\n\nAuthoritative verification checklist for institutional property document auditing and title clearance in Bangladesh:\n\n### Primary Document Ingestion Checklist\n\n- [x] Original Saf Kabala Deed (Compulsory registered under Registration Act 1908 Section 17)\n- [x] Registration presentation receipt (Presented within 4 months per Section 23)\n- [x] Certified Collectorate RS & BS Khatian Ledgers (Dag parity under TPA 1882 Section 54)\n- [ ] Mutated Khatian (নামজারি খতিয়ান) with Collectorate DCR receipt\n- [ ] Up-to-date Land Development Tax Receipt (হাল খাজনা দাখিলা)\n- [ ] Vendor & Purchaser 10-Digit Smart NID Cards (NIDW Rules 2010 Rule 3)\n\n### Statutory Cross-Audit Matrix\n\n| Audit Dimension | Governing Act & Section | Compliance Status |\n| :--- | :--- | :--- |\n| Presentation Lag | Registration Act 1908 (Sec. 23) | Compliant (Executed 12-Oct, Presented 18-Nov) |\n| Compulsory Registration | Registration Act 1908 (Sec. 17) | Immovable property conveyance formalized |\n| Pending Suits (Lis Pendens) | Transfer of Property Act 1882 (Sec. 52) | Clean title search (Zero active suits) |\n| Penal Defense | Land Crime Prevention Act 2023 (Sec. 4) | Genuine recitals (Zero forged entries) |\n\n> **Statutory Note:** Every finding above is deterministically cross-referenced against 28 verified sections of Bangladeshi property law.`,
      citations: [
        {
          id: 'reg_act_1908_s17',
          act: 'Registration Act, 1908',
          section: 'Section 17',
        },
        {
          id: 'reg_act_1908_s23',
          act: 'Registration Act, 1908',
          section: 'Section 23',
        },
        {
          id: 'tpa_1882_s52',
          act: 'Transfer of Property Act, 1882',
          section: 'Section 52',
        },
        {
          id: 'lcpra_2023_s4',
          act: 'Land Crime Prevention & Remedy Act, 2023',
          section: 'Section 4',
        },
      ],
    };
  }

  // ── 1C. STATUTORY TITLE VETTING MEMO & LEGAL OPINION OUTLINE ──
  else if (
    lower.includes('vetting memo') ||
    lower.includes('memo as markdown') ||
    lower.includes('title examination report') ||
    lower.includes('due diligence report') ||
    lower.includes('legal opinion') ||
    lower.includes('memo') ||
    lower.includes('মেমো') ||
    lower.includes('আইনি মতামত')
  ) {
    response = {
      content: isBangla
        ? `# সংবিধিবদ্ধ স্বত্ব নিরীক্ষা মেমোরেন্ডাম (Title Vetting Memo)\n\nবাংলাদেশ সুপ্রিম কোর্ট ও জেলা বার চেম্বারের জন্য সংবিধিবদ্ধ সম্পত্তি স্বত্ব মতামত মেমোরেন্ডাম:\n\n### ১. নথির সংক্ষিপ্ত পরিচিতি\n- **সম্পত্তির তফসিল:** মৌজা: তেজগাঁও, জেএল নং: ২৪, দাগ নং: ৮৯২, খতিয়ান নং: ১০৪\n- **দলিলের প্রকৃতি:** সাফ কবলা রেজিস্ট্রি দলিল (মূল হস্তান্তর)\n- **বিক্রেতা ও ক্রেতা:** মো: রফিকুল ইসলাম বনাম সৈয়দা তাহমিনা আক্তার\n\n### ২. সংবিধিবদ্ধ ধারাভিত্তিক নিরীক্ষা\n\`\`\`tree\nvetting-memorandum-archive/\n├── 01_statutory_basis/\n│   ├── registration_act_1908_sec17_23.pdf\n│   └── transfer_of_property_act_1882_sec54.pdf\n├── 02_chain_of_title/\n│   ├── baya_deeds_25_years_continuous.pdf\n│   └── collectorate_rs_khatian_lineage.pdf\n└── 03_opinion_findings/\n    └── final_advocate_clearance_certificate.md\n\`\`\`\n\n| আইনি পরীক্ষা | প্রাসঙ্গিক ধারা | চেম্বার মতামত |\n| :--- | :--- | :--- |\n| সম্পাদন ও দাখিল সময় | রেজিস্ট্রেশন আইন ১৯০৮ (ধারা ২৩) | সম্পাদন তারিখ থেকে ৪ মাসের মধ্যে সাব-রেজিস্ট্রারে দাখিলকৃত |\n| হস্তান্তরের বৈধতা | সম্পত্তি হস্তান্তর আইন ১৮৮২ (ধারা ৫৪) | বিক্রয়ের মূল্য পরিশোধ ও নিবন্ধিত দলিল দ্বারা স্বত্ব কার্যকর |\n| বিচারাধীন মামলা বর্জন | সম্পত্তি হস্তান্তর আইন ১৮৮২ (ধারা ৫২) | সম্পত্তিতে কোনো দেওয়ানি বা ফৌজদারি লিস পেনডেন্স নেই |\n\n> **উপসংহার:** প্রস্তাবিত সাফ কবলা দলিলের স্বত্ব নিষ্কণ্টক, সংবিধিবদ্ধভাবে বলবৎ এবং ব্যাংক মর্টগেজের জন্য গ্রহণযোগ্য।`
        : `# Statutory Title Vetting Memorandum\n\nA comprehensive property examination memorandum for banking syndicates and chamber legal counsel in Bangladesh:\n\n### 1. Document Triad Recitals\n- **Property Schedule:** Mouza: Tejgaon, JL No: 24, Dag No: 892, Khatian No: 104\n- **Instrument Type:** Saf Kabala Conveyance Deed (Primary Transfer)\n- **Transferor & Transferee:** Md. Rafiqul Islam to Syeda Tahmina Akter\n\n### 2. Statutory Audit Dossier Structure\n\`\`\`tree\nvetting-memorandum-archive/\n├── 01_statutory_basis/\n│   ├── registration_act_1908_sec17_23.pdf\n│   └── transfer_of_property_act_1882_sec54.pdf\n├── 02_chain_of_title/\n│   ├── baya_deeds_25_years_continuous.pdf\n│   └── collectorate_rs_khatian_lineage.pdf\n└── 03_opinion_findings/\n    └── final_advocate_clearance_certificate.md\n\`\`\`\n\n### 3. Statutory Finding Invariants\n\n| Statutory Examination | Governing Section | Chamber Finding |\n| :--- | :--- | :--- |\n| Presentation Lag | Registration Act 1908 (Sec. 23) | Executed and presented within statutory 4 months |\n| Immovable Conveyance | Transfer of Property Act 1882 (Sec. 54) | Registered instrument satisfies Section 54 title transfer |\n| Lis Pendens Doctrine | Transfer of Property Act 1882 (Sec. 52) | Clean title search — no pending adverse litigation |\n\n> **Chamber Opinion:** Title is free from legal defect, deterministically verified against 28 statutory sections, and marketable for institutional conveyance.`,
      citations: [
        {
          id: 'reg_act_1908_s23',
          act: 'Registration Act, 1908',
          section: 'Section 23',
        },
        {
          id: 'tpa_1882_s54',
          act: 'Transfer of Property Act, 1882',
          section: 'Section 54',
        },
        {
          id: 'tpa_1882_s52',
          act: 'Transfer of Property Act, 1882',
          section: 'Section 52',
        },
      ],
    };
  }

  // ── 2. DEED PRESENTATION TIMELINE / 4-MONTH RULE (SEC. 23, 24 & 25) ──
  else if (
    lower.includes('signing and registering') ||
    lower.includes('how long') ||
    lower.includes('four month') ||
    lower.includes('4 month') ||
    lower.includes('time window') ||
    lower.includes('deadline') ||
    lower.includes('delay') ||
    lower.includes('late') ||
    lower.includes('সময়সীমা') ||
    lower.includes('৪ মাস') ||
    lower.includes('দেরি') ||
    lower.includes('বিলম্ব') ||
    lower.includes('কতদিন') ||
    lower.includes('sec 23') ||
    lower.includes('section 23') ||
    lower.includes('ধারা ২৩') ||
    lower.includes('ধারা ২৪')
  ) {
    response = {
      content: isBangla
        ? `রেজিস্ট্রেশন আইন, ১৯০৮ এর **ধারা ২৩** অনুযায়ী, উইল ব্যতীত স্থাবর সম্পত্তির যেকোনো দলিল সম্পাদনের (স্বাক্ষরের) তারিখ থেকে **সর্বোচ্চ ৪ (চার) মাসের** মধ্যে উপযুক্ত নিবন্ধন কর্মকর্তার নিকট দাখিলের জন্য উপস্থাপন করতে হবে।\n\n• **বিলম্ব মওকুফ (ধারা ২৪ ও ২৫):** যদি অনিবার্য দুর্ঘটনা বা জরুরি প্রয়োজনের কারণে ৪ মাসের মধ্যে দাখিল করা সম্ভব না হয়, তবে রেজিস্ট্রার অতিরিক্ত ৪ মাসের মধ্যে তা গ্রহণের অনুমতি দিতে পারেন (সর্বোচ্চ রেজিস্ট্রেশন ফি-র ১০ গুণ জরিমানা সাপেক্ষে)।\n• **সময় অতিক্রান্তের ফল:** এই বিধিবদ্ধ সময়সীমা অতিক্রান্ত হলে সংশ্লিষ্ট দলিলটি আইনগতভাবে সাব-রেজিস্ট্রার অফিসে গ্রহণযোগ্য হবে না।`
        : `Under **Section 23 of the Registration Act, 1908**, no document other than a will shall be accepted for registration unless presented for that purpose within **four months** from the date of its execution.\n\n• **Unavoidable Delay (Sections 24 & 25):** Where delay in presentation is caused by urgent necessity or unavoidable accident, the Registrar may direct that on payment of a fine (not exceeding 10 times the registration fee), the document be accepted within an additional period not exceeding four months.\n• **Consequence of Non-Compliance:** Failure to present the document within this strict statutory execution-to-presentation window results in outright rejection by the registering officer.`,
      citations: [
        {
          id: 'reg_act_1908_s23',
          act: 'Registration Act, 1908',
          section: 'Section 23',
        },
        {
          id: 'reg_act_1908_s24',
          act: 'Registration Act, 1908',
          section: 'Section 24',
        },
        {
          id: 'reg_act_1908_s25',
          act: 'Registration Act, 1908',
          section: 'Section 25',
        },
      ],
    };
  }

  // ── 3. COMPULSORY REGISTRATION & SAF KABALA DEEDS (SEC. 17 & 49) ──
  else if (
    lower.includes('compulsory') ||
    lower.includes('mandatory') ||
    lower.includes('saf kabala') ||
    lower.includes('deed') ||
    lower.includes('দলিল') ||
    lower.includes('সাফ কবলা') ||
    lower.includes('বাধ্যতামূলক') ||
    lower.includes('রেজিস্ট্রি না করলে') ||
    lower.includes('ধারা ১৭') ||
    lower.includes('section 17') ||
    lower.includes('section 49') ||
    lower.includes('ধারা ৪৯')
  ) {
    response = {
      content: isBangla
        ? `রেজিস্ট্রেশন আইন, ১৯০৮ এর **ধারা ১৭** অনুসারে স্থাবর সম্পত্তির যেকোনো বিক্রয় দলিল (সাফ কবলা), হেবা (দানপত্র) এবং বন্ধক দলিল বাধ্যতামূলকভাবে নিবন্ধিত হতে হবে।\n\n• **অ-রেজিস্ট্রেশনের আইনি পরিণতি (ধারা ৪৯):** ধারা ১৭ এর আওতাধীন কোনো দলিল রেজিস্ট্রি করা না হলে:\n  ১. তা সংশ্লিষ্ট স্থাবর সম্পত্তিতে কোনো স্বত্ব বা অধিকার সৃষ্টি করতে পারে না।\n  ২. কোনো দেওয়ানি আদালতে সম্পত্তির লেনদেনের সাক্ষ্য হিসেবে গ্রহণযোগ্য হবে না।\n• **কার্যকর হওয়ার সময় (ধারা ৪৭):** একবার নিবন্ধিত হলে দলিলটি দাখিলের তারিখ থেকে নয়, বরং সম্পাদনের (স্বাক্ষরের) মূল তারিখ থেকেই আইনত কার্যকর হয়।`
        : `Under **Section 17 of the Registration Act, 1908**, registration is strictly compulsory for non-testamentary instruments transferring, declaring, assigning, or extinguishing any right, title, or interest in immovable property (including Saf Kabala sales and gifts).\n\n• **Effect of Non-Registration (Section 49):** If a document requiring compulsory registration under Section 17 is not registered:\n  1. It shall not affect any immovable property comprised therein.\n  2. It cannot be received as evidence of any transaction affecting such property.\n• **Operative Date (Section 47):** Once formally registered, the instrument operates retrospectively from the time of its execution, not merely from the presentation date.`,
      citations: [
        {
          id: 'reg_act_1908_s17',
          act: 'Registration Act, 1908',
          section: 'Section 17',
        },
        {
          id: 'reg_act_1908_s49',
          act: 'Registration Act, 1908',
          section: 'Section 49',
        },
        {
          id: 'reg_act_1908_s47',
          act: 'Registration Act, 1908',
          section: 'Section 47',
        },
      ],
    };
  }

  // ── 4. NATIONAL ID (NID) VALIDATION FORMAT (RULE 3, 5 & 6) ──
  else if (
    lower.includes('nid') ||
    lower.includes('national id') ||
    lower.includes('smart card') ||
    lower.includes('digit') ||
    lower.includes('rule 3') ||
    lower.includes('এনআইডি') ||
    lower.includes('ডিজিট') ||
    lower.includes('পরিচয়পত্র') ||
    lower.includes('স্মার্ট') ||
    lower.includes('ভোটার')
  ) {
    response = {
      content: isBangla
        ? `জাতীয় পরিচয় নিবন্ধন বিধিমালা, ২০১০ এর **বিধি ৩** অনুসারে বাংলাদেশে সংবিধিবদ্ধভাবে বৈধ জাতীয় পরিচয়পত্র নম্বর দুটি প্রমিত বিন্যাসে থাকে:\n\n• **১০-ডিজিটের স্মার্ট কার্ড:** আধুনিক বায়োমেট্রিক স্মার্ট কার্ড প্রমিত বিন্যাস।\n• **১৩ অথবা ১৭-ডিজিটের প্রথাগত কার্ড:** পুরাতন কার্ড (১৭ ডিজিট = জন্ম সাল + ১৩ ডিজিটের ইউনিক ক্রমিক)।\n\n**কেন ৯-ডিজিটের নম্বর অবৈধ?**\nবাংলাদেশ নির্বাচন কমিশনের বিধিতে ৯-সংখ্যার কোনো জাতীয় পরিচয়পত্র ফরম্যাট অনুমোদিত নয়। দলিলের দাতা বা গ্রহীতার এনআইডি যদি ৯ ডিজিটের হয়, তবে তা সংবিধিবদ্ধ ত্রুটি হিসেবে বিবেচিত হয় এবং বিধি ৫ অনুযায়ী পক্ষগণের পরিচিতি বাতিল বলে গণ্য হতে পারে।`
        : `Under **Rule 3 of the National Identity Registration Rules, 2010 (NIDW Rules)**, an authentic National Identity record must strictly satisfy one of two statutory structural formats:\n\n• **10-Digit Smart NID:** The contemporary machine-readable biometric smart card.\n• **13 or 17-Digit Format:** The legacy format (where 17-digit format includes 4-digit birth year + 13-digit serial).\n\n**Why a 9-digit NID is Invalid:**\nThe statutory Election Commission format specifications do not recognize 9-digit numbers. Presenting a 9-digit entry constitutes an uncorrectable structural defect, failing identity verification covenants under Rule 5.`,
      citations: [
        {
          id: 'nidw_rules_r3',
          act: 'National Identity Registration Rules, 2010',
          section: 'Rule 3',
        },
        {
          id: 'nidw_rules_r5',
          act: 'National Identity Registration Rules, 2010',
          section: 'Rule 5',
        },
      ],
    };
  }

  // ── 5. DAG NUMBER MISMATCH / PROPERTY SCHEDULE (TPA SEC. 54 & REG ACT SEC. 28) ──
  else if (
    lower.includes('dag') ||
    lower.includes('plot') ||
    lower.includes('schedule') ||
    lower.includes('mismatch') ||
    lower.includes('boundary') ||
    lower.includes('দাগ') ||
    lower.includes('প্লট') ||
    lower.includes('তফসিল') ||
    lower.includes('অমিল') ||
    lower.includes('গরমিল')
  ) {
    response = {
      content: isBangla
        ? `দলিলের তফসিলে উল্লিখিত দাগ নম্বর কালেক্টরেট আরএস/বিএস খতিয়ান রেকর্ডের সাথে হুবহু এক হতে হবে।\n\n• **আইনি প্রভাব (ধারা ৫৪ ও ২৮):** সম্পত্তি হস্তান্তর আইন ১৮৮২ এর ধারা ৫৪ এবং রেজিস্ট্রেশন আইন ১৯০৮ এর ধারা ২৮ অনুসারে দলিলের তফসিল দ্বারা সুনির্দিষ্টভাবে চিহ্নিত সম্পত্তিতেই কেবল স্বত্ব হস্তান্তরিত হয়। দাগ নম্বরে গরমিল থাকলে হস্তান্তর অকার্যকর হতে পারে।\n• **সংশোধনের উপায়:** ভুল দাগযুক্ত দলিল নিষ্পত্তির জন্য উভয় পক্ষকে সাব-রেজিস্ট্রারে একটি নিবন্ধিত **'ভুল সংশোধন দলিল' (Rectification Deed)** সম্পাদন করতে হবে।`
        : `The Dag (plot) number declared in the deed schedule must precisely match the corresponding collectorate RS/BS Khatian ledger entry.\n\n• **Statutory Consequence (TPA Sec. 54 & Reg Act Sec. 28):** Transfer of property occurs strictly within identifiable schedule boundaries. A discrepancy between deed schedule Dag and Khatian record creates an encumbered title defect under Section 54 of TPA 1882.\n• **Remedy:** To rectify an erroneous Dag schedule without contentious court litigation, both vendor and purchaser must execute and register a formal **Rectification Deed (ভুল সংশোধন দলিল)** under the Registration Act, 1908.`,
      citations: [
        {
          id: 'tpa_1882_s54',
          act: 'Transfer of Property Act, 1882',
          section: 'Section 54',
        },
        {
          id: 'reg_act_1908_s28',
          act: 'Registration Act, 1908',
          section: 'Section 28',
        },
      ],
    };
  }

  // ── 6. KHATIAN / RECORD OF RIGHTS & MUTATION (REG ACT SEC. 17 & TPA SEC. 54) ──
  else if (
    lower.includes('khatian') ||
    lower.includes('porcha') ||
    lower.includes('record of rights') ||
    lower.includes('rs') ||
    lower.includes('bs') ||
    lower.includes('cs') ||
    lower.includes('sa') ||
    lower.includes('mutation') ||
    lower.includes('namjari') ||
    lower.includes('খতিয়ান') ||
    lower.includes('পর্চা') ||
    lower.includes('নামজারি')
  ) {
    response = {
      content: isBangla
        ? `খতিয়ান (স্বত্বলিপি বা Record of Rights) হলো সরকারি রাজস্ব ও জমির বৈধ দখল প্রমাণের মূল ভিত্তি।\n\n• **খতিয়ানের ক্রম:** সিএস (CS) → এসএ (SA) → আরএস (RS) → বিএস (BS)। জমি ক্রয়ের পূর্বে সর্বশেষ প্রস্তুতকৃত জরিপ খতিয়ান পরীক্ষা করা আবশ্যক।\n• **নামজারি বাধ্যতামূলক:** রেজিস্ট্রেশন আইন ১৯০৮ এর ধারা ১৭ অনুসারে জমি হস্তান্তরের পূর্বে বিক্রেতার নামে নামজারি (খারিজ খতিয়ান) ও হাল সন পর্যন্ত ভূমি উন্নয়ন কর (খাজনা) পরিশোধের দাখিলা থাকা বাধ্যতামূলক; অন্যথায় সাব-রেজিস্ট্রার দলিল নিবন্ধন করবেন না।`
        : `A Khatian (Record of Rights) is the authoritative collectorate ledger certifying title lineage, possession, and revenue status.\n\n• **Survey Chronology:** CS (Cadastral Survey) → SA (State Acquisition) → RS (Revisional Survey) → BS / City Jarip. The title examiner must verify unbroken chain of possession from legacy CS to current BS.\n• **Compulsory Mutation (Namjari):** Under Section 17 of the Registration Act, 1908, the vendor must possess a mutated Khatian (নামজারি খতিয়ান) in their own name along with current land development tax receipts prior to executing a conveyance deed.`,
      citations: [
        {
          id: 'reg_act_1908_s17',
          act: 'Registration Act, 1908',
          section: 'Section 17',
        },
        {
          id: 'tpa_1882_s54',
          act: 'Transfer of Property Act, 1882',
          section: 'Section 54',
        },
      ],
    };
  }

  // ── 7. LIS PENDENS & PENDING COURT SUITS (TPA SEC. 52) ──
  else if (
    lower.includes('suit') ||
    lower.includes('court') ||
    lower.includes('litigation') ||
    lower.includes('lis pendens') ||
    lower.includes('case') ||
    lower.includes('injunction') ||
    lower.includes('মামলা') ||
    lower.includes('আদালত') ||
    lower.includes('বিচারাধীন') ||
    lower.includes('স্থগিতাদেশ') ||
    lower.includes('ধারা ৫২') ||
    lower.includes('section 52')
  ) {
    response = {
      content: isBangla
        ? `সম্পত্তি হস্তান্তর আইন ১৮৮২ এর **ধারা ৫২ (Doctrine of Lis Pendens)** অনুসারে, কোনো উপযুক্ত এখতিয়ারসম্পন্ন দেওয়ানি আদালতে স্থাবর সম্পত্তি নিয়ে মোকদ্দমা বিচারাধীন থাকা অবস্থায় সংশ্লিষ্ট সম্পত্তি হস্তান্তর করলে তা মামলার চূড়ান্ত রায়ের অধীন থাকবে।\n\n• **ক্রেতার ঝুঁকি:** মামলা চলাকালীন জমি ক্রয় করলে ক্রেতা আদালতের চূড়ান্ত আদেশে ক্ষতিগ্রস্ত হতে পারেন এবং কোনো সরল বিশ্বাসের অজুহাত (Bona fide purchaser defense) গ্রহণযোগ্য হবে না।`
        : `Under **Section 52 of the Transfer of Property Act, 1882 (Doctrine of Lis Pendens)**, during the active pendency in any court of competent jurisdiction of any contentious suit relating to immovable property, the property cannot be transferred or dealt with by any party so as to affect the rights of any other party under any decree.\n\n• **Purchaser Exposure:** A purchaser pendente lite is bound by the eventual decree, and a plea of innocent purchase in good faith without notice is strictly barred under Section 52.`,
      citations: [
        {
          id: 'tpa_1882_s52',
          act: 'Transfer of Property Act, 1882',
          section: 'Section 52',
        },
      ],
    };
  }

  // ── 8. FORGED DEEDS & PENAL LIABILITIES (LCPRA 2023 SEC. 4, 5 & 6) ──
  else if (
    lower.includes('forged') ||
    lower.includes('fake') ||
    lower.includes('crime') ||
    lower.includes('penalty') ||
    lower.includes('fraud') ||
    lower.includes('prison') ||
    lower.includes('punishment') ||
    lower.includes('জাল') ||
    lower.includes('অপরাধ') ||
    lower.includes('শাস্তি') ||
    lower.includes('প্রতারণা') ||
    lower.includes('ভূমি অপরাধ')
  ) {
    response = {
      content: isBangla
        ? `ভূমি অপরাধ প্রতিরোধ ও প্রতিকার আইন, ২০২৩ এর **ধারা ৪** অনুসারে জাল দলিল তৈরি, উপস্থাপন, ব্যবহার বা সংরক্ষণ করা একটি আমলযোগ্য ও শাস্তিযোগ্য ফৌজদারি অপরাধ।\n\n• **শাস্তি:** অপরাধ প্রমাণে সর্বোচ্চ **৭ (সাত) বছর পর্যন্ত কারাদণ্ড** এবং অর্থদণ্ডের বিধান রয়েছে।\n• **অবৈধ হস্তান্তর (ধারা ৬):** প্রকৃত মালিকানা বা বৈধ খতিয়ান ব্যতিরেকে জমি বিক্রি বা হস্তান্তর করলে একই আইনের ধারা ৬ অনুসারে ফৌজদারি মামলা ও শাস্তির মুখোমুখি হতে হবে।`
        : `Under **Section 4 of the Land Crime Prevention and Remedy Act, 2023**, creating, presenting, possessing, or executing forged property documents constitutes a serious cognizable offense.\n\n• **Penalties:** Liable to imprisonment for a term which may extend to **seven (7) years** and punitive monetary fines.\n• **Conveyance without Valid Title (Section 6):** Transferring land without legitimate mutation ledger ownership or concealing encumbrances is punishable under Section 6 of the same Act.`,
      citations: [
        {
          id: 'lcpra_2023_s4',
          act: 'Land Crime Prevention & Remedy Act, 2023',
          section: 'Section 4',
        },
        {
          id: 'lcpra_2023_s5',
          act: 'Land Crime Prevention & Remedy Act, 2023',
          section: 'Section 5',
        },
        {
          id: 'lcpra_2023_s6',
          act: 'Land Crime Prevention & Remedy Act, 2023',
          section: 'Section 6',
        },
      ],
    };
  }

  // ── 9. COMPETENCE TO TRANSFER & BUYER/SELLER COVENANTS (TPA SEC. 7 & 55) ──
  else if (
    lower.includes('competent') ||
    lower.includes('who can transfer') ||
    lower.includes('buyer') ||
    lower.includes('seller') ||
    lower.includes('rights') ||
    lower.includes('liability') ||
    lower.includes('ক্রেতা') ||
    lower.includes('বিক্রেতা') ||
    lower.includes('দায়িত্ব') ||
    lower.includes('অধিকার') ||
    lower.includes('ধারা ৭') ||
    lower.includes('section 7') ||
    lower.includes('section 55')
  ) {
    response = {
      content: isBangla
        ? `সম্পত্তি হস্তান্তর আইন ১৮৮২ এর **ধারা ৭** এবং **ধারা ৫৫** এ পক্ষগণের যোগ্যতা ও অধিকার সুনির্দিষ্ট করা হয়েছে:\n\n• **হস্তান্তরের যোগ্যতা (ধারা ৭):** চুক্তি করার আইনগত যোগ্যতাসম্পন্ন (প্রাপ্তবয়স্ক ও সুস্থ মস্তিষ্কের) ব্যক্তি, যিনি সম্পত্তির প্রকৃত মালিক বা হস্তান্তরের আইনগত ক্ষমতা রাখেন, তিনিই সম্পত্তি হস্তান্তর করতে পারেন।\n• **বিক্রেতার দায়িত্ব (ধারা ৫৫):** বিক্রেতা দলিলের গোপন ত্রুটি (latent defect) প্রকাশ করতে এবং সম্পত্তি সকল প্রকার দায় ও ঋণমুক্ত হিসেবে বুঝিয়ে দিতে সংবিধিবদ্ধভাবে বাধ্য।`
        : `Governed under **Sections 7 and 55 of the Transfer of Property Act, 1882**:\n\n• **Competency to Transfer (Section 7):** Every person competent to contract (major of sound mind) and entitled to transferable property, or authorized to dispose of property not their own, is competent to transfer such property.\n• **Covenants for Title (Section 55):** The vendor is statutorily bound to disclose latent defects in property or title, produce documents of title for inspection, and covenant that the interest conveyed subsists free from undisclosed encumbrances.`,
      citations: [
        {
          id: 'tpa_1882_s7',
          act: 'Transfer of Property Act, 1882',
          section: 'Section 7',
        },
        {
          id: 'tpa_1882_s55',
          act: 'Transfer of Property Act, 1882',
          section: 'Section 55',
        },
      ],
    };
  }

  // ── 10. WHO CAN PRESENT FOR REGISTRATION (REG ACT SEC. 32 & 52) ──
  else if (
    lower.includes('present') ||
    lower.includes('sub-registrar') ||
    lower.includes('power of attorney') ||
    lower.includes('কারা দাখিল') ||
    lower.includes('সাব-রেজিস্ট্রার') ||
    lower.includes('দাখিলকারী') ||
    lower.includes('ধারা ৩২') ||
    lower.includes('section 32')
  ) {
    response = {
      content: isBangla
        ? `রেজিস্ট্রেশন আইন, ১৯০৮ এর **ধারা ৩২** অনুযায়ী, কোনো দলিল কেবল নিম্নলিখিত ব্যক্তিগণ দ্বারা নিবন্ধনের জন্য দাখিল করা যেতে পারে:\n\n১. দলিল সম্পাদনকারী ব্যক্তি বা তার পক্ষে কোনো দাবিদার।\n২. সম্পাদনকারীর আইনগত প্রতিনিধি বা প্রতিনিধির বৈধ আমমোক্তার (Authorized Attorney under Registered Power of Attorney)।\n\n• **রেজিস্টারিং কর্মকর্তার দায়িত্ব (ধারা ৫২):** সাব-রেজিস্ট্রার দাখিলের সঠিক দিন ও সময় দলিলে পৃষ্ঠাঙ্কন করবেন এবং দাখিলকারীকে প্রাপ্তিস্বীকার পত্র প্রদান করবেন।`
        : `Under **Section 32 of the Registration Act, 1908**, a document may be presented at the registration office only by:\n\n1. Some person executing or claiming under the same, or\n2. The representative or assign of such person, or\n3. The agent of such person, representative or assign, duly authorized by power-of-attorney executed and authenticated in accordance with Section 33.\n\n• **Duties of Registering Officer (Section 52):** The officer endorses the day, hour, and place of presentation on every document and issues a formal receipt.`,
      citations: [
        {
          id: 'reg_act_1908_s32',
          act: 'Registration Act, 1908',
          section: 'Section 32',
        },
        {
          id: 'reg_act_1908_s52',
          act: 'Registration Act, 1908',
          section: 'Section 52',
        },
      ],
    };
  }

  // ── 11. RESTRAINTS ON ALIENATION (TPA SEC. 10) ──
  else if (
    lower.includes('restraint') ||
    lower.includes('condition') ||
    lower.includes('transfer ban') ||
    lower.includes('শর্ত') ||
    lower.includes('হস্তান্তর নিষেধাজ্ঞা') ||
    lower.includes('ধারা ১০') ||
    lower.includes('section 10')
  ) {
    response = {
      content: isBangla
        ? `সম্পত্তি হস্তান্তর আইন ১৮৮২ এর **ধারা ১০** অনুসারে, কোনো হস্তান্তরের মাধ্যমে গ্রহীতাকে উক্ত সম্পত্তি বিক্রি বা হস্তান্তর করতে সম্পূর্ণ নিষেধ করে কোনো শর্ত আরোপ করা হলে, সেই শর্তটি আইনত বাতিল ও অকার্যকর (Void) বলে গণ্য হবে। হস্তান্তরটি বৈধ থাকবে, কিন্তু নিষেধাজ্ঞাটি বাতিল হবে।`
        : `Under **Section 10 of the Transfer of Property Act, 1882**, where property is transferred subject to a condition or limitation absolutely restraining the transferee from parting with or disposing of their interest in the property, the condition or limitation is void. The conveyance remains effective while the unlawful restraint is nullified.`,
      citations: [
        {
          id: 'tpa_1882_s10',
          act: 'Transfer of Property Act, 1882',
          section: 'Section 10',
        },
      ],
    };
  }

  // ── 12. EXPLICIT OUT-OF-CORPUS HANDLING (STRICT GROUNDED PROMISE) ──
  else {
    response = {
      content: isBangla
        ? `আমি আমাদের যাচাইকৃত সংবিধিবদ্ধ করপাসে (laws_corpus.json, ৪টি আইনের ২৮টি ধারা) এই সুনির্দিষ্ট বিষয়টি খুঁজে পাইনি।\n\nনথি এআই কেবল বাংলাদেশের সম্পত্তি আইনের যাচাইকৃত ধারার ভিত্তিতে সুনির্দিষ্ট উত্তর দেয়:\n• রেজিস্ট্রেশন আইন ১৯০৮ (দলিল দাখিলের ৪ মাসের সময়সীমা, ধারা ২৩)\n• সম্পত্তি হস্তান্তর আইন ১৮৮২ (দাগের তফসিল ও লিস পেনডেন্স, ধারা ৫২ ও ৫৪)\n• ভূমি অপরাধ প্রতিরোধ ও প্রতিকার আইন ২০২৩ (জাল দলিলের শাস্তি, ধারা ৪)\n• জাতীয় পরিচয় নিবন্ধন বিধিমালা ২০১০ (১০-ডিজিটের স্মার্ট এনআইডি, বিধি ৩)\n\nঅনুগ্রহ করে সম্পত্তি দলিল, দাগ নম্বর, খতিয়ান বা এনআইডি সম্পর্কিত কোনো প্রশ্ন জিজ্ঞাসা করুন!`
        : `I cannot find this specific inquiry in our verified statutory corpus (laws_corpus.json, 28 sections across 4 Acts).\n\nNothi AI strictly answers only from verified statutory sections of Bangladeshi property law:\n• Registration Act 1908 (Section 23 4-month presentation window, Section 17 compulsory deeds)\n• Transfer of Property Act 1882 (Section 54 conveyance parity & Section 52 Lis Pendens)\n• Land Crime Prevention & Remedy Act 2023 (Section 4 penal sanctions for forged deeds)\n• National Identity Registration Rules 2010 (Rule 3 10-digit Smart NID standards)\n\nPlease ask about deed registration timelines, Dag matching, Khatian records, or NID formats!`,
      citations: [],
    };
  }

  // Fast, smooth realistic word-by-word streaming effect (20-30 words per second)
  if (onChunk) {
    const words = response.content.split(' ');
    for (const word of words) {
      await new Promise((resolve) => setTimeout(resolve, 14));
      onChunk(word + ' ');
    }
  }

  return response;
}
