import type {
  AuditResult,
  EntityMap,
  EntityRow,
} from '@/types';

// ── Packet A: Compliant ────────────────────────────────

const deedEntitiesA: EntityMap = {
  seller_name:       { en: 'Abdul Karim', bn: 'আব্দুল করিম' },
  buyer_name:        { en: 'Mohammad Hasan', bn: 'মোহাম্মদ হাসান' },
  father_name:       { en: 'Rafiqul Islam', bn: 'রফিকুল ইসলাম' },
  nid_number:        { en: '2694785130' },
  dag_no:            { en: '412' },
  khatian_no:        { en: '1087' },
  mouza:             { en: 'Charbata', bn: 'চরবাটা' },
  execution_date:    { en: '2024-01-15' },
  registration_date: { en: '2024-02-06' },
  deed_value_bdt:    { en: '12,50,000', bn: '১২,৫০,০০০' },
};

const khatianEntitiesA: EntityMap = {
  dag_no:      { en: '412' },
  khatian_no:  { en: '1087' },
  mouza:       { en: 'Charbata', bn: 'চরবাটা' },
  seller_name: { en: 'Abdul Karim', bn: 'আব্দুল করিম' },
};

const nidEntitiesA: EntityMap = {
  buyer_name:  { en: 'Mohammad Hasan', bn: 'মোহাম্মদ হাসান' },
  father_name: { en: 'Rafiqul Islam', bn: 'রফিকুল ইসলাম' },
  nid_number:  { en: '2694785130' },
};

const matrixA: EntityRow[] = [
  { field: 'seller_name',       label: { en: 'Seller Name', bn: 'বিক্রেতার নাম' },           deed: deedEntitiesA.seller_name, khatian: khatianEntitiesA.seller_name, match: true },
  { field: 'buyer_name',        label: { en: 'Buyer Name', bn: 'ক্রেতার নাম' },              deed: deedEntitiesA.buyer_name, nid: nidEntitiesA.buyer_name, match: true },
  { field: 'father_name',       label: { en: "Father's Name", bn: 'পিতার নাম' },              deed: deedEntitiesA.father_name, nid: nidEntitiesA.father_name, match: true },
  { field: 'nid_number',        label: { en: 'NID Number', bn: 'জাতীয় পরিচয়পত্র নম্বর' },    deed: deedEntitiesA.nid_number, nid: nidEntitiesA.nid_number, match: true },
  { field: 'dag_no',            label: { en: 'Dag No.', bn: 'দাগ নং' },                       deed: deedEntitiesA.dag_no, khatian: khatianEntitiesA.dag_no, match: true },
  { field: 'khatian_no',        label: { en: 'Khatian No.', bn: 'খতিয়ান নং' },                deed: deedEntitiesA.khatian_no, khatian: khatianEntitiesA.khatian_no, match: true },
  { field: 'mouza',             label: { en: 'Mouza', bn: 'মৌজা' },                           deed: deedEntitiesA.mouza, khatian: khatianEntitiesA.mouza, match: true },
  { field: 'execution_date',    label: { en: 'Execution Date', bn: 'সম্পাদনের তারিখ' },        deed: deedEntitiesA.execution_date, match: true },
  { field: 'registration_date', label: { en: 'Registration Date', bn: 'নিবন্ধনের তারিখ' },     deed: deedEntitiesA.registration_date, match: true },
  { field: 'deed_value_bdt',    label: { en: 'Deed Value (BDT)', bn: 'দলিল মূল্য (টাকা)' },    deed: deedEntitiesA.deed_value_bdt, match: true },
];

export const packetAResult: AuditResult = {
  id: 'audit-packet-a',
  timestamp: new Date().toISOString(),
  entities: {
    deed: deedEntitiesA,
    khatian: khatianEntitiesA,
    nid: nidEntitiesA,
  },
  matrix: matrixA,
  flags: [
    {
      id: 'flag-a-green-1',
      severity: 'GREEN',
      title: 'All plot identifiers match across Deed and Khatian',
      titleBn: 'দলিল ও খতিয়ান জুড়ে সকল প্লট শনাক্তকারী মিলে গেছে',
      rule: 'FR-3.1: dag_no, khatian_no, mouza must match between Deed and Khatian',
      ruleBn: 'FR-3.1: দাগ নং, খতিয়ান নং, মৌজা দলিল ও খতিয়ানের মধ্যে মিলতে হবে',
      values: [
        { field: 'dag_no', deed: '412', khatian: '412' },
        { field: 'khatian_no', deed: '1087', khatian: '1087' },
        { field: 'mouza', deed: 'Charbata', khatian: 'Charbata' },
      ],
      citations: [
        { id: 'tpa_1882_s54', act: 'Transfer of Property Act, 1882', section: 'Section 54', title: 'Sale defined' },
      ],
    },
    {
      id: 'flag-a-green-2',
      severity: 'GREEN',
      title: 'Registration within 4-month limit (22-day lag)',
      titleBn: '৪-মাসের সীমার মধ্যে নিবন্ধন (২২ দিনের ব্যবধান)',
      rule: 'FR-3.2: Registration lag must not exceed 4 months per Sec. 23, Registration Act 1908',
      ruleBn: 'FR-3.2: নিবন্ধনের ব্যবধান নিবন্ধন আইন ১৯০৮ এর ধারা ২৩ অনুযায়ী ৪ মাসের বেশি হওয়া যাবে না',
      values: [
        { field: 'execution_date', deed: '2024-01-15' },
        { field: 'registration_date', deed: '2024-02-06' },
      ],
      citations: [
        { id: 'reg_act_1908_s23', act: 'Registration Act, 1908', section: 'Section 23', title: 'Time for presenting documents' },
      ],
    },
    {
      id: 'flag-a-green-3',
      severity: 'GREEN',
      title: 'NID format valid (10 digits) and holder name matches deed party',
      titleBn: 'জাতীয় পরিচয়পত্র বিন্যাস বৈধ (১০ সংখ্যা) এবং ধারকের নাম দলিলের পক্ষের সাথে মিলেছে',
      rule: 'FR-3.3: NID length must be 10, 13 or 17 digits; NID holder name must match deed party',
      ruleBn: 'FR-3.3: জাতীয় পরিচয়পত্র সংখ্যা ১০, ১৩ বা ১৭ সংখ্যার হতে হবে; ধারকের নাম দলিলের পক্ষের সাথে মিলতে হবে',
      values: [
        { field: 'nid_number', deed: '2694785130', nid: '2694785130' },
        { field: 'buyer_name', deed: 'Mohammad Hasan', nid: 'Mohammad Hasan' },
      ],
      citations: [
        { id: 'nidw_rules_r3', act: 'NID Wing Rules', section: 'Rule 3', title: 'Format of National Identity Number' },
      ],
    },
  ],
  memo: [
    {
      id: 'memo-a-1',
      heading: 'Vetting Memorandum',
      headingBn: 'যাচাই স্মারক',
      body: 'This memorandum certifies the vetting of three documents submitted for the property transfer at Mouza Charbata, Dag No. 412, Khatian No. 1087.',
      bodyBn: 'এই স্মারক মৌজা চরবাটা, দাগ নং ৪১২, খতিয়ান নং ১০৮৭-এ সম্পত্তি হস্তান্তরের জন্য জমা দেওয়া তিনটি দলিলের যাচাই প্রত্যয়ন করে।',
      citations: [],
    },
    {
      id: 'memo-a-2',
      heading: 'Plot Identity Verification',
      headingBn: 'প্লট পরিচয় যাচাই',
      body: 'The Dag number (412), Khatian number (1087) and Mouza (Charbata) in the Saf Kabala deed match the RS Khatian record. No discrepancy found.',
      bodyBn: 'সাফ কবলা দলিলে দাগ নম্বর (৪১২), খতিয়ান নম্বর (১০৮৭) এবং মৌজা (চরবাটা) আরএস খতিয়ান রেকর্ডের সাথে মিলে গেছে। কোনো অমিল পাওয়া যায়নি।',
      citations: [
        { id: 'tpa_1882_s54', act: 'Transfer of Property Act, 1882', section: 'Section 54', title: 'Sale defined' },
      ],
    },
    {
      id: 'memo-a-3',
      heading: 'Registration Timeliness',
      headingBn: 'নিবন্ধনের সময়ানুবর্তিতা',
      body: 'The deed was executed on 15 January 2024 and registered on 06 February 2024, a lag of 22 days. This is within the 4-month limit prescribed by Section 23 of the Registration Act, 1908.',
      bodyBn: 'দলিলটি ১৫ জানুয়ারি ২০২৪ তারিখে সম্পাদিত এবং ০৬ ফেব্রুয়ারি ২০২৪ তারিখে নিবন্ধিত হয়েছে, ২২ দিনের ব্যবধান। এটি নিবন্ধন আইন, ১৯০৮ এর ধারা ২৩ দ্বারা নির্ধারিত ৪-মাসের সীমার মধ্যে।',
      citations: [
        { id: 'reg_act_1908_s23', act: 'Registration Act, 1908', section: 'Section 23', title: 'Time for presenting documents' },
      ],
    },
    {
      id: 'memo-a-4',
      heading: 'Identity Verification',
      headingBn: 'পরিচয় যাচাই',
      body: 'The buyer\'s NID (2694785130) is a valid 10-digit number. The NID holder name "Mohammad Hasan" matches the buyer name in the deed.',
      bodyBn: 'ক্রেতার জাতীয় পরিচয়পত্র (২৬৯৪৭৮৫১৩০) একটি বৈধ ১০-সংখ্যার নম্বর। জাতীয় পরিচয়পত্র ধারকের নাম "মোহাম্মদ হাসান" দলিলে ক্রেতার নামের সাথে মিলে গেছে।',
      citations: [
        { id: 'nidw_rules_r3', act: 'NID Wing Rules', section: 'Rule 3', title: 'Format of National Identity Number' },
      ],
    },
    {
      id: 'memo-a-5',
      heading: 'Conclusion',
      headingBn: 'উপসংহার',
      body: 'All three documents are consistent. No discrepancies or statutory violations detected. The transfer may proceed subject to standard due diligence.',
      bodyBn: 'তিনটি দলিলই সামঞ্জস্যপূর্ণ। কোনো অমিল বা বিধিবদ্ধ লঙ্ঘন সনাক্ত হয়নি। মানসম্মত যথাযথ অধ্যবসায় সাপেক্ষে হস্তান্তর এগিয়ে যেতে পারে।',
      citations: [],
    },
  ],
  summary: {
    totalFlags: 3,
    redCount: 0,
    amberCount: 0,
    greenCount: 3,
    discrepancies: 0,
    verdict: 'COMPLIANT',
    verdictBn: 'সম্মত',
  },
};

// ── Packet B: 3 Planted Defects ────────────────────────

const deedEntitiesB: EntityMap = {
  seller_name:       { en: 'Abdul Karim', bn: 'আব্দুল করিম' },
  buyer_name:        { en: 'Mohammad Hasan', bn: 'মোহাম্মদ হাসান' },
  father_name:       { en: 'Rafiqul Islam', bn: 'রফিকুল ইসলাম' },
  nid_number:        { en: '269478513' }, // 9 digits — invalid
  dag_no:            { en: '412' },
  khatian_no:        { en: '1087' },
  mouza:             { en: 'Charbata', bn: 'চরবাটা' },
  execution_date:    { en: '2024-01-15' },
  registration_date: { en: '2024-05-30' }, // 135 days lag — exceeds 4 months
  deed_value_bdt:    { en: '12,50,000', bn: '১২,৫০,০০০' },
};

const khatianEntitiesB: EntityMap = {
  dag_no:      { en: '421' }, // Mismatch: 421 vs 412
  khatian_no:  { en: '1087' },
  mouza:       { en: 'Charbata', bn: 'চরবাটা' },
  seller_name: { en: 'Abdul Karim', bn: 'আব্দুল করিম' },
};

const nidEntitiesB: EntityMap = {
  buyer_name:  { en: 'Mohammad Hasan', bn: 'মোহাম্মদ হাসান' },
  father_name: { en: 'Rafiqul Islam', bn: 'রফিকুল ইসলাম' },
  nid_number:  { en: '269478513' }, // 9 digits
};

const matrixB: EntityRow[] = [
  { field: 'seller_name',       label: { en: 'Seller Name', bn: 'বিক্রেতার নাম' },           deed: deedEntitiesB.seller_name, khatian: khatianEntitiesB.seller_name, match: true },
  { field: 'buyer_name',        label: { en: 'Buyer Name', bn: 'ক্রেতার নাম' },              deed: deedEntitiesB.buyer_name, nid: nidEntitiesB.buyer_name, match: true },
  { field: 'father_name',       label: { en: "Father's Name", bn: 'পিতার নাম' },              deed: deedEntitiesB.father_name, nid: nidEntitiesB.father_name, match: true },
  { field: 'nid_number',        label: { en: 'NID Number', bn: 'জাতীয় পরিচয়পত্র নম্বর' },    deed: deedEntitiesB.nid_number, nid: nidEntitiesB.nid_number, match: true },
  { field: 'dag_no',            label: { en: 'Dag No.', bn: 'দাগ নং' },                       deed: deedEntitiesB.dag_no, khatian: khatianEntitiesB.dag_no, match: false },
  { field: 'khatian_no',        label: { en: 'Khatian No.', bn: 'খতিয়ান নং' },                deed: deedEntitiesB.khatian_no, khatian: khatianEntitiesB.khatian_no, match: true },
  { field: 'mouza',             label: { en: 'Mouza', bn: 'মৌজা' },                           deed: deedEntitiesB.mouza, khatian: khatianEntitiesB.mouza, match: true },
  { field: 'execution_date',    label: { en: 'Execution Date', bn: 'সম্পাদনের তারিখ' },        deed: deedEntitiesB.execution_date, match: true },
  { field: 'registration_date', label: { en: 'Registration Date', bn: 'নিবন্ধনের তারিখ' },     deed: deedEntitiesB.registration_date, match: true },
  { field: 'deed_value_bdt',    label: { en: 'Deed Value (BDT)', bn: 'দলিল মূল্য (টাকা)' },    deed: deedEntitiesB.deed_value_bdt, match: true },
];

export const packetBResult: AuditResult = {
  id: 'audit-packet-b',
  timestamp: new Date().toISOString(),
  entities: {
    deed: deedEntitiesB,
    khatian: khatianEntitiesB,
    nid: nidEntitiesB,
  },
  matrix: matrixB,
  flags: [
    {
      id: 'flag-b-red-1',
      severity: 'RED',
      title: 'Dag number mismatch: Deed 412 vs Khatian 421',
      titleBn: 'দাগ নম্বর অমিল: দলিল ৪১২ বনাম খতিয়ান ৪২১',
      rule: 'FR-3.1: dag_no must match between Deed and Khatian. Mismatch may indicate a forged deed or incorrect khatian reference.',
      ruleBn: 'FR-3.1: দলিল ও খতিয়ানের মধ্যে দাগ নং মিলতে হবে। অমিল জাল দলিল বা ভুল খতিয়ান রেফারেন্স নির্দেশ করতে পারে।',
      values: [
        { field: 'dag_no', deed: '412', khatian: '421' },
      ],
      citations: [
        { id: 'tpa_1882_s54', act: 'Transfer of Property Act, 1882', section: 'Section 54', title: 'Sale defined' },
        { id: 'lcpra_2023_s5', act: 'Land Crime Prevention & Remedy Act, 2023', section: 'Section 5', title: 'Offences relating to falsification of land records' },
      ],
      highlight: { docType: 'khatian' },
    },
    {
      id: 'flag-b-red-2',
      severity: 'RED',
      title: 'Registration lag exceeds 4 months (135 days)',
      titleBn: 'নিবন্ধনের ব্যবধান ৪ মাস অতিক্রম করেছে (১৩৫ দিন)',
      rule: 'FR-3.2: Registration lag (execution to registration) must not exceed 4 months per Section 23, Registration Act 1908. Actual lag: 135 days.',
      ruleBn: 'FR-3.2: নিবন্ধনের ব্যবধান (সম্পাদন থেকে নিবন্ধন) নিবন্ধন আইন ১৯০৮ এর ধারা ২৩ অনুযায়ী ৪ মাসের বেশি হওয়া যাবে না। প্রকৃত ব্যবধান: ১৩৫ দিন।',
      values: [
        { field: 'execution_date', deed: '2024-01-15' },
        { field: 'registration_date', deed: '2024-05-30' },
      ],
      citations: [
        { id: 'reg_act_1908_s23', act: 'Registration Act, 1908', section: 'Section 23', title: 'Time for presenting documents' },
      ],
      highlight: { docType: 'deed' },
    },
    {
      id: 'flag-b-amber-1',
      severity: 'AMBER',
      title: 'NID has 9 digits (invalid NIDW format)',
      titleBn: 'জাতীয় পরিচয়পত্রে ৯ সংখ্যা (অবৈধ NIDW বিন্যাস)',
      rule: 'FR-3.3: NID length must be 10, 13 or 17 digits. This NID has 9 digits, which does not conform to any recognised NIDW format.',
      ruleBn: 'FR-3.3: জাতীয় পরিচয়পত্র সংখ্যা ১০, ১৩ বা ১৭ সংখ্যার হতে হবে। এই জাতীয় পরিচয়পত্রে ৯ সংখ্যা আছে, যা কোনো স্বীকৃত NIDW বিন্যাসের সাথে সামঞ্জস্যপূর্ণ নয়।',
      values: [
        { field: 'nid_number', deed: '269478513', nid: '269478513' },
      ],
      citations: [
        { id: 'nidw_rules_r3', act: 'NID Wing Rules', section: 'Rule 3', title: 'Format of National Identity Number' },
      ],
      highlight: { docType: 'nid' },
    },
  ],
  memo: [
    {
      id: 'memo-b-1',
      heading: 'Vetting Memorandum',
      headingBn: 'যাচাই স্মারক',
      body: 'This memorandum documents the vetting of three documents submitted for the property transfer at Mouza Charbata. Three defects have been identified.',
      bodyBn: 'এই স্মারক মৌজা চরবাটায় সম্পত্তি হস্তান্তরের জন্য জমা দেওয়া তিনটি দলিলের যাচাই নথিভুক্ত করে। তিনটি ত্রুটি চিহ্নিত করা হয়েছে।',
      citations: [],
    },
    {
      id: 'memo-b-2',
      heading: 'Defect 1: Plot Identity Mismatch',
      headingBn: 'ত্রুটি ১: প্লট পরিচয় অমিল',
      body: 'The Dag number in the Saf Kabala deed (412) does not match the RS Khatian record (421). This discrepancy must be resolved before the transfer can proceed. A transposition error (412 vs 421) or a reference to the wrong plot is possible.',
      bodyBn: 'সাফ কবলা দলিলের দাগ নম্বর (৪১২) আরএস খতিয়ান রেকর্ডের (৪২১) সাথে মিলছে না। হস্তান্তর এগিয়ে যাওয়ার আগে এই অসঙ্গতি সমাধান করতে হবে।',
      citations: [
        { id: 'tpa_1882_s54', act: 'Transfer of Property Act, 1882', section: 'Section 54', title: 'Sale defined' },
        { id: 'lcpra_2023_s5', act: 'Land Crime Prevention & Remedy Act, 2023', section: 'Section 5', title: 'Offences relating to falsification of land records' },
      ],
    },
    {
      id: 'memo-b-3',
      heading: 'Defect 2: Late Registration',
      headingBn: 'ত্রুটি ২: বিলম্বিত নিবন্ধন',
      body: 'The deed was executed on 15 January 2024 and registered on 30 May 2024, a lag of 135 days. Section 23 of the Registration Act, 1908 requires presentation within four months of execution. This deadline has been exceeded by approximately 15 days.',
      bodyBn: 'দলিলটি ১৫ জানুয়ারি ২০২৪ তারিখে সম্পাদিত এবং ৩০ মে ২০২৪ তারিখে নিবন্ধিত হয়েছে, ১৩৫ দিনের ব্যবধান। নিবন্ধন আইন, ১৯০৮ এর ধারা ২৩ সম্পাদনের চার মাসের মধ্যে উপস্থাপন আবশ্যক করে।',
      citations: [
        { id: 'reg_act_1908_s23', act: 'Registration Act, 1908', section: 'Section 23', title: 'Time for presenting documents' },
      ],
    },
    {
      id: 'memo-b-4',
      heading: 'Defect 3: Invalid NID Format',
      headingBn: 'ত্রুটি ৩: অবৈধ জাতীয় পরিচয়পত্র বিন্যাস',
      body: 'The buyer\'s NID number (269478513) contains only 9 digits. Valid National Identity Numbers under NIDW Rules must be 10, 13 or 17 digits. This NID should be re-verified with the NID Wing database.',
      bodyBn: 'ক্রেতার জাতীয় পরিচয়পত্র নম্বরে (২৬৯৪৭৮৫১৩) মাত্র ৯ সংখ্যা আছে। NIDW নিয়ম অনুযায়ী বৈধ জাতীয় পরিচয় নম্বর ১০, ১৩ বা ১৭ সংখ্যার হতে হবে।',
      citations: [
        { id: 'nidw_rules_r3', act: 'NID Wing Rules', section: 'Rule 3', title: 'Format of National Identity Number' },
      ],
    },
    {
      id: 'memo-b-5',
      heading: 'Conclusion',
      headingBn: 'উপসংহার',
      body: 'Two RED and one AMBER defects identified. The transfer should not proceed until all defects are resolved. The Dag number discrepancy and registration lag require immediate attention.',
      bodyBn: 'দুটি লাল এবং একটি অ্যাম্বার ত্রুটি চিহ্নিত হয়েছে। সকল ত্রুটি সমাধান না হওয়া পর্যন্ত হস্তান্তর এগিয়ে যাওয়া উচিত নয়।',
      citations: [],
    },
  ],
  summary: {
    totalFlags: 3,
    redCount: 2,
    amberCount: 1,
    greenCount: 0,
    discrepancies: 3,
    verdict: 'FLAGGED',
    verdictBn: 'পতাকাঙ্কিত',
  },
};
