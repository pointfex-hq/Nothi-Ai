'use client';

import * as THREE from 'three';

/**
 * Procedural 2048px High-Resolution Paper Textures for authentic Bangladeshi Registry Documents.
 * Supports Packet A (Clean compliant) and Packet B (3 planted defects).
 */

export function createDocumentTexture(
  type: 'deed' | 'khatian' | 'nid',
  packet: 'A' | 'B' = 'B'
): THREE.CanvasTexture {
  if (typeof document === 'undefined') {
    return new THREE.CanvasTexture({} as HTMLCanvasElement);
  }

  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 2896; // 2K High-DPI A4 Aspect
  const ctx = canvas.getContext('2d')!;

  if (type === 'deed') {
    // ════════════════════════════════════════════════════════════════
    // 1. SAF KABALA DEED (সাফ কবলা বিক্রয় দলিল)
    // ════════════════════════════════════════════════════════════════
    // Aged ivory parchment base
    ctx.fillStyle = '#f8f4ec';
    ctx.fillRect(0, 0, 2048, 2896);

    // Subtle paper fibrous grain
    ctx.fillStyle = 'rgba(70, 50, 30, 0.03)';
    for (let i = 0; i < 9000; i++) {
      ctx.fillRect(Math.random() * 2048, Math.random() * 2896, 3, 3);
    }

    // Official Double Registry Ledger Border
    ctx.strokeStyle = '#1b4332';
    ctx.lineWidth = 10;
    ctx.strokeRect(60, 60, 1928, 2776);

    ctx.strokeStyle = '#b08d57';
    ctx.lineWidth = 4;
    ctx.strokeRect(84, 84, 1880, 2728);

    // ── 100 TAKA NON-JUDICIAL REVENUE STAMP HEADBAND ─────────────
    ctx.fillStyle = '#1b4332';
    ctx.fillRect(400, 120, 1248, 170);

    ctx.fillStyle = '#f5f0e8';
    ctx.font = 'bold 54px "Lora", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('গণপ্রজাতন্ত্রী বাংলাদেশ সরকার', 1024, 215);

    ctx.font = 'bold 36px "Inter", sans-serif';
    ctx.fillStyle = '#d4b483';
    ctx.fillText('১০০ টাকা • অ-বিচারিক স্ট্যাম্প (NON-JUDICIAL STAMP)', 1024, 260);

    // Sub-Registry Seal & Deed Header
    ctx.fillStyle = '#1a1a18';
    ctx.font = 'bold 50px "Lora", Georgia, serif';
    ctx.fillText('সাফ কবলা জমি বিক্রয় দলিল (SAF KABALA DEED)', 1024, 380);

    ctx.font = '32px monospace';
    ctx.fillStyle = '#4a4a45';
    ctx.fillText('দলিল নং: ১০৪৯২/২০২৪ • সাব-রেজিস্ট্রারের কার্যালয়, ঢাকা সদর', 1024, 440);

    ctx.strokeStyle = '#c9c0b0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(140, 480);
    ctx.lineTo(1908, 480);
    ctx.stroke();

    // Simulated deed legal clauses (fine script)
    ctx.fillStyle = '#3a3a36';
    for (let y = 540; y < 1450; y += 46) {
      const lineLen = 1700 * (0.84 + Math.sin(y * 0.08) * 0.15);
      ctx.fillRect(160, y, lineLen, 6);
    }

    // ── KEY FIELD BADGE: DAG NO. 412 (DEED SCHEDULE PLOT) ────────
    ctx.fillStyle = 'rgba(45, 106, 79, 0.12)';
    ctx.fillRect(160, 1540, 820, 230);
    ctx.strokeStyle = '#2d6a4f';
    ctx.lineWidth = 6;
    ctx.strokeRect(160, 1540, 820, 230);

    ctx.fillStyle = '#1b4332';
    ctx.font = 'bold 34px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('● SCHEDULE PLOT (তফসিল দাগ)', 200, 1610);
    ctx.font = 'bold 64px monospace';
    ctx.fillText('DAG NO: 412', 200, 1710);

    // ── KEY FIELD BADGE: KHATIAN NO. 1087 ────────────────────────
    ctx.fillStyle = 'rgba(176, 141, 87, 0.15)';
    ctx.fillRect(1040, 1540, 840, 230);
    ctx.strokeStyle = '#b08d57';
    ctx.lineWidth = 6;
    ctx.strokeRect(1040, 1540, 840, 230);

    ctx.fillStyle = '#b08d57';
    ctx.font = 'bold 34px monospace';
    ctx.fillText('● KHATIAN REFERENCE (খতিয়ান)', 1080, 1610);
    ctx.font = 'bold 64px monospace';
    ctx.fillText('KHATIAN: 1087', 1080, 1710);

    // ── REGISTRATION TIME LAG BOX ────────────────────────────────
    if (packet === 'B') {
      // Planted Defect: 135 days lag (> 4 months limit under Sec. 23)
      ctx.fillStyle = 'rgba(192, 57, 43, 0.10)';
      ctx.fillRect(160, 1840, 1720, 210);
      ctx.strokeStyle = '#c0392b';
      ctx.lineWidth = 4;
      ctx.strokeRect(160, 1840, 1720, 210);

      ctx.fillStyle = '#c0392b';
      ctx.font = 'bold 38px monospace';
      ctx.fillText('▲ EXECUTION: 15-01-2024  →  REGISTRATION: 30-05-2024 (135 DAYS)', 200, 1920);
      ctx.font = 'bold 30px "Inter", sans-serif';
      ctx.fillText('CRITICAL DEFECT: EXCEEDS 4-MONTH STATUTORY LIMIT (SEC. 23 REGISTRATION ACT 1908)', 200, 1990);
    } else {
      // Packet A: Compliant execution & registration within 28 days
      ctx.fillStyle = 'rgba(39, 134, 74, 0.10)';
      ctx.fillRect(160, 1840, 1720, 210);
      ctx.strokeStyle = '#27864a';
      ctx.lineWidth = 4;
      ctx.strokeRect(160, 1840, 1720, 210);

      ctx.fillStyle = '#27864a';
      ctx.font = 'bold 38px monospace';
      ctx.fillText('✓ EXECUTION: 15-01-2024  →  REGISTRATION: 12-02-2024 (28 DAYS)', 200, 1920);
      ctx.font = 'bold 30px "Inter", sans-serif';
      ctx.fillText('COMPLIANT: PRESENTED WITHIN 4 MONTHS UNDER SEC. 23 REGISTRATION ACT 1908', 200, 1990);
    }

    // Parties Box
    ctx.fillStyle = '#2c2420';
    ctx.font = '32px "Inter", sans-serif';
    ctx.fillText('বিক্রেতা (Seller): রফিকুল ইসলাম (Rafiqul Islam) • NID: 1985269478513', 200, 2150);
    ctx.fillText('ক্রেতা (Buyer): মোহাম্মদ হাসান (Mohammad Hasan)', 200, 2220);
    ctx.fillText('মৌজা: চরবাটা • জে.এল নং: ৪৫ • হস্তান্তর পরিমাণ: ২০ শতক', 200, 2290);

    // Official Brass Sub-Registry Seal Embellishment
    ctx.strokeStyle = '#b08d57';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(1620, 2560, 160, 0, Math.PI * 2);
    ctx.stroke();

    ctx.font = 'bold 30px monospace';
    ctx.fillStyle = '#b08d57';
    ctx.textAlign = 'center';
    ctx.fillText('SUB-REGISTRY DHAKA', 1620, 2540);
    ctx.fillText('REGISTRATION SEAL', 1620, 2590);

  } else if (type === 'khatian') {
    // ════════════════════════════════════════════════════════════════
    // 2. RS KHATIAN RECORD OF RIGHTS (আরএস খতিয়ান স্বত্বলিপি)
    // ════════════════════════════════════════════════════════════════
    ctx.fillStyle = '#faf6ef';
    ctx.fillRect(0, 0, 2048, 2896);

    ctx.fillStyle = 'rgba(60, 45, 30, 0.025)';
    for (let i = 0; i < 9000; i++) {
      ctx.fillRect(Math.random() * 2048, Math.random() * 2896, 3, 3);
    }

    // Ledger outer double-rule border
    ctx.strokeStyle = '#2d6a4f';
    ctx.lineWidth = 10;
    ctx.strokeRect(60, 60, 1928, 2776);

    ctx.strokeStyle = '#b08d57';
    ctx.lineWidth = 4;
    ctx.strokeRect(84, 84, 1880, 2728);

    // Header headband
    ctx.fillStyle = '#1b4332';
    ctx.fillRect(400, 120, 1248, 170);

    ctx.fillStyle = '#f5f0e8';
    ctx.font = 'bold 50px "Lora", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('বাংলাদেশ ফরম নং ৫৪৬৩ • খতিয়ান স্বত্বলিপি', 1024, 215);

    ctx.font = 'bold 34px "Inter", sans-serif';
    ctx.fillStyle = '#d4b483';
    ctx.fillText('কালেক্টরেট স্বত্ব সংরক্ষণ রেকর্ড (RECORD OF RIGHTS)', 1024, 260);

    ctx.fillStyle = '#1a1a18';
    ctx.font = 'bold 52px "Lora", Georgia, serif';
    ctx.fillText('আরএস খতিয়ান (RS KHATIAN RECORD)', 1024, 380);

    ctx.font = '36px monospace';
    ctx.fillStyle = '#4a4a45';
    ctx.fillText('মৌজা: চরবাটা • জে.এল নং: ৪৫ • খতিয়ান নং: ১০৮৭', 1024, 450);

    // Table Grid
    ctx.strokeStyle = '#1a1a18';
    ctx.lineWidth = 5;
    ctx.strokeRect(140, 520, 1768, 1750);

    // Table Header Row
    ctx.fillStyle = '#e8dfd0';
    ctx.fillRect(140, 520, 1768, 160);
    ctx.beginPath();
    ctx.moveTo(140, 680);
    ctx.lineTo(1908, 680);
    ctx.stroke();

    ctx.fillStyle = '#1a1a18';
    ctx.font = 'bold 36px "Lora", Georgia, serif';
    ctx.textAlign = 'left';
    ctx.fillText('মালিকের নাম ও অংশ (Proprietor)', 180, 620);
    ctx.fillText('দাগ নম্বর (Dag No.)', 980, 620);
    ctx.fillText('জমির শ্রেণি ও পরিমাণ', 1460, 620);

    // Column Dividers
    ctx.beginPath();
    ctx.moveTo(940, 520);
    ctx.lineTo(940, 2270);
    ctx.moveTo(1420, 520);
    ctx.lineTo(1420, 2270);
    ctx.stroke();

    // Row 1 - Proprietor
    ctx.font = '40px "Inter", sans-serif';
    ctx.fillText('আব্দুল করিম (Abdul Karim)', 180, 780);
    ctx.font = '30px "Inter", sans-serif';
    ctx.fillStyle = '#4a4a45';
    ctx.fillText('পিতা: ফজলুল হক • অংশ: ১.০০০', 180, 850);
    ctx.fillText('ঠিকানা: চরবাটা, ঢাকা সদর', 180, 910);

    // ── PLANTED DEFECT VS COMPLIANT DAG NO. ──────────────────────
    if (packet === 'B') {
      // Packet B: Planted mismatch DAG 421 (doesn't match Deed Dag 412)
      ctx.fillStyle = 'rgba(192, 57, 43, 0.18)';
      ctx.fillRect(960, 710, 440, 260);
      ctx.strokeStyle = '#c0392b';
      ctx.lineWidth = 6;
      ctx.strokeRect(960, 710, 440, 260);

      ctx.fillStyle = '#c0392b';
      ctx.font = 'bold 72px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('DAG 421', 1180, 840);
      ctx.font = 'bold 28px "Inter", sans-serif';
      ctx.fillText('▲ MISMATCH WITH DEED (412)', 1180, 920);
    } else {
      // Packet A: Compliant DAG 412 (matches Deed Dag 412)
      ctx.fillStyle = 'rgba(39, 134, 74, 0.16)';
      ctx.fillRect(960, 710, 440, 260);
      ctx.strokeStyle = '#27864a';
      ctx.lineWidth = 6;
      ctx.strokeRect(960, 710, 440, 260);

      ctx.fillStyle = '#27864a';
      ctx.font = 'bold 72px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('DAG 412', 1180, 840);
      ctx.font = 'bold 28px "Inter", sans-serif';
      ctx.fillText('✓ EXACT DEED PARITY', 1180, 920);
    }

    // Land Details
    ctx.fillStyle = '#1a1a18';
    ctx.font = '38px "Inter", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('শ্রেণি: ধানী (Agricultural)', 1460, 780);
    ctx.font = '34px monospace';
    ctx.fillText('পরিমাণ: ২০ শতক', 1460, 850);
    ctx.fillText('(0.2000 Acre)', 1460, 910);

    // Official Collectorate Verification Box
    ctx.strokeStyle = '#2d6a4f';
    ctx.lineWidth = 6;
    ctx.strokeRect(200, 2380, 750, 260);
    ctx.fillStyle = '#2d6a4f';
    ctx.font = 'bold 36px "Lora", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('কালেক্টরেট রেকর্ড শাখা • ঢাকা', 575, 2480);
    ctx.font = '28px monospace';
    ctx.fillText('RECORD VERIFIED & SEALED • 2024', 575, 2550);

  } else {
    // ════════════════════════════════════════════════════════════════
    // 3. NATIONAL ID SMART CARD (জাতীয় পরিচয়পত্র)
    // ════════════════════════════════════════════════════════════════
    ctx.fillStyle = '#faf8f2';
    ctx.fillRect(0, 0, 2048, 2896);

    // Card border
    ctx.strokeStyle = '#1b4332';
    ctx.lineWidth = 10;
    ctx.strokeRect(60, 60, 1928, 2776);

    ctx.strokeStyle = '#b08d57';
    ctx.lineWidth = 4;
    ctx.strokeRect(84, 84, 1880, 2728);

    // Green Flag Headband
    ctx.fillStyle = '#1b4332';
    ctx.fillRect(120, 120, 1808, 240);

    ctx.fillStyle = '#faf7f2';
    ctx.font = 'bold 56px "Lora", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText("Government of the People's Republic of Bangladesh", 1024, 220);

    ctx.font = 'bold 42px "Inter", sans-serif';
    ctx.fillStyle = '#d4b483';
    ctx.fillText('National ID Card / জাতীয় পরিচয়পত্র', 1024, 300);

    // Photo Box
    ctx.fillStyle = '#d9d0c1';
    ctx.fillRect(180, 480, 520, 680);
    ctx.strokeStyle = '#998d78';
    ctx.lineWidth = 6;
    ctx.strokeRect(180, 480, 520, 680);

    ctx.fillStyle = '#4a4a45';
    ctx.font = 'bold 110px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('👤', 440, 820);
    ctx.font = 'bold 34px monospace';
    ctx.fillText('OFFICIAL PORTRAIT', 440, 930);

    // Holder Details
    ctx.textAlign = 'left';
    ctx.fillStyle = '#1a1a18';
    ctx.font = 'bold 64px "Lora", Georgia, serif';
    ctx.fillText('মোহাম্মদ হাসান (Mohammad Hasan)', 760, 580);

    ctx.font = '40px "Inter", sans-serif';
    ctx.fillStyle = '#3a3a35';
    ctx.fillText('Father: Rafiqul Islam (রফিকুল ইসলাম)', 760, 680);
    ctx.fillText('Mother: Jahanara Begum (জাহানারা বেগম)', 760, 770);
    ctx.fillText('Date of Birth: 12 Aug 1985', 760, 860);
    ctx.fillText('Blood Group: B+ Positive', 760, 950);

    // ── NID NUMBER: PACKET B (9 DIGITS DEFECT) VS PACKET A (10 DIGITS SMART) ──
    if (packet === 'B') {
      ctx.fillStyle = 'rgba(212, 160, 23, 0.16)';
      ctx.fillRect(760, 1040, 1140, 260);
      ctx.strokeStyle = '#d4a017';
      ctx.lineWidth = 6;
      ctx.strokeRect(760, 1040, 1140, 260);

      ctx.fillStyle = '#b7791f';
      ctx.font = 'bold 36px monospace';
      ctx.fillText('◆ NID NUMBER (INVALID LENGTH)', 800, 1120);
      ctx.font = 'bold 74px monospace';
      ctx.fillText('269478513 (9 Digits)', 800, 1230);
      ctx.font = 'bold 28px "Inter", sans-serif';
      ctx.fillText('▲ AMBER DEFECT: REQUIRES 10, 13 OR 17 DIGITS UNDER NIDW RULES', 800, 1275);
    } else {
      ctx.fillStyle = 'rgba(39, 134, 74, 0.14)';
      ctx.fillRect(760, 1040, 1140, 260);
      ctx.strokeStyle = '#27864a';
      ctx.lineWidth = 6;
      ctx.strokeRect(760, 1040, 1140, 260);

      ctx.fillStyle = '#27864a';
      ctx.font = 'bold 36px monospace';
      ctx.fillText('✓ NID NUMBER (SMART CARD STANDARD)', 800, 1120);
      ctx.font = 'bold 74px monospace';
      ctx.fillText('2694785130 (10 Digits)', 800, 1230);
      ctx.font = 'bold 28px "Inter", sans-serif';
      ctx.fillText('COMPLIANT: 10-DIGIT SMART CARD RECOGNIZED UNDER RULE 3 NIDW', 800, 1275);
    }

    // Smart chip graphic
    ctx.fillStyle = '#c5a059';
    ctx.fillRect(180, 1360, 280, 200);
    ctx.strokeStyle = '#8d7037';
    ctx.lineWidth = 6;
    ctx.strokeRect(180, 1360, 280, 200);

    ctx.fillStyle = '#4a4a45';
    ctx.font = 'bold 30px monospace';
    ctx.fillText('ELECTION COMMISSION BANGLADESH • NIDW PROTOCOL', 180, 1680);
    ctx.fillText('DIGITAL CITIZEN VERIFICATION STANDARD', 180, 1740);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 16;
  return texture;
}

/**
 * Creates authentic inked rubber stamp impression texture
 */
export function createStampMarkTexture(packet: 'A' | 'B' = 'B'): THREE.CanvasTexture {
  if (typeof document === 'undefined') {
    return new THREE.CanvasTexture({} as HTMLCanvasElement);
  }

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 512, 512);

  const isB = packet === 'B';
  const color = isB ? '#c0392b' : '#1b4332';
  const center = 256;

  // Outer thick serrated circle
  ctx.strokeStyle = color;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(center, center, 230, 0, Math.PI * 2);
  ctx.stroke();

  // Fine inner ring
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(center, center, 210, 0, Math.PI * 2);
  ctx.stroke();

  // Subtle ink splatter / rubber grain texture
  ctx.fillStyle = color;
  for (let i = 0; i < 600; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * 210;
    const x = center + Math.cos(angle) * r;
    const y = center + Math.sin(angle) * r;
    ctx.fillRect(x, y, 2, 2);
  }

  // Top Curved Header
  ctx.font = 'bold 22px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('• SUB-REGISTRY OFFICE DHAKA •', center, 110);

  // Divider lines
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(70, 150);
  ctx.lineTo(442, 150);
  ctx.moveTo(70, 360);
  ctx.lineTo(442, 360);
  ctx.stroke();

  // Center bold stamp text
  ctx.font = '900 68px "Lora", Georgia, serif';
  ctx.fillText(isB ? 'FLAGGED' : 'VERIFIED', center, 240);

  // Sub-center metric
  ctx.font = 'bold 30px monospace';
  ctx.fillText(isB ? '2 RED + 1 AMBER' : 'ALL GREEN', center, 310);

  // Bottom footer text
  ctx.font = 'bold 20px monospace';
  ctx.fillText(isB ? 'STATUTORY DEFECTS FOUND' : 'PARITY FULLY CONFIRMED', center, 410);
  ctx.font = '16px monospace';
  ctx.fillText('NOTHI AI VETTING MEMO • 2024', center, 440);

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 8;
  return texture;
}
