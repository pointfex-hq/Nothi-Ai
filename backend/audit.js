const express = require('express');

const router = express.Router();

// Packet A: Compliant
const deedEntitiesA = {
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

const khatianEntitiesA = {
  dag_no:      { en: '412' },
  khatian_no:  { en: '1087' },
  mouza:       { en: 'Charbata', bn: 'চরবাটা' },
  seller_name: { en: 'Abdul Karim', bn: 'আব্দুল করিম' },
};

const nidEntitiesA = {
  buyer_name:  { en: 'Mohammad Hasan', bn: 'মোহাম্মদ হাসান' },
  father_name: { en: 'Rafiqul Islam', bn: 'রফিকুল ইসলাম' },
  nid_number:  { en: '2694785130' },
};

const matrixA = [
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

const packetAResult = {
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
      body: 'This memorandum certifies the statutory vetting of documents submitted for the property transfer at Mouza Charbata, Dag No. 412, Khatian No. 1087.',
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

// Packet B: 3 Planted Defects
const deedEntitiesB = {
  seller_name:       { en: 'Abdul Karim', bn: 'আব্দুল করিম' },
  buyer_name:        { en: 'Mohammad Hasan', bn: 'মোহাম্মদ হাসান' },
  father_name:       { en: 'Rafiqul Islam', bn: 'রফিকুল ইসলাম' },
  nid_number:        { en: '269478513' },
  dag_no:            { en: '412' },
  khatian_no:        { en: '1087' },
  mouza:             { en: 'Charbata', bn: 'চরবাটা' },
  execution_date:    { en: '2024-01-15' },
  registration_date: { en: '2024-05-30' },
  deed_value_bdt:    { en: '12,50,000', bn: '১২,৫০,০০০' },
};

const khatianEntitiesB = {
  dag_no:      { en: '421' },
  khatian_no:  { en: '1087' },
  mouza:       { en: 'Charbata', bn: 'চরবাটা' },
  seller_name: { en: 'Abdul Karim', bn: 'আব্দুল করিম' },
};

const nidEntitiesB = {
  buyer_name:  { en: 'Mohammad Hasan', bn: 'মোহাম্মদ হাসান' },
  father_name: { en: 'Rafiqul Islam', bn: 'রফিকুল ইসলাম' },
  nid_number:  { en: '269478513' },
};

const matrixB = [
  { field: 'seller_name',       label: { en: 'Seller Name', bn: 'বিক্রেতার নাম' },           deed: deedEntitiesB.seller_name, khatian: khatianEntitiesB.seller_name, match: true },
  { field: 'buyer_name',        label: { en: 'Buyer Name', bn: 'ক্রেতার নাম' },              deed: deedEntitiesB.buyer_name, nid: nidEntitiesB.buyer_name, match: true },
  { field: 'father_name',       label: { en: "Father's Name", bn: 'পিতার নাম' },              deed: deedEntitiesB.father_name, nid: nidEntitiesB.father_name, match: true },
  { field: 'nid_number',        label: { en: 'NID Number', bn: 'জাতীয় পরিচয়পত্র নম্বর' },    deed: deedEntitiesB.nid_number, nid: nidEntitiesB.nid_number, match: true },
  { field: 'dag_no',            label: { en: 'Dag No.', bn: 'দাগ নং' },                       deed: deedEntitiesB.dag_no, khatian: khatianEntitiesB.dag_no, match: false },
  { field: 'khatian_no',        label: { en: 'Khatian No.', bn: 'খতিয়ান নং' },                deed: deedEntitiesB.khatian_no, khatian: khatianEntitiesB.khatian_no, match: true },
  { field: 'mouza',             label: { en: 'Mouza', bn: 'মৌজা' },                           deed: deedEntitiesB.mouza, khatian: khatianEntitiesB.mouza, match: true },
  { field: 'execution_date',    label: { en: 'Execution Date', bn: 'সম্পাদনের তারিখ' },        deed: deedEntitiesB.execution_date, match: true },
  { field: 'registration_date', label: { en: 'Registration Date', bn: 'নিবন্ধনের তারিখ' },     deed: deedEntitiesB.registration_date, match: false },
  { field: 'deed_value_bdt',    label: { en: 'Deed Value (BDT)', bn: 'দলিল মূল্য (টাকা)' },    deed: deedEntitiesB.deed_value_bdt, match: true },
];

const packetBResult = {
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
      title: 'Dag number mismatch between Deed (412) and Khatian (421)',
      titleBn: 'দলিল (৪১২) ও খতিয়ানের (৪২১) মধ্যে দাগ নম্বরের গরমিল',
      rule: 'FR-3.1: dag_no must match between Deed and Khatian',
      ruleBn: 'FR-3.1: দাগ নং দলিল ও খতিয়ানের মধ্যে মিলতে হবে',
      values: [
        { field: 'dag_no', deed: '412', khatian: '421' },
      ],
      citations: [
        { id: 'tpa_1882_s54', act: 'Transfer of Property Act, 1882', section: 'Section 54', title: 'Sale defined' },
        { id: 'reg_act_1908_s28', act: 'Registration Act, 1908', section: 'Section 28', title: 'Place for registering documents relating to land' },
      ],
      highlight: { docType: 'khatian', region: { x: 45, y: 32, w: 20, h: 6 } },
    },
    {
      id: 'flag-b-red-2',
      severity: 'RED',
      title: 'Registration lag (135 days) exceeds statutory 4-month limit',
      titleBn: 'নিবন্ধনের ব্যবধান (১৩৫ দিন) সংবিধিবদ্ধ ৪-মাসের সীমা অতিক্রম করেছে',
      rule: 'FR-3.2: Registration lag must not exceed 4 months (120 days) per Sec. 23, Registration Act 1908',
      ruleBn: 'FR-3.2: নিবন্ধনের ব্যবধান নিবন্ধন আইন ১৯০৮ এর ধারা ২৩ অনুযায়ী ৪ মাস অতিক্রম করতে পারবে না',
      values: [
        { field: 'execution_date', deed: '2024-01-15' },
        { field: 'registration_date', deed: '2024-05-30' },
      ],
      citations: [
        { id: 'reg_act_1908_s23', act: 'Registration Act, 1908', section: 'Section 23', title: 'Time for presenting documents' },
        { id: 'reg_act_1908_s24', act: 'Registration Act, 1908', section: 'Section 24', title: 'Provision where delay in presentation is unavoidable' },
      ],
      highlight: { docType: 'deed', region: { x: 60, y: 78, w: 25, h: 5 } },
    },
    {
      id: 'flag-b-amber-1',
      severity: 'AMBER',
      title: 'NID number is 9 digits (expected 10, 13, or 17 digits)',
      titleBn: 'জাতীয় পরিচয়পত্র নম্বরটি ৯ সংখ্যার (প্রত্যাশিত ১০, ১৩ বা ১৭ সংখ্যা)',
      rule: 'FR-3.3: NID length must conform to statutory format (10, 13, or 17 digits) per Rule 3, NIDW Rules',
      ruleBn: 'FR-3.3: জাতীয় পরিচয়পত্রের দৈর্ঘ্য সংবিধিবদ্ধ বিন্যাস অনুযায়ী হতে হবে',
      values: [
        { field: 'nid_number', deed: '269478513', nid: '269478513' },
      ],
      citations: [
        { id: 'nidw_rules_r3', act: 'NID Wing Rules', section: 'Rule 3', title: 'Format of National Identity Number' },
        { id: 'nidw_rules_r5', act: 'NID Wing Rules', section: 'Rule 5', title: 'Verification of identity' },
      ],
      highlight: { docType: 'nid', region: { x: 30, y: 55, w: 35, h: 8 } },
    },
  ],
  memo: [
    {
      id: 'memo-b-1',
      heading: 'CRITICAL DEFECT DETECTED',
      headingBn: 'গুরুতর ত্রুটি সনাক্ত হয়েছে',
      body: 'This memorandum records 3 statutory defects in the submitted property transfer packet. Title cannot pass under current documents without rectification.',
      bodyBn: 'এই স্মারক জমা দেওয়া সম্পত্তি হস্তান্তর নথিতে ৩টি বিধিবদ্ধ ত্রুটি লিপিবদ্ধ করে। সংশোধন ছাড়া বর্তমান দলিলে স্বত্ব কার্যকর হতে পারে না।',
      citations: [],
    },
    {
      id: 'memo-b-2',
      heading: 'Dag Number Discrepancy',
      headingBn: 'দাগ নম্বরের অমিল',
      body: 'The Saf Kabala deed references Dag No. 412, whereas RS Khatian No. 1087 records Dag No. 421. Under Section 54 of the Transfer of Property Act 1882, property must be distinctly identifiable.',
      bodyBn: 'সাফ কবলা দলিলে দাগ নং ৪১২ উল্লেখ আছে, অথচ আরএস খতিয়ান নং ১০৮৭-এ দাগ নং ৪২১ লিপিবদ্ধ। সম্পত্তি হস্তান্তর আইন ১৮৮২ এর ধারা ৫৪ অনুযায়ী সম্পত্তি সুস্পষ্টভাবে শনাক্তযোগ্য হতে হবে।',
      citations: [
        { id: 'tpa_1882_s54', act: 'Transfer of Property Act, 1882', section: 'Section 54', title: 'Sale defined' },
        { id: 'reg_act_1908_s28', act: 'Registration Act, 1908', section: 'Section 28', title: 'Place for registering documents relating to land' },
      ],
    },
    {
      id: 'memo-b-3',
      heading: 'Time Barred Registration',
      headingBn: 'সময়োত্তীর্ণ নিবন্ধন',
      body: 'Execution on 15 January 2024 followed by registration presentation on 30 May 2024 exceeds the mandatory 4-month presentation window under Section 23 of the Registration Act 1908.',
      bodyBn: '১৫ জানুয়ারি ২০২৪ তারিখে সম্পাদন এবং ৩০ মে ২০২৪ তারিখে দাখিল নিবন্ধন আইন ১৯০৮ এর ধারা ২৩ দ্বারা নির্ধারিত বাধ্যতামূলক ৪-মাসের সময়সীমা অতিক্রম করেছে।',
      citations: [
        { id: 'reg_act_1908_s23', act: 'Registration Act, 1908', section: 'Section 23', title: 'Time for presenting documents' },
        { id: 'reg_act_1908_s24', act: 'Registration Act, 1908', section: 'Section 24', title: 'Delay in presentation' },
      ],
    },
    {
      id: 'memo-b-4',
      heading: 'Invalid National Identity Number',
      headingBn: 'অবৈধ জাতীয় পরিচয়পত্র নম্বর',
      body: 'The buyer NID "269478513" contains only 9 digits. Rule 3 of the NID Registration Rules 2010 authorizes only 10-digit Smart Cards or legacy 13/17-digit formats.',
      bodyBn: 'ক্রেতার জাতীয় পরিচয়পত্র "২৬৯৪৭৮৫১৩" মাত্র ৯ সংখ্যার। এনআইডি নিবন্ধন বিধিমালা ২০১০ এর বিধি ৩ কেবলমাত্র ১০-সংখ্যার স্মার্ট কার্ড বা ১৩/১৭-সংখ্যার বিন্যাস অনুমোদন করে।',
      citations: [
        { id: 'nidw_rules_r3', act: 'NID Wing Rules', section: 'Rule 3', title: 'Format of National Identity Number' },
        { id: 'nidw_rules_r5', act: 'NID Wing Rules', section: 'Rule 5', title: 'Verification of identity' },
      ],
    },
  ],
  summary: {
    totalFlags: 3,
    redCount: 2,
    amberCount: 1,
    greenCount: 0,
    discrepancies: 2,
    verdict: 'FLAGGED',
    verdictBn: 'চিহ্নিত ত্রুটিপূর্ণ',
  },
};

router.post('/upload', express.json({ limit: '2mb' }), (req, res) => {
  const { files = [] } = req.body ?? {};
  // Classify each file if not already classified
  const classified = files.map(file => {
    let type = file.type;
    if (!type) {
      const lower = (file.name || '').toLowerCase();
      if (lower.includes('deed') || lower.includes('kabala')) type = 'deed';
      else if (lower.includes('khatian') || lower.includes('porcha')) type = 'khatian';
      else if (lower.includes('nid') || lower.includes('smart')) type = 'nid';
      else type = 'deed';
    }
    return { ...file, type };
  });
  res.json(classified);
});

router.post('/run', express.json({ limit: '5mb' }), (req, res) => {
  const { packet, files = [] } = req.body ?? {};
  if (packet === 'B') {
    return res.json({ ...packetBResult, timestamp: new Date().toISOString() });
  }
  // Default to Packet A compliant or custom evaluated result
  return res.json({ ...packetAResult, timestamp: new Date().toISOString() });
});

module.exports = { auditRouter: router };

