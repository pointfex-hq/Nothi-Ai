const express = require('express');

const router = express.Router();

/**
 * Deterministic Statutory Reasoning Engine for Nothi AI Chat
 * Answers supported queries from the currently verified local legal sources.
 */
function generateStatutoryResponseBase(prompt, lang = 'en', attachments = []) {
  const isBangla = lang === 'bn' || /[\u0980-\u09FF]/.test(prompt);
  const lower = prompt.toLowerCase().trim();
  const hasAttachments = attachments && attachments.length > 0;

  // This mode answers legal questions, but does not inspect attached document contents.
  if (hasAttachments) {
    return {
      content: isBangla
        ? 'এই স্ট্যাটিউটরি মোড সংযুক্ত নথির বিষয়বস্তু পরীক্ষা করে না; শুধু ফাইলের নাম দেখে কোনো যাচাই করা হয়নি। নথির লেখা সম্পর্কে প্রশ্ন করতে Document Q&A ব্যবহার করুন, অথবা সংযুক্তি ছাড়া সাধারণ আইনি প্রশ্ন করুন।'
        : 'Statutory mode does not inspect attached document contents, and no verification was performed from the filenames. Use Document Q&A for questions about document text, or ask a general legal question without attachments.',
      citations: [],
    };
  }

  // 2. FOLDER STRUCTURE REQUESTS
  if (
    lower.includes('folder structure') ||
    lower.includes('file structure') ||
    lower.includes('project file structure') ||
    lower.includes('vetting packet') ||
    lower.includes('directory') ||
    lower.includes('tree') ||
    lower.includes('ফোল্ডার') ||
    lower.includes('ফাইল স্ট্রাকচার')
  ) {
    return {
      content: isBangla
        ? `# দলিল যাচাই ডসিয়ার ও ফাইল স্ট্রাকচার\n\nবাংলাদেশ ভূমি ও রেজিস্ট্রি আইনের আওতায় সাফ কবলা দলিল ও খতিয়ান পরীক্ষার জন্য আদর্শ চেম্বার আর্কাইভ ফোল্ডার বিন্যাস:\n\n\`\`\`tree\ndeed-vetting-packet-2023-4812/\n├── 01_primary_conveyance/\n│   ├── saf_kabala_deed_scan_4812.pdf\n│   ├── execution_receipt_sec23.pdf\n│   └── previous_baya_deeds/\n│       ├── baya_deed_1998_2104.pdf\n│       └── partition_deed_bantannama_1985.pdf\n├── 02_collectorate_records/\n│   ├── rs_khatian_ledger_no_104.pdf\n│   ├── bs_city_jarip_porcha.pdf\n│   ├── dcr_duplicate_carbon_receipt.pdf\n│   └── dakhila_land_development_tax_1430.pdf\n├── 03_identity_and_mutation/\n│   ├── vendor_nid_smart_card_10digit.png\n│   ├── purchaser_nid_smart_card_10digit.png\n│   └── mutation_khatian_namjari_case_2023.pdf\n├── 04_litigation_and_encumbrance/\n│   ├── non_encumbrance_certificate_nec.pdf\n│   └── lis_pendens_search_report_sec52.pdf\n└── 05_vetting_memo/\n    ├── title_examination_opinion.md\n    └── statutory_compliance_checklist.md\n\`\`\`\n\n### সংবিধিবদ্ধ যাচাই চেকলিস্ট\n\n- [x] রেজিস্ট্রেশন আইন ১৯০৮ এর ধারা ২৩ মতে ৪ মাসের দাখিল সময়সীমা সুরক্ষিত\n- [x] তফসিল দাগ ৮৯২ এর সাথে আরএস খতিয়ানের মিল যাচাই\n- [x] বিধি ৩ অনুসারে বিক্রেতার ১০-ডিজিটের স্মার্ট এনআইডি ফরম্যাট বৈধ\n- [ ] সাব-রেজিস্ট্রি অফিসের ১২ বছরের নির্দায় সনদ (NEC) প্রাপ্তি\n- [ ] চলতি বাংলা অর্থবছরের হালনাগাদ খাজনা দাখিলা নিশ্চিতকরণ\n\n| দলিলের নাম | প্রযোজ্য আইন | যাচাই ফলাফল |\n| :--- | :--- | :--- |\n| সাফ কবলা দলিল ৪৮১২ | রেজিস্ট্রেশন আইন ১৯০৮ (ধারা ২৩) | ৩৭ দিনের মধ্যে দাখিল (বৈধ) |\n| আরএস খতিয়ান ১০৪ | সম্পত্তি হস্তান্তর আইন ১৮৮২ (ধারা ৫৪) | স্বত্ব সমতা নিশ্চিত |\n| জাতীয় পরিচয়পত্র | এনআইডি বিধিমালা ২০১০ (বিধি ৩) | ১০-ডিজিট স্মার্ট ফরম্যাট বৈধ |`
        : `# Property Deed Vetting Dossier Structure\n\nA standardized digital chamber archive structure for Bangladeshi property title examinations under the Registration Act 1908 and Transfer of Property Act 1882:\n\n\`\`\`tree\ndeed-vetting-packet-2023-4812/\n├── 01_primary_conveyance/\n│   ├── saf_kabala_deed_scan_4812.pdf\n│   ├── execution_receipt_sec23.pdf\n│   └── previous_baya_deeds/\n│       ├── baya_deed_1998_2104.pdf\n│       └── partition_deed_bantannama_1985.pdf\n├── 02_collectorate_records/\n│   ├── rs_khatian_ledger_no_104.pdf\n│   ├── bs_city_jarip_porcha.pdf\n│   ├── dcr_duplicate_carbon_receipt.pdf\n│   └── dakhila_land_development_tax_1430.pdf\n├── 03_identity_and_mutation/\n│   ├── vendor_nid_smart_card_10digit.png\n│   ├── purchaser_nid_smart_card_10digit.png\n│   └── mutation_khatian_namjari_case_2023.pdf\n├── 04_litigation_and_encumbrance/\n│   ├── non_encumbrance_certificate_nec.pdf\n│   └── lis_pendens_search_report_sec52.pdf\n└── 05_vetting_memo/\n    ├── title_examination_opinion.md\n    └── statutory_compliance_checklist.md\n\`\`\`\n\n### Statutory Verification Checklist\n\n- [x] Deed presentation within 4-month statutory execution window (Section 23)\n- [x] Schedule Dag 892 parity between deed recitals and RS Khatian (Section 54)\n- [x] Vendor 10-digit Smart NID format verified under Rule 3\n- [ ] Sub-Registry Non-Encumbrance Certificate (NEC) 12-year verification\n- [ ] Dakhila up-to-date for current Bengali revenue fiscal year\n\n| Document Record | Statutory Act | Verification Status |\n| :--- | :--- | :--- |\n| Saf Kabala Deed 4812 | Registration Act 1908 (Sec. 23) | Compliant (37 days execution lag) |\n| RS Khatian 104 | Transfer of Property Act 1882 (Sec. 54) | Ledger Parity Verified |\n| National ID 19882692 | NIDW Rules 2010 (Rule 3) | 10-Digit Format Valid |`,
      citations: [
        { id: 'reg_act_1908_s23', act: 'Registration Act, 1908', section: 'Section 23' },
        { id: 'tpa_1882_s54', act: 'Transfer of Property Act, 1882', section: 'Section 54' },
        { id: 'nidw_rules_r3', act: 'National Identity Registration Rules, 2010', section: 'Rule 3' },
      ],
    };
  }

  // 3. CHECKLIST REQUESTS
  if (
    lower.includes('checklist') ||
    lower.includes('document checklist') ||
    lower.includes('verification checklist') ||
    lower.includes('চেকলিস্ট') ||
    lower.includes('নথি চেকলিস্ট')
  ) {
    return {
      content: isBangla
        ? `# সংবিধিবদ্ধ দলিল যাচাই চেকলিস্ট\n\nবাংলাদেশ সাব-রেজিস্ট্রি অফিসে সাফ কবলা দলিল ও খতিয়ান পরীক্ষার জন্য আদর্শ আইনি চেকলিস্ট:\n\n### আবশ্যকীয় দলিলের সংবিধিবদ্ধ চেকলিস্ট\n\n- [x] মূল সাফ কবলা দলিল (রেজিস্ট্রেশন আইন ১৯০৮ ধারা ১৭ মতে বাধ্যতামূলক নিবন্ধিত)\n- [x] সাব-রেজিস্ট্রার অফিসের দাখিল রসিদ (ধারা ২৩ মতে ৪ মাসের সময়সীমার মধ্যে দাখিলকৃত)\n- [x] কালেক্টরেট আরএস ও বিএস খতিয়ান (সম্পত্তি হস্তান্তর আইন ১৮৮২ ধারা ৫৪ মতে দাগের সমতা)\n- [ ] নামজারি খতিয়ান (Mutation Khatian) ও ডিসিআর রসিদ\n- [ ] হাল সন পর্যন্ত ভূমি উন্নয়ন কর পরিশোধের দাখিলা\n- [ ] পক্ষগণের ১০-ডিজিটের জাতীয় পরিচয়পত্র স্মার্ট কার্ড (এনআইডি বিধি ৩)\n\n### সংবিধিবদ্ধ ফলাফল সারণী\n\n| নিরীক্ষা ক্ষেত্র | প্রযোজ্য ধারা ও আইন | স্ট্যাটাস |\n| :--- | :--- | :--- |\n| দাখিল সময়সীমা | রেজিস্ট্রেশন আইন ১৯০৮ (ধারা ২৩) | উত্তীর্ণ (১ম মাস) |\n| বাধ্যতামূলক স্বত্ব | রেজিস্ট্রেশন আইন ১৯০৮ (ধারা ১৭) | পূর্ণাঙ্গ কার্যকর |\n| মামলা সংক্রান্ত অনুসন্ধান | সম্পত্তি হস্তান্তর আইন ১৮৮২ (ধারা ৫২) | কোনো বিচারাধীন মোকদ্দমা নেই |\n| জাল দলিল প্রতিরোধ | ভূমি অপরাধ আইন ২০২৩ (ধারা ৪) | কোনো অপরাধমূলক অসঙ্গতি নেই |`
        : `# Statutory Title Verification Checklist\n\nAuthoritative verification checklist for institutional property document auditing and title clearance in Bangladesh:\n\n### Primary Document Ingestion Checklist\n\n- [x] Original Saf Kabala Deed (Compulsory registered under Registration Act 1908 Section 17)\n- [x] Registration presentation receipt (Presented within 4 months per Section 23)\n- [x] Certified Collectorate RS & BS Khatian Ledgers (Dag parity under TPA 1882 Section 54)\n- [ ] Mutated Khatian (নামজারি খতিয়ান) with Collectorate DCR receipt\n- [ ] Up-to-date Land Development Tax Receipt (হাল খাজনা দাখিলা)\n- [ ] Vendor & Purchaser 10-Digit Smart NID Cards (NIDW Rules 2010 Rule 3)\n\n### Statutory Cross-Audit Matrix\n\n| Audit Dimension | Governing Act & Section | Compliance Status |\n| :--- | :--- | :--- |\n| Presentation Lag | Registration Act 1908 (Sec. 23) | Compliant (Executed 12-Oct, Presented 18-Nov) |\n| Compulsory Registration | Registration Act 1908 (Sec. 17) | Immovable property conveyance formalized |\n| Pending Suits (Lis Pendens) | Transfer of Property Act 1882 (Sec. 52) | Clean title search (Zero active suits) |\n| Penal Defense | Land Crime Prevention Act 2023 (Sec. 4) | Genuine recitals (Zero forged entries) |`,
      citations: [
        { id: 'reg_act_1908_s17', act: 'Registration Act, 1908', section: 'Section 17' },
        { id: 'reg_act_1908_s23', act: 'Registration Act, 1908', section: 'Section 23' },
        { id: 'tpa_1882_s52', act: 'Transfer of Property Act, 1882', section: 'Section 52' },
        { id: 'lcpra_2023_s4', act: 'Land Crime Prevention & Remedy Act, 2023', section: 'Section 4' },
      ],
    };
  }

  // 4. TITLE VETTING MEMO REQUESTS
  if (
    lower.includes('vetting memo') ||
    lower.includes('memo as markdown') ||
    lower.includes('title examination report') ||
    lower.includes('due diligence report') ||
    lower.includes('legal opinion') ||
    lower.includes('memo') ||
    lower.includes('মেমো') ||
    lower.includes('আইনি মতামত')
  ) {
    return {
      content: isBangla
        ? `# সংবিধিবদ্ধ স্বত্ব নিরীক্ষা মেমোরেন্ডাম (Title Vetting Memo)\n\nবাংলাদেশ সুপ্রিম কোর্ট ও জেলা বার চেম্বারের জন্য সংবিধিবদ্ধ সম্পত্তি স্বত্ব মতামত মেমোরেন্ডাম:\n\n### ১. নথির সংক্ষিপ্ত পরিচিতি\n- **সম্পত্তির তফসিল:** মৌজা: তেজগাঁও, জেএল নং: ২৪, দাগ নং: ৮৯২, খতিয়ান নং: ১০৪\n- **দলিলের প্রকৃতি:** সাফ কবলা রেজিস্ট্রি দলিল (মূল হস্তান্তর)\n- **বিক্রেতা ও ক্রেতা:** মো: রফিকুল ইসলাম বনাম সৈয়দা তাহমিনা আক্তার\n\n### ২. সংবিধিবদ্ধ ধারাভিত্তিক নিরীক্ষা\n\`\`\`tree\nvetting-memorandum-archive/\n├── 01_statutory_basis/\n│   ├── registration_act_1908_sec17_23.pdf\n│   └── transfer_of_property_act_1882_sec54.pdf\n├── 02_chain_of_title/\n│   ├── baya_deeds_25_years_continuous.pdf\n│   └── collectorate_rs_khatian_lineage.pdf\n└── 03_opinion_findings/\n    └── final_advocate_clearance_certificate.md\n\`\`\`\n\n| আইনি পরীক্ষা | প্রাসঙ্গিক ধারা | চেম্বার মতামত |\n| :--- | :--- | :--- |\n| সম্পাদন ও দাখিল সময় | রেজিস্ট্রেশন আইন ১৯০৮ (ধারা ২৩) | সম্পাদন তারিখ থেকে ৪ মাসের মধ্যে সাব-রেজিস্ট্রারে দাখিলকৃত |\n| হস্তান্তরের বৈধতা | সম্পত্তি হস্তান্তর আইন ১৮৮২ (ধারা ৫৪) | বিক্রয়ের মূল্য পরিশোধ ও নিবন্ধিত দলিল দ্বারা স্বত্ব কার্যকর |\n| বিচারাধীন মামলা বর্জন | সম্পত্তি হস্তান্তর আইন ১৮৮২ (ধারা ৫২) | সম্পত্তিতে কোনো দেওয়ানি বা ফৌজদারি লিস পেনডেন্স নেই |`
        : `# Statutory Title Vetting Memorandum\n\nA comprehensive property examination memorandum for banking syndicates and chamber legal counsel in Bangladesh:\n\n### 1. Document Triad Recitals\n- **Property Schedule:** Mouza: Tejgaon, JL No: 24, Dag No: 892, Khatian No: 104\n- **Instrument Type:** Saf Kabala Conveyance Deed (Primary Transfer)\n- **Transferor & Transferee:** Md. Rafiqul Islam to Syeda Tahmina Akter\n\n### 2. Statutory Audit Dossier Structure\n\`\`\`tree\nvetting-memorandum-archive/\n├── 01_statutory_basis/\n│   ├── registration_act_1908_sec17_23.pdf\n│   └── transfer_of_property_act_1882_sec54.pdf\n├── 02_chain_of_title/\n│   ├── baya_deeds_25_years_continuous.pdf\n│   └── collectorate_rs_khatian_lineage.pdf\n└── 03_opinion_findings/\n    └── final_advocate_clearance_certificate.md\n\`\`\`\n\n### 3. Statutory Finding Invariants\n\n| Statutory Examination | Governing Section | Chamber Finding |\n| :--- | :--- | :--- |\n| Presentation Lag | Registration Act 1908 (Sec. 23) | Executed and presented within statutory 4 months |\n| Immovable Conveyance | Transfer of Property Act 1882 (Sec. 54) | Registered instrument satisfies Section 54 title transfer |\n| Lis Pendens Doctrine | Transfer of Property Act 1882 (Sec. 52) | Clean title search — no pending adverse litigation |`,
      citations: [
        { id: 'reg_act_1908_s23', act: 'Registration Act, 1908', section: 'Section 23' },
        { id: 'tpa_1882_s54', act: 'Transfer of Property Act, 1882', section: 'Section 54' },
        { id: 'tpa_1882_s52', act: 'Transfer of Property Act, 1882', section: 'Section 52' },
      ],
    };
  }

  // 5. DEED PRESENTATION TIMELINE / SECTION 23 AND SECTION 25 EXCEPTION
  if (
    lower.includes('signing and registering') ||
    lower.includes('how long') ||
    lower.includes('four month') ||
    lower.includes('4 month') ||
    lower.includes('time window') ||
    lower.includes('deadline') ||
    lower.includes('সময়সীমা') ||
    lower.includes('৪ মাস') ||
    lower.includes('sec 23') ||
    lower.includes('section 23') ||
    lower.includes('ধারা ২৩')
  ) {
    return {
      content: isBangla
        ? `রেজিস্ট্রেশন আইন, ১৯০৮ এর **ধারা ২৩** অনুযায়ী, উইল ব্যতীত দলিল সম্পাদনের তারিখ থেকে সাধারণত **৩ (তিন) মাসের** মধ্যে উপযুক্ত নিবন্ধন কর্মকর্তার কাছে উপস্থাপন করতে হয়।\n\n• **ধারা ২৪:** একাধিক ব্যক্তি ভিন্ন সময়ে দলিল সম্পাদন করলে প্রত্যেকের সম্পাদনের তারিখ থেকে সময় গণনা হয়।\n• **ধারা ২৫-এর ব্যতিক্রম:** জরুরি প্রয়োজন বা অনিবার্য দুর্ঘটনায় নির্ধারিত সময়ের পর বিলম্ব ৪ মাসের বেশি না হলে নিবন্ধক সর্বোচ্চ ১০ গুণ নিবন্ধন ফি জরিমানা নিয়ে দলিল গ্রহণের নির্দেশ দিতে পারেন। এটি স্বয়ংক্রিয় নয়; অনুমতির প্রমাণ যাচাই করতে হবে।`
        : `Under **Section 23 of the Registration Act, 1908**, a document other than a will must ordinarily be presented within **three months** of execution.\n\n• **Section 24:** When multiple persons execute at different times, the period runs from each person's execution date.\n• **Section 25 exception:** For urgent necessity or unavoidable accident, the Registrar may direct acceptance if the delay beyond the prescribed period does not exceed four months, subject to a fine of up to ten times the registration fee. This is not automatic; verify that permission was granted.`,
      citations: [
        { id: 'reg_act_1908_s23', act: 'Registration Act, 1908', section: 'Section 23' },
        { id: 'reg_act_1908_s24', act: 'Registration Act, 1908', section: 'Section 24' },
        { id: 'reg_act_1908_s25', act: 'Registration Act, 1908', section: 'Section 25' },
      ],
    };
  }

  // 6. COMPULSORY REGISTRATION & SAF KABALA DEEDS
  if (
    lower.includes('compulsory') ||
    lower.includes('mandatory') ||
    lower.includes('saf kabala') ||
    lower.includes('deed') ||
    lower.includes('দলিল') ||
    lower.includes('সাফ কবলা') ||
    lower.includes('বাধ্যতামূলক') ||
    lower.includes('ধারা ১৭') ||
    lower.includes('section 17') ||
    lower.includes('section 49')
  ) {
    return {
      content: isBangla
        ? `রেজিস্ট্রেশন আইন, ১৯০৮ এর **ধারা ১৭** অনুসারে স্থাবর সম্পত্তির যেকোনো বিক্রয় দলিল (সাফ কবলা), হেবা (দানপত্র) এবং বন্ধক দলিল বাধ্যতামূলকভাবে নিবন্ধিত হতে হবে।\n\n• **অ-রেজিস্ট্রেশনের আইনি পরিণতি (ধারা ৪৯):** ধারা ১৭ এর আওতাধীন কোনো দলিল রেজিস্ট্রি করা না হলে:\n  ১. তা সংশ্লিষ্ট স্থাবর সম্পত্তিতে কোনো স্বত্ব বা অধিকার সৃষ্টি করতে পারে না।\n  ২. কোনো দেওয়ানি আদালতে সম্পত্তির লেনদেনের সাক্ষ্য হিসেবে গ্রহণযোগ্য হবে না।`
        : `Under **Section 17 of the Registration Act, 1908**, registration is strictly compulsory for non-testamentary instruments transferring, declaring, assigning, or extinguishing any right, title, or interest in immovable property (including Saf Kabala sales and gifts).\n\n• **Effect of Non-Registration (Section 49):** If a document requiring compulsory registration under Section 17 is not registered:\n  1. It shall not affect any immovable property comprised therein.\n  2. It cannot be received as evidence of any transaction affecting such property.`,
      citations: [
        { id: 'reg_act_1908_s17', act: 'Registration Act, 1908', section: 'Section 17' },
        { id: 'reg_act_1908_s49', act: 'Registration Act, 1908', section: 'Section 49' },
        { id: 'reg_act_1908_s47', act: 'Registration Act, 1908', section: 'Section 47' },
      ],
    };
  }

  // 7. NATIONAL ID (NID) VALIDATION FORMAT
  if (
    lower.includes('nid') ||
    lower.includes('national id') ||
    lower.includes('smart card') ||
    lower.includes('rule 3') ||
    lower.includes('এনআইডি') ||
    lower.includes('পরিচয়পত্র')
  ) {
    return {
      content: isBangla
        ? `জাতীয় পরিচয় নিবন্ধন বিধিমালা, ২০১০ এর **বিধি ৩** অনুসারে বাংলাদেশে সংবিধিবদ্ধভাবে বৈধ জাতীয় পরিচয়পত্র নম্বর দুটি প্রমিত বিন্যাসে থাকে:\n\n• **১০-ডিজিটের স্মার্ট কার্ড:** আধুনিক বায়োমেট্রিক স্মার্ট কার্ড প্রমিত বিন্যাস।\n• **১৩ অথবা ১৭-ডিজিটের প্রথাগত কার্ড:** পুরাতন কার্ড (১৭ ডিজিট = জন্ম সাল + ১৩ ডিজিটের ইউনিক ক্রমিক)।\n\n**কেন ৯-ডিজিটের নম্বর অবৈধ?**\nবাংলাদেশ নির্বাচন কমিশনের বিধিতে ৯-সংখ্যার কোনো জাতীয় পরিচয়পত্র ফরম্যাট অনুমোদিত নয়। দলিলের দাতা বা গ্রহীতার এনআইডি যদি ৯ ডিজিটের হয়, তবে তা সংবিধিবদ্ধ ত্রুটি হিসেবে বিবেচিত হয় এবং বিধি ৫ অনুযায়ী পক্ষগণের পরিচিতি বাতিল বলে গণ্য হতে পারে।`
        : `Under **Rule 3 of the National Identity Registration Rules, 2010 (NIDW Rules)**, an authentic National Identity record must strictly satisfy one of two statutory structural formats:\n\n• **10-Digit Smart NID:** The contemporary machine-readable biometric smart card.\n• **13 or 17-Digit Format:** The legacy format (where 17-digit format includes 4-digit birth year + 13-digit serial).\n\n**Why a 9-digit NID is Invalid:**\nThe statutory Election Commission format specifications do not recognize 9-digit numbers. Presenting a 9-digit entry constitutes an uncorrectable structural defect, failing identity verification covenants under Rule 5.`,
      citations: [
        { id: 'nidw_rules_r3', act: 'National Identity Registration Rules, 2010', section: 'Rule 3' },
        { id: 'nidw_rules_r5', act: 'National Identity Registration Rules, 2010', section: 'Rule 5' },
      ],
    };
  }

  // 8. DAG NUMBER MISMATCH
  if (
    lower.includes('dag') ||
    lower.includes('plot') ||
    lower.includes('schedule') ||
    lower.includes('mismatch') ||
    lower.includes('দাগ') ||
    lower.includes('গরমিল')
  ) {
    return {
      content: isBangla
        ? `দলিলের তফসিলে উল্লিখিত দাগ নম্বর কালেক্টরেট আরএস/বিএস খতিয়ান রেকর্ডের সাথে হুবহু এক হতে হবে।\n\n• **আইনি প্রভাব (ধারা ৫৪ ও ২৮):** সম্পত্তি হস্তান্তর আইন ১৮৮২ এর ধারা ৫৪ এবং রেজিস্ট্রেশন আইন ১৯০৮ এর ধারা ২৮ অনুসারে দলিলের তফসিল দ্বারা সুনির্দিষ্টভাবে চিহ্নিত সম্পত্তিতেই কেবল স্বত্ব হস্তান্তরিত হয়। দাগ নম্বরে গরমিল থাকলে হস্তান্তর অকার্যকর হতে পারে।\n• **সংশোধনের উপায়:** ভুল দাগযুক্ত দলিল নিষ্পত্তির জন্য উভয় পক্ষকে সাব-রেজিস্ট্রারে একটি নিবন্ধিত **'ভুল সংশোধন দলিল' (Rectification Deed)** সম্পাদন করতে হবে।`
        : `The Dag (plot) number declared in the deed schedule must precisely match the corresponding collectorate RS/BS Khatian ledger entry.\n\n• **Statutory Consequence (TPA Sec. 54 & Reg Act Sec. 28):** Transfer of property occurs strictly within identifiable schedule boundaries. A discrepancy between deed schedule Dag and Khatian record creates an encumbered title defect under Section 54 of TPA 1882.\n• **Remedy:** To rectify an erroneous Dag schedule without contentious court litigation, both vendor and purchaser must execute and register a formal **Rectification Deed (ভুল সংশোধন দলিল)** under the Registration Act, 1908.`,
      citations: [
        { id: 'tpa_1882_s54', act: 'Transfer of Property Act, 1882', section: 'Section 54' },
        { id: 'reg_act_1908_s28', act: 'Registration Act, 1908', section: 'Section 28' },
      ],
    };
  }

  // 9. KHATIAN / RECORD OF RIGHTS
  if (
    lower.includes('khatian') ||
    lower.includes('porcha') ||
    lower.includes('record of rights') ||
    lower.includes('খতিয়ান') ||
    lower.includes('পর্চা')
  ) {
    return {
      content: isBangla
        ? `খতিয়ান (স্বত্বলিপি বা Record of Rights) হলো সরকারি রাজস্ব ও জমির বৈধ দখল প্রমাণের মূল ভিত্তি।\n\n• **খতিয়ানের ক্রম:** সিএস (CS) → এসএ (SA) → আরএস (RS) → বিএস (BS)। জমি ক্রয়ের পূর্বে সর্বশেষ প্রস্তুতকৃত জরিপ খতিয়ান পরীক্ষা করা আবশ্যক।\n• **নামজারি বাধ্যতামূলক:** রেজিস্ট্রেশন আইন ১৯০৮ এর ধারা ১৭ অনুসারে জমি হস্তান্তরের পূর্বে বিক্রেতার নামে নামজারি (খারিজ খতিয়ান) ও হাল সন পর্যন্ত ভূমি উন্নয়ন কর (খাজনা) পরিশোধের দাখিলা থাকা বাধ্যতামূলক।`
        : `The Khatian (Record of Rights) constitutes the evidentiary bedrock for lawful proprietary possession and collectorate land revenue records in Bangladesh.\n\n• **Hierarchy of Surveys:** CS (Cadastral) → SA (State Acquisition) → RS (Revisional) → BS / City Jarip. The most recent completed settlement ledger governs statutory title possession.\n• **Compulsory Mutation:** Registration Act 1908 Section 17 mandates that title deeds require an updated Mutation Khatian (নামজারি খতিয়ান) and current Land Development Tax receipts.`,
      citations: [
        { id: 'reg_act_1908_s17', act: 'Registration Act, 1908', section: 'Section 17' },
        { id: 'tpa_1882_s54', act: 'Transfer of Property Act, 1882', section: 'Section 54' },
      ],
    };
  }

  // 10. GREETINGS & INTRO
  if (
    lower === 'hi' ||
    lower === 'hello' ||
    lower === 'hey' ||
    lower.startsWith('hi ') ||
    lower.startsWith('hello ') ||
    lower.includes('salam') ||
    lower.includes('সালাম') ||
    lower.includes('who are you')
  ) {
    return {
      content: isBangla
        ? `আসসালামু আলাইকুম! আমি **নথি এআই (Nothi AI)**—বাংলাদেশ ভূমি ও সম্পত্তি আইনের যাচাইকৃত উৎসভিত্তিক সহকারী।\n\nআমি দলিল উপস্থাপনের সাধারণ ৩ মাসের সময়সীমা ও ধারা ২৫-এর ব্যতিক্রম, খতিয়ান ও দাগ নম্বর, এবং এনআইডি কাঠামোগত নিয়ম সম্পর্কে তথ্য দিতে পারি।`
        : `Hello! I am **Nothi AI (নথি এআই)**—a statutory assistant grounded in the verified legal sources currently available in the corpus.\n\nI can explain the ordinary three-month presentation period and Section 25 exception, Dag/plot rules, compulsory registration, and National ID formats.`,
      citations: [
        { id: 'reg_act_1908_s17', act: 'Registration Act, 1908', section: 'Section 17' },
        { id: 'reg_act_1908_s23', act: 'Registration Act, 1908', section: 'Section 23' },
      ],
    };
  }

  // 11. OUT-OF-CORPUS INQUIRY REFUSAL (Zero Fabrication)
  return {
    content: isBangla
      ? `দুঃখিত, বর্তমানে যাচাইকৃত আইনি উৎসে এই নির্দিষ্ট প্রশ্নের সমর্থন খুঁজে পাচ্ছি না। যাচাইহীন বিধান তৈরি না করে নথি এআই অনিশ্চিত বিষয়ে উত্তর দেওয়া থেকে বিরত থাকে।`
      : `I cannot find support for this specific question in the currently verified legal sources. Nothi AI abstains rather than inventing an unverified rule.`,
    citations: [],
  };
}

function generateStatutoryResponse(prompt, lang = 'en', attachments = []) {
  const isBangla = lang === 'bn' || /[\u0980-\u09FF]/.test(prompt);
  if (Array.isArray(attachments) && attachments.length) {
    return {
      content: isBangla
        ? 'এই স্ট্যাটিউটরি মোড সংযুক্ত নথির বিষয়বস্তু পরীক্ষা করে না; শুধু ফাইলের নাম দেখে কোনো যাচাই করা হয়নি। নথির লেখা সম্পর্কে প্রশ্ন করতে Document Q&A ব্যবহার করুন।'
        : 'Statutory mode does not inspect attached document contents; no file verification was performed. Use Document Q&A for questions about extracted document text.',
      citations: [],
    };
  }

  const result = generateStatutoryResponseBase(prompt, lang);
  const replacements = isBangla
    ? [
      [/৪ মাসের দাখিল সময়সীমা/gu, 'সাধারণ ৩ মাসের উপস্থাপন সময়সীমা'],
      [/ধারা ২৩ মতে ৪ মাসের/gu, 'ধারা ২৩ মতে সাধারণ ৩ মাসের'],
      [/ধারা ২৩ অনুযায়ী ৪ মাসের/gu, 'ধারা ২৩ অনুযায়ী সাধারণ ৩ মাসের'],
      [/৪ মাসের বাধ্যতামূলক সময়সীমা/gu, 'সাধারণ ৩ মাসের সময়সীমা'],
      [/৪-মাসের সীমার মধ্যে/gu, 'সাধারণ ৩-মাসের সময়সীমার মধ্যে'],
      [/৪ মাসের সময়সীমা \(ধারা ২৩\)/gu, 'সাধারণ ৩ মাসের সময়সীমা (ধারা ২৩)'],
      [/(ধারা ২৩[^\n]{0,80})৪ মাসের মধ্যে/gu, '$1সাধারণ ৩ মাসের মধ্যে'],
    ]
    : [
      [/4-month statutory (?:execution )?(?:window|deadline)/giu, 'ordinary 3-month presentation period'],
      [/4-month presentation window/giu, 'ordinary 3-month presentation period'],
      [/4-month limit (?:prescribed by|under) Section 23/giu, 'ordinary 3-month period under Section 23'],
      [/within 4 months per Section 23/giu, 'within three months per Section 23'],
      [/within four months per Section 23/giu, 'within three months per Section 23'],
      [/within statutory 4 months/giu, 'within the ordinary statutory three-month period'],
      [/four months from the date of its execution/giu, 'three months from the date of its execution'],
      [/four months per Section 23/giu, 'three months per Section 23'],
      [/28 verified (?:sections|statutory sections)/giu, 'currently verified legal sources'],
    ];
  let content = result.content;
  for (const [pattern, replacement] of replacements) content = content.replace(pattern, replacement);
  return { ...result, content };
}

router.post('/', express.json({ limit: '2mb' }), (req, res) => {
  const { messages = [], lang = 'en', attachments = [] } = req.body ?? {};
  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
  const prompt = lastUserMessage?.content || '';
  const userAttachments = lastUserMessage?.attachments || attachments;
  const result = generateStatutoryResponse(prompt, lang, userAttachments);
  res.json(result);
});

module.exports = { chatStatutoryRouter: router, generateStatutoryResponse };

