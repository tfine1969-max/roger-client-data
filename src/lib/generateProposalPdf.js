import jsPDF from 'jspdf';
import { ADVISORS } from '@/lib/constants';

// ─── Brand colours ────────────────────────────────────────────────────────────
const NAVY   = [27, 58, 92];    // #1B3A5C
const WHITE  = [255, 255, 255];
const MUTED  = [120, 140, 160];
const BORDER = [210, 220, 230];
const BG     = [245, 248, 251];
const GOLD   = [196, 151, 58];
const TEAL   = [74, 155, 175];

// ─── Page layout ──────────────────────────────────────────────────────────────
const PW       = 210;
const PH       = 297;
const ML       = 18;
const MR       = 18;
const CW       = PW - ML - MR;
const HEADER_H = 22;
const FOOTER_H = 14;
const TOP_Y    = HEADER_H + 8;
const BOT_Y    = PH - FOOTER_H - 6;

const LOGO_URL = 'https://media.base44.com/images/public/69e88c566cc0939ea06624c2/48ec7b9f6_logo.png';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(v) {
  if (!v) return '—';
  const d = new Date(v);
  if (isNaN(d)) return String(v);
  return `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;
}

function fmtNum(v, cur = 'R') {
  if (!v && v !== 0) return '—';
  const n = parseFloat(String(v).replace(/[^0-9.]/g, ''));
  if (isNaN(n)) return String(v);
  return `${cur} ${n.toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtPct(v) {
  if (v === undefined || v === null || v === '') return '—';
  return `${v}%`;
}

function orDash(v) { return v || '—'; }

function capitalise(s) {
  if (!s) return '—';
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

// ─── Header (called on every page after it is created) ────────────────────────
function addHeader(doc, logoDataUrl) {
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PW, HEADER_H, 'F');
  if (logoDataUrl) {
    try { doc.addImage(logoDataUrl, 'PNG', PW - MR - 38, 2, 38, 18); } catch (_) {}
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...WHITE);
  doc.text('Financial Proposal', ML, 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(180, 200, 220);
  doc.text('Wealth Works (Pty) Ltd  |  FSP 28337  |  Wealthworks Investments (Pty) Ltd  |  FSP 45624', ML, 17);
}

// ─── Footer (called during final pass over all pages) ─────────────────────────
function addFooter(doc, pageNum, totalPages) {
  const fy = PH - FOOTER_H + 2;
  doc.setDrawColor(...BORDER);
  doc.line(ML, fy - 1, PW - MR, fy - 1);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(...MUTED);
  doc.text('Wealth Works (Pty) Ltd FSP 28337  |  Wealthworks Investments (Pty) Ltd FSP 45624', ML, fy + 4);
  doc.text(`Page ${pageNum} of ${totalPages}`, PW / 2, fy + 4, { align: 'center' });
  doc.text('Initials: ___________', PW - MR, fy + 4, { align: 'right' });
}

// ─── New page helper ──────────────────────────────────────────────────────────
function newPage(doc, logoDataUrl) {
  doc.addPage();
  addHeader(doc, logoDataUrl);
  return TOP_Y;
}

// ─── Page-break guard ─────────────────────────────────────────────────────────
function pb(doc, y, needed, logoDataUrl) {
  if (y + needed > BOT_Y) return newPage(doc, logoDataUrl);
  return y;
}

// ─── Section heading (navy bar) ───────────────────────────────────────────────
function sectionHead(doc, num, title, y) {
  doc.setFillColor(...NAVY);
  doc.rect(ML, y, CW, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...WHITE);
  doc.text(`${num}.  ${title.toUpperCase()}`, ML + 3, y + 5);
  return y + 11;
}

// ─── Sub-heading ──────────────────────────────────────────────────────────────
function subHead(doc, title, y) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...NAVY);
  doc.text(title.toUpperCase(), ML, y);
  doc.setDrawColor(...TEAL);
  doc.setLineWidth(0.3);
  doc.line(ML, y + 1.5, PW - MR, y + 1.5);
  doc.setLineWidth(0.2);
  return y + 7;
}

// ─── Label / value row ────────────────────────────────────────────────────────
function row(doc, label, value, y, indent = 0) {
  const lx = ML + indent;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text(label, lx, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  const vStr = value || '—';
  const vLines = doc.splitTextToSize(vStr, CW * 0.52);
  doc.text(vLines, ML + CW, y, { align: 'right' });
  return y + (vLines.length > 1 ? vLines.length * 4.2 : 5);
}

// ─── Tick item (replaces checkbox — shows ✓ + label as text) ─────────────────
function tickItem(doc, label, y, indent = 0) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...NAVY);
  doc.text('✓', ML + indent, y);
  doc.text(label, ML + indent + 6, y);
  return y + 5.5;
}

// ─── Wrapped paragraph ────────────────────────────────────────────────────────
function para(doc, text, y, indent = 0, size = 7.5) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(size);
  doc.setTextColor(...NAVY);
  const lines = doc.splitTextToSize(text, CW - indent);
  doc.text(lines, ML + indent, y);
  return y + lines.length * (size * 0.44) + 2;
}

// ─── Advisor signature block ──────────────────────────────────────────────────
function renderAdvisorSig(doc, proposal, advisorName, y) {
  // Render the actual signature image / typed name
  if (proposal.advisor_signature_type === 'draw' && proposal.advisor_signature_data) {
    try {
      doc.addImage(proposal.advisor_signature_data, 'PNG', ML, y, 60, 16);
    } catch (_) {}
    y += 18;
  } else if (proposal.advisor_signature_type === 'type' && proposal.advisor_signature_data) {
    doc.setFont('times', 'italic');
    doc.setFontSize(17);
    doc.setTextColor(...NAVY);
    doc.text(proposal.advisor_signature_data, ML, y + 9);
    y += 15;
  } else {
    // blank line placeholder
    y += 16;
  }
  doc.setDrawColor(...NAVY);
  doc.line(ML, y, ML + 80, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...NAVY);
  doc.text(advisorName, ML, y);
  doc.text(`Date: ${fmtDate(proposal.sign_date)}`, ML + 90, y);
  return y + 8;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DISCLOSURE TEXT
// ═══════════════════════════════════════════════════════════════════════════════
const DISCLOSURE_SECTIONS = [
  {
    title: 'INTRODUCTION',
    body: 'Wealth Works (Pty) Ltd (FSP 28337) and Wealthworks Investments (Pty) Ltd (FSP 45624) are authorised Financial Services Providers in terms of the Financial Advisory and Intermediary Services Act, No. 37 of 2002 (FAIS Act). This disclosure document is provided to you in terms of section 4 of the FAIS General Code of Conduct and contains information you are entitled to receive before we provide you with any financial services.'
  },
  {
    title: 'OUR DETAILS',
    body: 'Wealth Works (Pty) Ltd | FSP 28337 | Category I\nWealthworks Investments (Pty) Ltd | FSP 45624 | Category II\nRegistered Address: The Offices of Hyde Park, 1st Floor, Jan Smuts Avenue, Hyde Park, Johannesburg, 2196\nTelephone: +27 11 325 2750 | Email: info@wealthworks.co.za'
  },
  {
    title: 'KEY INDIVIDUALS',
    body: 'Trevor Fine — Group Managing Director | Key Individual: FSP 28337 & FSP 45624\nRoger Eskinazi — Partner, Cape Town | Representative: FSP 28337\nMalcolm Munsamy — Representative: FSP 28337'
  },
  {
    title: 'COMPLIANCE OFFICER',
    body: 'Our compliance function is managed by an independent compliance officer registered with the Financial Sector Conduct Authority (FSCA). The details of our compliance officer are available on request and are maintained in our compliance register.'
  },
  {
    title: 'SHAREHOLDING',
    body: 'Wealth Works (Pty) Ltd is a privately held company. No shareholding exceeding 10% is held in any product supplier that would constitute a material conflict of interest. Full details of our shareholding structure are available on request.'
  },
  {
    title: 'ACCREDITATION FROM PRODUCT SUPPLIERS',
    body: 'We hold accreditation with the following product suppliers (non-exhaustive): Glacier by Sanlam, Momentum Wealth, Allan Gray, Investec, Prime Investments, Credo Wealth, Julius Baer, PPS Investments, Discovery Life, Hollard, BrightRock. A full and current list of accreditations is available on request.'
  },
  {
    title: 'ADDITIONAL PROFESSIONAL SERVICES',
    body: 'Where we refer you to an attorney, accountant, tax practitioner or other professional, such referral does not constitute advice under FAIS. Any fees payable to such professionals are separate and distinct from our advisory fees and are subject to separate agreement between you and that professional.'
  },
  {
    title: 'CONFLICTS OF INTEREST',
    body: 'We maintain a Conflicts of Interest Management Policy in terms of section 3A of the FAIS General Code of Conduct. A copy of this policy is available on our website and on request. We disclose all material conflicts of interest at the point of advice. We do not receive any consideration or remuneration that would constitute a conflict of interest.'
  },
  {
    title: 'STAFF INCENTIVES, GIFTS AND DONATIONS',
    body: 'Our remuneration practices comply with the FAIS Act and applicable Regulations. We do not pay or receive incentives or gifts that would constitute conflicts of interest. Any gifts received from product suppliers above the threshold prescribed by the FSCA are disclosed in our gifts register, which is available on request.'
  },
  {
    title: 'PRIVACY STATEMENT',
    body: 'We collect and process your personal information to provide financial services, comply with legal obligations and improve our services. Your information is protected in terms of the Protection of Personal Information Act, No. 4 of 2013 (POPIA). We will not share your personal information with third parties without your consent, except where required by law or necessary to render our services. You have the right to access, correct, and object to the processing of your personal information. Please contact our Information Officer for any privacy-related queries.'
  },
  {
    title: 'COMPLAINTS',
    body: 'If you are dissatisfied with our service, you may submit a written complaint to: complaints@wealthworks.co.za. We will acknowledge receipt within 24 hours and endeavour to resolve your complaint within 10 business days. If your complaint remains unresolved, you may escalate it to:\n\nFAIS Ombud: 0860 324 766 | info@faisombud.co.za | www.faisombud.co.za\nFinancial Sector Conduct Authority (FSCA): 0800 202 087 | info@fsca.co.za'
  }
];

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════════════════
export default async function generateProposalPdf(proposal, investments = [], riskProducts = []) {

  // ── Pre-load logo ──────────────────────────────────────────────────────────
  let logoDataUrl = null;
  try {
    const resp = await fetch(LOGO_URL);
    const blob = await resp.blob();
    logoDataUrl = await new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.onerror = rej;
      fr.readAsDataURL(blob);
    });
  } catch (_) {}

  const doc = new jsPDF('p', 'mm', 'a4');
  const clientName  = proposal.client_name || '—';
  const advisorObj  = ADVISORS[proposal.advisor_key] || ADVISORS.trevor;
  const advisorName = proposal.advisor_name || advisorObj.name;

  // ── Pull financial profile data, checking multiple possible locations ──────
  const oid = proposal.onboarding_import_data || {};
  const incomeBand      = proposal.gross_annual_income_band      || oid.gross_annual_income_band      || '—';
  const netWorthBand    = proposal.net_worth_band                || oid.net_worth_band                || '—';
  const monthlySurplus  = proposal.monthly_investable_surplus    || oid.monthly_investable_surplus    || '—';
  const liquidityReq    = proposal.client_liquidity_needs        || oid.liquidity_requirement         || '—';
  const rawSourceFunds  = proposal.source_of_funds               || oid.source_of_funds               || [];
  const sourceFundsArr  = Array.isArray(rawSourceFunds) ? rawSourceFunds : [String(rawSourceFunds)];
  const sourceFundsStr  = sourceFundsArr.length > 0 ? sourceFundsArr.join(', ') : 'Investment Proceeds';

  // ── Advisory needs ────────────────────────────────────────────────────────
  const advisory  = Array.isArray(proposal.advisory_needs) ? proposal.advisory_needs.map(n => n.toLowerCase()) : [];
  const needsArr  = Array.isArray(proposal.needs_array)    ? proposal.needs_array    : [];
  const isEntity  = ['company','trust','Company','Trust'].includes(proposal.client_type);
  const clientTypeLabel = isEntity
    ? capitalise(proposal.client_type)
    : 'Individual';

  // ── Mandate flag ──────────────────────────────────────────────────────────
  const mandateIncluded = proposal.mandate_included === 'Yes';

  // ════════════════════════════════════════════════════════════════════════════
  // PAGE 1 — COVER (full navy, no standard header/footer)
  // ════════════════════════════════════════════════════════════════════════════
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PW, PH, 'F');

  if (logoDataUrl) {
    try { doc.addImage(logoDataUrl, 'PNG', (PW - 80) / 2, 38, 80, 38); } catch (_) {}
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...WHITE);
  doc.text('FINANCIAL PROPOSAL', PW / 2, 108, { align: 'center' });

  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.8);
  doc.line(ML + 28, 113, PW - MR - 28, 113);
  doc.setLineWidth(0.2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(170, 195, 220);
  doc.text('PREPARED FOR', PW / 2, 124, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...WHITE);
  doc.text(clientName, PW / 2, 134, { align: 'center' });

  const coverDetails = [
    ['Reference',    orDash(proposal.reference)],
    ['Date',         fmtDate(proposal.sign_date || new Date().toISOString())],
    ['Advisor',      advisorName],
    ['Risk Profile', orDash(proposal.risk_profile)],
    ['Time Horizon', orDash(proposal.time_horizon)],
  ];
  let cy = 150;
  coverDetails.forEach(([lbl, vl]) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(170, 195, 220);
    doc.text(lbl, PW / 2 - 32, cy, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...WHITE);
    doc.text(vl, PW / 2 - 27, cy);
    cy += 9;
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(120, 150, 180);
  doc.text('Wealth Works (Pty) Ltd FSP 28337  |  Wealthworks Investments (Pty) Ltd FSP 45624', PW / 2, PH - 12, { align: 'center' });
  doc.text('This document is confidential and intended solely for the named recipient.', PW / 2, PH - 7, { align: 'center' });

  // ════════════════════════════════════════════════════════════════════════════
  // PAGES 2–3 — DISCLOSURE
  // ════════════════════════════════════════════════════════════════════════════
  let y = newPage(doc, logoDataUrl);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...NAVY);
  doc.text('DISCLOSURE AND TERMS OF BUSINESS', ML, y);
  y += 10;

  for (const section of DISCLOSURE_SECTIONS) {
    y = pb(doc, y, 22, logoDataUrl);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...NAVY);
    doc.text(section.title, ML, y);
    y += 3;
    doc.setDrawColor(...TEAL);
    doc.setLineWidth(0.3);
    doc.line(ML, y, ML + CW, y);
    doc.setLineWidth(0.2);
    y += 3;
    y = para(doc, section.body, y, 0, 7.5);
    y += 4;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ROA START — new page
  // ════════════════════════════════════════════════════════════════════════════
  y = newPage(doc, logoDataUrl);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...NAVY);
  doc.text('RECORD OF ADVICE', ML, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text(`Reference: ${orDash(proposal.reference)}   |   Date: ${fmtDate(proposal.sign_date || new Date().toISOString())}`, ML, y);
  y += 9;

  // ── S1: Client Details ────────────────────────────────────────────────────
  y = pb(doc, y, 70, logoDataUrl);
  y = sectionHead(doc, 1, 'Client Details (FICA Verified)', y);

  y = row(doc, 'Client / Entity Name',      clientName,                              y);
  y = row(doc, 'ID / Registration Number',  orDash(proposal.client_id_number),       y);
  if (!isEntity) y = row(doc, 'Date of Birth', fmtDate(proposal.client_dob),         y);
  y = row(doc, 'Email',                     orDash(proposal.client_email),           y);
  y = row(doc, 'Mobile',                    orDash(proposal.client_mobile),          y);
  y = row(doc, 'Tax Residency',             orDash(proposal.client_tax_residency),   y);
  y = row(doc, 'Client Type',               clientTypeLabel,                         y);
  y += 3;

  // FICA status — as plain text ticks (Fix 2)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text('FICA STATUS', ML, y);
  y += 5;
  const ficaItems = [
    'Identity Verified',
    'Proof of Address Verified',
    'Source of Funds Confirmed',
    isEntity ? 'Beneficial Ownership Verified' : 'Beneficial Ownership — N/A (Individual)',
  ];
  ficaItems.forEach(f => { y = tickItem(doc, f, y); });
  y += 2;

  // ── S2: FSP Details ───────────────────────────────────────────────────────
  y = pb(doc, y, 45, logoDataUrl);
  y = sectionHead(doc, 2, 'Financial Services Provider Details', y);
  y = row(doc, 'FSP Name',           'Wealth Works (Pty) Ltd  |  Wealthworks Investments (Pty) Ltd', y);
  y = row(doc, 'FSP Licence Numbers','28337  |  45624',  y);
  y = row(doc, 'Advisor Name',       advisorName,         y);
  y += 3;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text('COMPLIANCE DISCLOSURES PROVIDED', ML, y);
  y += 5;
  // Plain tick list (Fix 2)
  y = tickItem(doc, 'FAIS Disclosure Letter', y);
  y = tickItem(doc, 'Conflict of Interest Policy', y);
  y = tickItem(doc, 'Complaints Resolution Process', y);
  y += 2;

  // ── S3: Purpose of Advice ─────────────────────────────────────────────────
  y = pb(doc, y, 45, logoDataUrl);
  y = sectionHead(doc, 3, 'Purpose of Advice', y);

  // Build list of SELECTED purposes only (Fix 2)
  const allPurposes = [
    { label: 'Wealth Creation / Growth',   check: needsArr.includes('investment') || advisory.some(n => n.includes('invest') || n.includes('wealth') || n.includes('growth')) },
    { label: 'Offshore Diversification',   check: advisory.some(n => n.includes('offshore')) },
    { label: 'Retirement Planning',        check: advisory.some(n => n.includes('retire')) },
    { label: 'Risk Cover / Protection',    check: needsArr.includes('risk_cover') || advisory.some(n => n.includes('risk') || n.includes('cover') || n.includes('life')) },
    { label: 'Capital Preservation',       check: advisory.some(n => n.includes('capital') || n.includes('estate') || n.includes('preserv')) },
    { label: 'Income Generation',          check: advisory.some(n => n.includes('income') || n.includes('tax')) },
    { label: 'Business Assurance',         check: advisory.some(n => n.includes('business')) },
    { label: 'Estate Planning',            check: advisory.some(n => n.includes('estate')) },
  ];
  const selectedPurposes = allPurposes.filter(p => p.check);
  if (selectedPurposes.length === 0) {
    // Fallback: show whatever is in needs_array
    if (needsArr.includes('investment')) y = tickItem(doc, 'Wealth Creation / Growth', y);
    if (needsArr.includes('risk_cover')) y = tickItem(doc, 'Risk Cover / Protection', y);
    if (selectedPurposes.length === 0 && needsArr.length === 0) y = tickItem(doc, 'General Financial Planning', y);
  } else {
    selectedPurposes.forEach(p => { y = tickItem(doc, p.label, y); });
  }
  y += 2;

  // ── S4: Financial Profile ─────────────────────────────────────────────────
  y = pb(doc, y, 45, logoDataUrl);
  y = sectionHead(doc, 4, 'Client Financial Profile', y);
  y = row(doc, 'Annual Income Band',         incomeBand,     y);
  y = row(doc, 'Net Worth Band',             netWorthBand,   y);
  y = row(doc, 'Monthly Investable Surplus', monthlySurplus, y);
  y = row(doc, 'Liquidity Requirements',     liquidityReq,   y);
  y = row(doc, 'Investment Horizon',         orDash(proposal.time_horizon), y);
  y += 2;

  // ── S5: Risk Profiling ────────────────────────────────────────────────────
  y = pb(doc, y, 45, logoDataUrl);
  y = sectionHead(doc, 5, 'Risk Profiling Outcome', y);

  // Risk profile as plain text with ✓ on selected only (Fix 2)
  const profiles = ['Conservative', 'Cautious', 'Moderate', 'Growth', 'Aggressive'];
  profiles.forEach(p => {
    if (p === proposal.risk_profile) {
      y = tickItem(doc, `${p} (Selected)`, y);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...MUTED);
      doc.text(`    ${p}`, ML, y);
      y += 5.5;
    }
  });
  y += 2;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text('KEY INDICATORS CONFIRMED', ML, y);
  y += 5;
  [
    'Risk questionnaire completed and signed by client',
    'Client understands the risk/return trade-off',
    'Portfolio volatility appropriate to profile',
    'Liquidity needs considered in profile selection',
  ].forEach(r => { y = tickItem(doc, r, y); });
  y += 2;

  // ── S6: Basis of Advice ───────────────────────────────────────────────────
  y = pb(doc, y, 50, logoDataUrl);
  y = sectionHead(doc, 6, 'Basis of Advice', y);
  y = para(doc,
    'This advice is based on information provided by the client during the financial planning process. The advisor has considered the client\'s risk profile, financial position, investment objectives, time horizon and existing portfolio before making these recommendations. The advice is appropriate and suitable for the client\'s circumstances as disclosed.',
    y, 0, 7.5);
  if (proposal.personal_message) {
    y += 3;
    y = para(doc, proposal.personal_message, y, 0, 7.5);
  }
  y += 2;

  // ── S7: Product Recommendations ───────────────────────────────────────────
  y = pb(doc, y, 30, logoDataUrl);
  y = sectionHead(doc, 7, 'Product / Strategy Recommendations', y);

  if (investments.length > 0) {
    y = pb(doc, y, 12, logoDataUrl);
    y = subHead(doc, 'Investments', y);
    investments.forEach((inv, idx) => {
      y = pb(doc, y, 42, logoDataUrl);
      doc.setFillColor(...BG);
      doc.rect(ML, y - 3, CW, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...NAVY);
      doc.text(`Investment ${idx + 1}: ${orDash(inv.provider)} — ${orDash(inv.product_type)}`, ML + 2, y + 1.5);
      y += 9;
      y = row(doc, 'Provider',             orDash(inv.provider),     y);
      y = row(doc, 'Product Type',         orDash(inv.product_type), y);
      y = row(doc, 'Jurisdiction / Currency', `${orDash(inv.jurisdiction)} / ${orDash(inv.currency)}`, y);
      if (inv.amount > 0)           y = row(doc, 'Lump Sum Amount',            fmtNum(inv.amount, inv.currency),           y);
      if (inv.recurring_amount > 0) y = row(doc, `Recurring (${orDash(inv.frequency)})`, fmtNum(inv.recurring_amount, inv.currency), y);
      const funds = Array.isArray(inv.underlying_funds) && inv.underlying_funds.length ? inv.underlying_funds.join(', ') : '—';
      y = row(doc, 'Underlying Funds',     funds,                    y);
      y = row(doc, 'Term / Structure',     orDash(proposal.time_horizon), y);
      if (inv.reason_for_recommendation) {
        y += 2;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(...MUTED);
        doc.text('REASON FOR RECOMMENDATION', ML, y);
        y += 4;
        y = para(doc, inv.reason_for_recommendation, y, 3, 7.5);
      }
      y += 5;
    });
  }

  if (riskProducts.length > 0) {
    y = pb(doc, y, 12, logoDataUrl);
    y = subHead(doc, 'Risk Products', y);
    riskProducts.forEach((rp, idx) => {
      y = pb(doc, y, 42, logoDataUrl);
      doc.setFillColor(...BG);
      doc.rect(ML, y - 3, CW, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...NAVY);
      const coverStr = (rp._covers || []).map(c => c.cover_type).join(', ') || '—';
      doc.text(`Risk Product ${idx + 1}: ${orDash(rp.provider)} — ${coverStr}`, ML + 2, y + 1.5);
      y += 9;
      y = row(doc, 'Provider', orDash(rp.provider), y);
      (rp._covers || []).forEach(cover => {
        y = row(doc, `${cover.cover_type} — Sum Assured`,    cover.amount_required > 0 ? fmtNum(cover.amount_required) : '—', y);
        y = row(doc, `${cover.cover_type} — Monthly Premium`, cover.premium > 0 ? fmtNum(cover.premium) : '—',              y);
        if (cover.annual_premium_increase_percent > 0) y = row(doc, 'Annual Premium Increase', fmtPct(cover.annual_premium_increase_percent), y);
        if (cover.annual_cover_increase_percent > 0)   y = row(doc, 'Annual Cover Increase',   fmtPct(cover.annual_cover_increase_percent),   y);
      });
      if (rp.total_premium > 0) y = row(doc, 'Total Monthly Premium', fmtNum(rp.total_premium), y);
      if (rp.reason_for_recommendation) {
        y += 2;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(...MUTED);
        doc.text('REASON FOR RECOMMENDATION', ML, y);
        y += 4;
        y = para(doc, rp.reason_for_recommendation, y, 3, 7.5);
      }
      y += 5;
    });
  }

  // ── S8: Motivation ────────────────────────────────────────────────────────
  y = pb(doc, y, 30, logoDataUrl);
  y = sectionHead(doc, 8, 'Motivation for Recommendation', y);
  y = para(doc,
    proposal.personal_message ||
    'Based on the client\'s financial profile, risk tolerance and investment objectives, the recommendations above are considered the most appropriate solutions available from our accredited product panel.',
    y, 0, 7.5);
  y += 2;

  // ── S9: Material Risks Disclosed ─────────────────────────────────────────
  y = pb(doc, y, 45, logoDataUrl);
  y = sectionHead(doc, 9, 'Material Risks Disclosed', y);
  [
    'Market risk — investment values may fluctuate and are not guaranteed',
    'Inflation risk — real returns may be eroded over time if returns do not exceed inflation',
    'Liquidity risk — funds may not be accessible at short notice without penalty',
    'Currency risk — offshore investments are subject to exchange rate movements',
    'Counterparty / provider risk — subject to the financial soundness of the product provider',
  ].forEach(r => { y = tickItem(doc, r, y); });
  y += 2;

  // ── S10: Costs, Fees & Remuneration ──────────────────────────────────────
  y = pb(doc, y, 40, logoDataUrl);
  y = sectionHead(doc, 10, 'Costs, Fees & Remuneration', y);
  if (investments.length > 0) {
    investments.forEach((inv) => {
      y = pb(doc, y, 30, logoDataUrl);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...NAVY);
      doc.text(`${orDash(inv.provider)} — ${orDash(inv.product_type)}`, ML, y);
      y += 5;
      y = row(doc, 'Initial Advice Fee',          fmtPct(inv.initial_fee_percent),      y);
      y = row(doc, 'Annual Advice Fee (ongoing)',  fmtPct(inv.annual_advice_fee_percent), y);
      y = row(doc, 'Platform Fee',                fmtPct(inv.platform_fee_percent),      y);
      if (inv.fund_ter_percent) y = row(doc, 'Fund TER', fmtPct(inv.fund_ter_percent),   y);
      y += 3;
    });
  } else {
    y = para(doc, 'Fee disclosure not applicable — no investment products recommended.', y, 0, 7.5);
  }
  y += 2;

  // ── S11: Alternatives Considered ─────────────────────────────────────────
  y = pb(doc, y, 30, logoDataUrl);
  y = sectionHead(doc, 11, 'Alternatives Considered', y);
  y = para(doc,
    'Alternative products and providers on our accreditation panel were considered prior to making this recommendation. The recommended solutions best align with the client\'s risk profile, investment time horizon, cost structure and stated financial objectives as disclosed during the financial planning process. No superior or materially different alternative was identified that would better serve the client\'s needs.',
    y, 0, 7.5);
  y += 2;

  // ── S12: Replacement Analysis ─────────────────────────────────────────────
  y = pb(doc, y, 30, logoDataUrl);
  y = sectionHead(doc, 12, 'Replacement Analysis', y);
  y = para(doc,
    'Where an existing financial product is being replaced, the advisor has considered the costs, penalties, and implications of such replacement and is satisfied that the replacement is in the best interest of the client.',
    y, 0, 7.5);
  y += 2;
  y = row(doc, 'Existing product being replaced',        '—', y);
  y = row(doc, 'Replacement justified (Yes / No)',       '—', y);
  y = row(doc, 'Client informed of all implications',    '—', y);
  y += 2;

  // ── S13: FICA Source of Funds Declaration ─────────────────────────────────
  y = pb(doc, y, 40, logoDataUrl);
  y = sectionHead(doc, 13, 'FICA Source of Funds Declaration', y);
  y = row(doc, 'Declared Source(s) of Funds', sourceFundsStr, y);
  y += 3;
  y = tickItem(doc, 'Client acknowledges all fees and charges applicable to the recommended products', y);
  y = tickItem(doc, 'Client has been informed of all material implications of the recommendations', y);
  y += 2;

  // ── S14: Limitations of Advice ────────────────────────────────────────────
  y = pb(doc, y, 35, logoDataUrl);
  y = sectionHead(doc, 14, 'Limitations of Advice', y);
  y = para(doc,
    'This advice is limited to the financial services and products listed in this Record of Advice. We have not provided advice on matters outside our FSP licence categories. Our advice is based solely on information disclosed by the client — incomplete or inaccurate disclosure may affect the appropriateness of this advice. Past performance of investments does not guarantee future results. The values of investments may go down as well as up.',
    y, 0, 7.5);
  y += 2;

  // ── S15: Advisor Declaration ──────────────────────────────────────────────
  y = pb(doc, y, 65, logoDataUrl);
  y = sectionHead(doc, 15, 'Advisor Declaration', y);
  y = para(doc,
    'I, the undersigned authorised representative, declare that:\n' +
    '1. I am duly authorised under FSP 28337 and/or FSP 45624;\n' +
    '2. I have conducted this advice in accordance with the FAIS General Code of Conduct;\n' +
    '3. The recommendations made are appropriate and suitable for the client\'s disclosed circumstances;\n' +
    '4. All material conflicts of interest have been disclosed to the client;\n' +
    '5. This Record of Advice accurately reflects the advice rendered.',
    y, 0, 7.5);
  y += 5;
  y = renderAdvisorSig(doc, proposal, advisorName, y);  // Fix 4

  // ── S16: Client Declaration ───────────────────────────────────────────────
  y = pb(doc, y, 55, logoDataUrl);
  y = sectionHead(doc, 16, 'Client Declaration', y);
  y = para(doc,
    'I, the undersigned, confirm that:\n' +
    '1. I have read and understood this Record of Advice and the Disclosure Document;\n' +
    '2. The information I provided is accurate and complete to the best of my knowledge;\n' +
    '3. I have been made aware of all fees, charges, and material risks;\n' +
    '4. I accept the recommendations made herein and consent to the processing of my personal information.',
    y, 0, 7.5);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text('Client Name:', ML, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text(clientName, ML + 26, y);
  y += 9;
  doc.setDrawColor(...NAVY);
  doc.line(ML, y, ML + 90, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text('Client Signature', ML, y);
  doc.text('Date: _______________', ML + 95, y);

  // ════════════════════════════════════════════════════════════════════════════
  // MANDATE PAGES (Fix 3) — only if mandate_included === 'Yes'
  // ════════════════════════════════════════════════════════════════════════════
  if (mandateIncluded) {
    y = newPage(doc, logoDataUrl);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...NAVY);
    doc.text('CONSOLIDATED DISCRETIONARY MANDATE', ML, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text('Wealthworks Investments (Pty) Ltd — FSP 45624', ML, y);
    y += 9;

    y = para(doc,
      'This Consolidated Discretionary Mandate ("Mandate") is entered into between Wealthworks Investments (Pty) Ltd (FSP 45624) ("the Manager") and the client named on the cover page of this Financial Proposal ("the Client"). By signing this Mandate, the Client grants the Manager the authority described herein to manage the Client\'s portfolio on a discretionary basis in accordance with the Client\'s stated investment objectives and risk profile.',
      y, 0, 7.5);
    y += 5;

    const mandateSections = [
      {
        title: '1. APPOINTMENT AND AUTHORITY',
        body: 'The Client hereby appoints the Manager as discretionary manager of the Client\'s investment portfolio. The Manager is authorised to buy, sell, switch and otherwise deal in financial products on the Client\'s behalf without requiring prior consent for each individual transaction, provided such transactions are consistent with the Client\'s agreed investment mandate, risk profile and objectives.'
      },
      {
        title: '2. INVESTMENT OBJECTIVES AND RISK PROFILE',
        body: `The Client's stated risk profile is: ${orDash(proposal.risk_profile)}. The Manager shall invest the Client's assets in accordance with this risk profile and the investment objectives disclosed in the Record of Advice. The investment time horizon is: ${orDash(proposal.time_horizon)}.`
      },
      {
        title: '3. INVESTMENT RESTRICTIONS',
        body: 'The Manager shall not invest the Client\'s assets in any financial product that falls outside the Client\'s agreed risk profile without the Client\'s prior written consent. The Manager shall not invest in unlisted financial instruments, derivative instruments for speculative purposes, or any instrument that would expose the Client to unlimited liability.'
      },
      {
        title: '4. FEES AND REMUNERATION',
        body: 'The Manager\'s remuneration for discretionary management services is disclosed in Section 10 (Costs, Fees & Remuneration) of the Record of Advice forming part of this document. The Manager may be remunerated by way of an annual advice fee, which shall be disclosed to the Client and agreed prior to implementation.'
      },
      {
        title: '5. REPORTING',
        body: 'The Manager shall provide the Client with quarterly portfolio valuations and an annual performance report. The Client may request a portfolio report at any time. All reporting shall be provided in writing or via the Manager\'s approved electronic communication platform.'
      },
      {
        title: '6. TERMINATION',
        body: 'Either party may terminate this Mandate by giving 30 (thirty) days\' written notice to the other party. On termination, the Manager shall cease all discretionary activity and shall account to the Client for all assets held on the Client\'s behalf. Any accrued but unpaid fees shall remain payable on termination.'
      },
      {
        title: '7. CONFLICTS OF INTEREST',
        body: 'The Manager maintains a Conflicts of Interest Management Policy in terms of the FAIS Act. A copy of this policy is available on request. The Manager undertakes to disclose all material conflicts of interest to the Client as they arise.'
      },
      {
        title: '8. GOVERNING LAW',
        body: 'This Mandate is governed by the laws of the Republic of South Africa. Any disputes arising from this Mandate shall be subject to the jurisdiction of the South African courts or, at the election of either party, to arbitration in terms of the Arbitration Act, No. 42 of 1965.'
      },
      {
        title: '9. CLIENT ACKNOWLEDGEMENTS',
        body: 'The Client acknowledges that:\n(a) The Manager is authorised to act on the Client\'s behalf on a discretionary basis;\n(b) The Client has been advised of the risks associated with discretionary management;\n(c) Past performance of the portfolio does not guarantee future performance;\n(d) The value of investments may fluctuate and the Client may receive back less than the amount invested.'
      }
    ];

    for (const ms of mandateSections) {
      y = pb(doc, y, 25, logoDataUrl);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...NAVY);
      doc.text(ms.title, ML, y);
      y += 4;
      y = para(doc, ms.body, y, 0, 7.5);
      y += 4;
    }

    // Mandate Advisor Signature
    y = pb(doc, y, 50, logoDataUrl);
    y = subHead(doc, 'Advisor Acceptance', y);
    y = para(doc, 'I confirm that I have explained the terms of this Mandate to the Client and that the Client understands and accepts same.', y, 0, 7.5);
    y += 4;
    y = renderAdvisorSig(doc, proposal, advisorName, y);

    // Mandate Client Signature
    y = pb(doc, y, 40, logoDataUrl);
    y = subHead(doc, 'Client Acceptance', y);
    y = para(doc, 'I have read and understood the terms of this Consolidated Discretionary Mandate and agree to be bound by its provisions.', y, 0, 7.5);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text('Client Name:', ML, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    doc.text(clientName, ML + 26, y);
    y += 9;
    doc.setDrawColor(...NAVY);
    doc.line(ML, y, ML + 90, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text('Client Signature', ML, y);
    doc.text('Date: _______________', ML + 95, y);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // FINAL PASS — Add header + footer to every page (Fix 1)
  // Page 1 (cover) gets only the cover footer, not the standard header/footer
  // ════════════════════════════════════════════════════════════════════════════
  const totalPages = doc.getNumberOfPages();
  for (let i = 2; i <= totalPages; i++) {
    doc.setPage(i);
    addHeader(doc, logoDataUrl);
    addFooter(doc, i, totalPages);
  }

  return doc;
}