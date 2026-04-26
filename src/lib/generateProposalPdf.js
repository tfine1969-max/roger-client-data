import jsPDF from 'jspdf';
import { ADVISORS } from '@/lib/constants';

// ─── Colours ──────────────────────────────────────────────────────────────────
const NAVY   = [27, 58, 92];
const WHITE  = [255, 255, 255];
const MUTED  = [120, 140, 160];
const BORDER = [210, 220, 230];
const BG     = [245, 248, 251];
const GOLD   = [196, 151, 58];
const TEAL   = [74, 155, 175];
const AMBER  = [217, 119, 6];

// ─── Layout constants ─────────────────────────────────────────────────────────
const PW = 210;   // page width mm
const PH = 297;   // page height mm
const ML = 18;    // left margin
const MR = 18;    // right margin
const CW = PW - ML - MR;  // content width
const HEADER_H = 22;
const FOOTER_H = 14;
const TOP_Y = HEADER_H + 8;
const BOT_Y = PH - FOOTER_H - 4;

// ─── Date formatter ───────────────────────────────────────────────────────────
function fmtDate(val) {
  if (!val) return '—';
  const d = new Date(val);
  if (isNaN(d)) return val;
  return `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;
}

function fmtNum(val, currency = 'R') {
  if (!val && val !== 0) return '—';
  const n = parseFloat(String(val).replace(/[^0-9.]/g, ''));
  if (isNaN(n)) return String(val);
  return currency + ' ' + n.toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtPct(val) {
  if (val === undefined || val === null || val === '') return '—';
  return `${val}%`;
}

function val(v) { return v || '—'; }

// ─── LOGO (base64 placeholder — loaded from URL) ──────────────────────────────
const LOGO_URL = 'https://media.base44.com/images/public/69e88c566cc0939ea06624c2/48ec7b9f6_logo.png';

// ─── Page Header ──────────────────────────────────────────────────────────────
async function addHeader(doc, logoDataUrl) {
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PW, HEADER_H, 'F');
  // Logo top right
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', PW - ML - 38, 2, 38, 18);
    } catch {}
  }
  // Left text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...WHITE);
  doc.text('Financial Proposal', ML, 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(180, 200, 220);
  doc.text('Wealth Works (Pty) Ltd  |  FSP 28337  |  Wealthworks Investments (Pty) Ltd  |  FSP 45624', ML, 17);
}

// ─── Page Footer ──────────────────────────────────────────────────────────────
function addFooter(doc, pageNum, totalPages, clientName) {
  const y = PH - FOOTER_H;
  doc.setDrawColor(...BORDER);
  doc.line(ML, y, PW - MR, y);
  const initials = clientName
    ? clientName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,3)
    : '___';

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(...MUTED);
  doc.text('Wealth Works (Pty) Ltd FSP 28337  |  Wealthworks Investments (Pty) Ltd FSP 45624', ML, y + 5);
  doc.text(`Page ${pageNum}${totalPages ? ' of ' + totalPages : ''}`, PW / 2, y + 5, { align: 'center' });
  doc.text(`Initials: ${initials}`, PW - MR, y + 5, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(170, 170, 170);
  doc.text('Initials: ___________', PW - MR, y + 9, { align: 'right' });
}

// ─── New page helper ──────────────────────────────────────────────────────────
function newPage(doc, pages, logoDataUrl, clientName) {
  doc.addPage();
  pages.push(null);
  addHeader(doc, logoDataUrl);
  return TOP_Y;
}

// ─── Check page break ─────────────────────────────────────────────────────────
function pb(doc, y, needed, pages, logoDataUrl, clientName) {
  if (y + needed > BOT_Y) {
    return newPage(doc, pages, logoDataUrl, clientName);
  }
  return y;
}

// ─── Section heading ──────────────────────────────────────────────────────────
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
  doc.setFontSize(7.5);
  doc.setTextColor(...NAVY);
  doc.text(title.toUpperCase(), ML, y);
  doc.setDrawColor(...TEAL);
  doc.line(ML, y + 1.5, ML + doc.getTextWidth(title.toUpperCase()), y + 1.5);
  return y + 6;
}

// ─── Label/Value row ──────────────────────────────────────────────────────────
function row(doc, label, value, y, indent = 0) {
  const lx = ML + indent;
  const vx = ML + CW;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text(label, lx, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  const vStr = value || '—';
  const vLines = doc.splitTextToSize(vStr, CW * 0.5);
  doc.text(vLines, vx, y, { align: 'right' });
  return y + (vLines.length > 1 ? vLines.length * 4 : 5);
}

// ─── Checkbox ─────────────────────────────────────────────────────────────────
function checkbox(doc, label, checked, x, y) {
  doc.setDrawColor(...NAVY);
  doc.setFillColor(...(checked ? NAVY : WHITE));
  doc.rect(x, y - 3, 3.5, 3.5, checked ? 'FD' : 'D');
  if (checked) {
    doc.setTextColor(...WHITE);
    doc.setFontSize(5);
    doc.text('✓', x + 0.5, y - 0.1);
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...NAVY);
  doc.text(label, x + 5, y);
}

// ─── Wrapped paragraph ────────────────────────────────────────────────────────
function para(doc, text, y, indent = 0, fontSize = 7.5) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fontSize);
  doc.setTextColor(...NAVY);
  const lines = doc.splitTextToSize(text, CW - indent);
  doc.text(lines, ML + indent, y);
  return y + lines.length * (fontSize * 0.45) + 2;
}

// ─── Signature render ─────────────────────────────────────────────────────────
function renderSig(doc, proposal, y) {
  if (proposal.advisor_signature_type === 'draw' && proposal.advisor_signature_data) {
    try { doc.addImage(proposal.advisor_signature_data, 'PNG', ML, y, 55, 14); } catch {}
    y += 16;
  } else if (proposal.advisor_signature_type === 'type' && proposal.advisor_signature_data) {
    doc.setFont('times', 'italic');
    doc.setFontSize(16);
    doc.setTextColor(...NAVY);
    doc.text(proposal.advisor_signature_data, ML, y + 8);
    y += 14;
  } else {
    y += 14;
  }
  doc.setDrawColor(...NAVY);
  doc.line(ML, y, ML + 70, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...NAVY);
  doc.text(val(proposal.advisor_name || proposal.advisor_key), ML, y);
  doc.text(`Date: ${fmtDate(proposal.sign_date)}`, ML + 80, y);
  return y + 7;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DISCLOSURE TEXT (Pages 2–3)
// ═══════════════════════════════════════════════════════════════════════════════
const DISCLOSURE_SECTIONS = [
  {
    title: 'INTRODUCTION',
    body: `Wealth Works (Pty) Ltd (FSP 28337) and Wealthworks Investments (Pty) Ltd (FSP 45624) are authorised Financial Services Providers in terms of the Financial Advisory and Intermediary Services Act, No. 37 of 2002 (FAIS Act). This disclosure document is provided to you in terms of section 4 of the FAIS General Code of Conduct and contains information you are entitled to receive before we provide you with any financial services.`
  },
  {
    title: 'OUR DETAILS',
    body: `Wealth Works (Pty) Ltd | FSP 28337 | Category I\nWealthworks Investments (Pty) Ltd | FSP 45624 | Category II\nRegistered Address: 123 Business Park, Sandton, Johannesburg, 2196\nTelephone: +27 11 000 0000 | Email: info@wealthworks.co.za`
  },
  {
    title: 'KEY INDIVIDUALS',
    body: `Trevor Fine — Group Managing Director | FSP 28337 & 45624\nRoger Eskinazi — Partner, Cape Town\nMalcolm Munsamy — Representative`
  },
  {
    title: 'COMPLIANCE OFFICER',
    body: `Our compliance function is managed by an independent compliance officer registered with the Financial Sector Conduct Authority (FSCA). Details available on request.`
  },
  {
    title: 'SHAREHOLDING',
    body: `Wealth Works (Pty) Ltd is a privately held company. No shareholding exceeding 10% is held in any product supplier that would constitute a material conflict of interest. Full details available on request.`
  },
  {
    title: 'ACCREDITATION FROM PRODUCT SUPPLIERS',
    body: `We hold accreditation with the following product suppliers: Glacier by Sanlam, Momentum Wealth, Allan Gray, Investec, Prime Investments, Credo, Julius Baer, PPS, Discovery Life, Hollard, BrightRock. A full list is available on request.`
  },
  {
    title: 'ADDITIONAL PROFESSIONAL SERVICES',
    body: `Where we refer you to an attorney, accountant, tax practitioner or other professional, such referral does not constitute advice under FAIS. Any fees payable to such professionals are separate and distinct from our advisory fees.`
  },
  {
    title: 'CONFLICTS OF INTEREST',
    body: `We maintain a Conflicts of Interest Management Policy in terms of section 3A of the FAIS General Code of Conduct. A copy of this policy is available on our website and on request. We disclose all material conflicts of interest at the point of advice.`
  },
  {
    title: 'STAFF INCENTIVES, GIFTS AND DONATIONS',
    body: `Our remuneration practices comply with the FAIS Act and Regulations. We do not pay or receive incentives or gifts that would constitute conflicts of interest. Any gifts received from product suppliers above the threshold prescribed by the FSCA are disclosed in our gifts register, which is available on request.`
  },
  {
    title: 'PRIVACY STATEMENT',
    body: `We collect and process your personal information to provide financial services, comply with legal obligations and improve our services. Your information is protected in terms of the Protection of Personal Information Act (POPIA). We will not share your personal information with third parties without your consent, except where required by law. You have the right to access, correct and object to the processing of your personal information. Contact our Information Officer for queries.`
  },
  {
    title: 'COMPLAINTS',
    body: `If you are dissatisfied with our service you may submit a written complaint to: complaints@wealthworks.co.za. We will acknowledge receipt within 24 hours and resolve within 10 business days. If unresolved, you may escalate to:\n\nFinancial Advisory and Intermediary Services Ombud (FAIS Ombud)\nTelephone: 0860 324 766 | Email: info@faisombud.co.za | Website: www.faisombud.co.za`
  }
];

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════════════════
export default async function generateProposalPdf(proposal, investments = [], riskProducts = []) {
  // Pre-load logo
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
  } catch {}

  const doc = new jsPDF('p', 'mm', 'a4');
  const pages = [null]; // page 1
  const clientName = proposal.client_name || '—';
  const advisorObj = ADVISORS[proposal.advisor_key] || ADVISORS.trevor;
  const advisorName = proposal.advisor_name || advisorObj.name;

  // ═══════════════ PAGE 1 — COVER ═══════════════════════════════════════════
  // Full navy cover
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PW, PH, 'F');

  // Logo centred
  if (logoDataUrl) {
    try { doc.addImage(logoDataUrl, 'PNG', (PW - 80) / 2, 40, 80, 38); } catch {}
  }

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...WHITE);
  doc.text('FINANCIAL PROPOSAL', PW / 2, 105, { align: 'center' });

  // Divider
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.8);
  doc.line(ML + 30, 110, PW - MR - 30, 110);
  doc.setLineWidth(0.2);

  // Client block
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(170, 195, 220);
  doc.text('PREPARED FOR', PW / 2, 122, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...WHITE);
  doc.text(clientName, PW / 2, 132, { align: 'center' });

  // Details block
  const details = [
    ['Reference', val(proposal.reference)],
    ['Date', fmtDate(proposal.sign_date || new Date().toISOString())],
    ['Advisor', advisorName],
    ['Risk Profile', val(proposal.risk_profile)],
    ['Time Horizon', val(proposal.time_horizon)],
  ];
  let cy = 148;
  details.forEach(([lbl, vl]) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(170, 195, 220);
    doc.text(lbl, PW / 2 - 35, cy, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...WHITE);
    doc.text(vl, PW / 2 - 30, cy);
    cy += 8;
  });

  // Cover footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(120, 150, 180);
  doc.text('Wealth Works (Pty) Ltd FSP 28337  |  Wealthworks Investments (Pty) Ltd FSP 45624', PW / 2, PH - 12, { align: 'center' });
  doc.text('This document is confidential and intended solely for the named recipient.', PW / 2, PH - 7, { align: 'center' });

  // ═══════════════ PAGES 2–3 — DISCLOSURE ═══════════════════════════════════
  let y = newPage(doc, pages, logoDataUrl, clientName);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...NAVY);
  doc.text('DISCLOSURE AND TERMS OF BUSINESS', ML, y);
  y += 10;

  for (const section of DISCLOSURE_SECTIONS) {
    y = pb(doc, y, 20, pages, logoDataUrl, clientName);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...NAVY);
    doc.text(section.title, ML, y);
    y += 4;
    doc.setDrawColor(...TEAL);
    doc.line(ML, y, ML + CW, y);
    y += 3;
    y = para(doc, section.body, y, 0, 7.5);
    y += 3;
  }

  // ═══════════════ ROA PAGES ════════════════════════════════════════════════
  y = newPage(doc, pages, logoDataUrl, clientName);

  // ROA title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...NAVY);
  doc.text('RECORD OF ADVICE', ML, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text(`Reference: ${val(proposal.reference)}   |   Date: ${fmtDate(proposal.sign_date || new Date().toISOString())}`, ML, y);
  y += 8;

  // ── S1: Client Details ───────────────────────────────────────────────────
  y = pb(doc, y, 60, pages, logoDataUrl, clientName);
  y = sectionHead(doc, 1, 'Client Details (FICA Verified)', y);

  const isEntity = ['company','trust','Company','Trust'].includes(proposal.client_type);
  y = row(doc, 'Client / Entity Name', clientName, y);
  y = row(doc, 'ID / Registration Number', val(proposal.client_id_number), y);
  if (!isEntity) y = row(doc, 'Date of Birth', fmtDate(proposal.client_dob), y);
  y = row(doc, 'Email', val(proposal.client_email), y);
  y = row(doc, 'Mobile', val(proposal.client_mobile), y);
  y = row(doc, 'Tax Residency', val(proposal.client_tax_residency), y);
  y += 3;

  // Client type checkboxes
  const clientTypes = ['Individual', 'Company', 'Trust'];
  const activeType = isEntity
    ? (proposal.client_type === 'trust' || proposal.client_type === 'Trust' ? 'Trust' : 'Company')
    : 'Individual';
  let cx = ML;
  clientTypes.forEach(t => {
    checkbox(doc, t, t === activeType, cx, y);
    cx += 35;
  });
  y += 8;

  // FICA checkboxes
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text('FICA STATUS', ML, y);
  y += 5;
  const ficaItems = [
    'Identity Verified',
    'Proof of Address Verified',
    'Source of Funds Confirmed',
    'Beneficial Ownership Verified'
  ];
  cx = ML;
  ficaItems.forEach((f, i) => {
    const lx = ML + (i % 2) * (CW / 2);
    const ly = y + Math.floor(i / 2) * 6;
    checkbox(doc, f, true, lx, ly);
  });
  y += 14;

  // ── S2: FSP Details ───────────────────────────────────────────────────────
  y = pb(doc, y, 40, pages, logoDataUrl, clientName);
  y = sectionHead(doc, 2, 'Financial Services Provider Details', y);
  y = row(doc, 'FSP Name', 'Wealth Works (Pty) Ltd  |  Wealthworks Investments (Pty) Ltd', y);
  y = row(doc, 'FSP Licence Numbers', '28337  |  45624', y);
  y = row(doc, 'Advisor Name', advisorName, y);
  y += 3;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text('COMPLIANCE DISCLOSURES PROVIDED', ML, y);
  y += 5;
  ['FAIS Disclosure Letter', 'Conflict of Interest Policy', 'Complaints Resolution Process'].forEach(d => {
    checkbox(doc, d, true, ML, y);
    y += 6;
  });

  // ── S3: Purpose of Advice ─────────────────────────────────────────────────
  y = pb(doc, y, 40, pages, logoDataUrl, clientName);
  y = sectionHead(doc, 3, 'Purpose of Advice', y);
  const advisory = Array.isArray(proposal.advisory_needs) ? proposal.advisory_needs.map(n => n.toLowerCase()) : [];
  const needsArr = Array.isArray(proposal.needs_array) ? proposal.needs_array : [];
  const purposes = [
    { label: 'Wealth Creation / Growth', check: needsArr.includes('investment') || advisory.some(n => n.includes('invest') || n.includes('wealth')) },
    { label: 'Offshore Diversification', check: advisory.some(n => n.includes('offshore')) },
    { label: 'Retirement Planning', check: advisory.some(n => n.includes('retire')) },
    { label: 'Risk Cover / Protection', check: needsArr.includes('risk_cover') || advisory.some(n => n.includes('risk') || n.includes('cover')) },
    { label: 'Capital Preservation', check: advisory.some(n => n.includes('capital') || n.includes('estate')) },
    { label: 'Income Generation', check: advisory.some(n => n.includes('income') || n.includes('tax')) },
  ];
  purposes.forEach((p, i) => {
    const lx = ML + (i % 2) * (CW / 2);
    const ly = y + Math.floor(i / 2) * 6;
    checkbox(doc, p.label, p.check, lx, ly);
  });
  y += Math.ceil(purposes.length / 2) * 6 + 4;

  // ── S4: Financial Profile ─────────────────────────────────────────────────
  y = pb(doc, y, 40, pages, logoDataUrl, clientName);
  y = sectionHead(doc, 4, 'Client Financial Profile', y);
  y = row(doc, 'Annual Income Band', val(proposal.gross_annual_income_band || (proposal.onboarding_import_data?.gross_annual_income_band)), y);
  y = row(doc, 'Net Worth Band', val(proposal.net_worth_band || (proposal.onboarding_import_data?.net_worth_band)), y);
  y = row(doc, 'Monthly Investable Surplus', val(proposal.monthly_investable_surplus || (proposal.onboarding_import_data?.monthly_investable_surplus)), y);
  y = row(doc, 'Liquidity Requirements', val(proposal.client_liquidity_needs), y);
  y = row(doc, 'Investment Horizon', val(proposal.time_horizon), y);

  // ── S5: Risk Profiling ────────────────────────────────────────────────────
  y = pb(doc, y, 40, pages, logoDataUrl, clientName);
  y = sectionHead(doc, 5, 'Risk Profiling Outcome', y);
  const profiles = ['Conservative', 'Cautious', 'Moderate', 'Growth', 'Aggressive'];
  profiles.forEach((p, i) => {
    checkbox(doc, p, p === proposal.risk_profile, ML + i * 36, y);
  });
  y += 8;
  const riskIndicators = [
    'Risk questionnaire completed and signed by client',
    'Client understands the risk/return trade-off',
    'Portfolio volatility appropriate to profile',
    'Liquidity needs considered in profile selection',
  ];
  riskIndicators.forEach(r => {
    checkbox(doc, r, true, ML, y);
    y += 6;
  });

  // ── S6: Basis of Advice ───────────────────────────────────────────────────
  y = pb(doc, y, 50, pages, logoDataUrl, clientName);
  y = sectionHead(doc, 6, 'Basis of Advice', y);
  y = para(doc,
    'This advice is based on information provided by the client during the financial planning process. The advisor has considered the client\'s risk profile, financial position, investment objectives, time horizon and existing portfolio before making these recommendations. The advice is appropriate and suitable for the client\'s circumstances as disclosed.',
    y, 0, 7.5);
  if (proposal.personal_message) {
    y += 2;
    y = para(doc, proposal.personal_message, y, 0, 7.5);
  }

  // ── S7: Product Recommendations ───────────────────────────────────────────
  y = pb(doc, y, 30, pages, logoDataUrl, clientName);
  y = sectionHead(doc, 7, 'Product / Strategy Recommendations', y);

  if (investments.length > 0) {
    y = pb(doc, y, 10, pages, logoDataUrl, clientName);
    y = subHead(doc, 'Investments', y);
    investments.forEach((inv, idx) => {
      y = pb(doc, y, 40, pages, logoDataUrl, clientName);
      // Product header band
      doc.setFillColor(...BG);
      doc.rect(ML, y - 3, CW, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...NAVY);
      doc.text(`Investment ${idx + 1}: ${val(inv.provider)} — ${val(inv.product_type)}`, ML + 2, y + 1.5);
      y += 9;

      y = row(doc, 'Provider', val(inv.provider), y);
      y = row(doc, 'Product Type', val(inv.product_type), y);
      y = row(doc, 'Jurisdiction / Currency', `${val(inv.jurisdiction)} / ${val(inv.currency)}`, y);
      if (inv.amount > 0) y = row(doc, 'Lump Sum Amount', fmtNum(inv.amount, inv.currency), y);
      if (inv.recurring_amount > 0) y = row(doc, `Recurring (${val(inv.frequency)})`, fmtNum(inv.recurring_amount, inv.currency), y);
      y = row(doc, 'Underlying Funds', Array.isArray(inv.underlying_funds) && inv.underlying_funds.length ? inv.underlying_funds.join(', ') : '—', y);
      y = row(doc, 'Term / Structure', val(proposal.time_horizon), y);

      if (inv.reason_for_recommendation) {
        y += 2;
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7);
        doc.setTextColor(...MUTED);
        doc.text('Reason for Recommendation:', ML, y);
        y += 4;
        y = para(doc, inv.reason_for_recommendation, y, 3, 7.5);
      }
      y += 4;
    });
  }

  if (riskProducts.length > 0) {
    y = pb(doc, y, 10, pages, logoDataUrl, clientName);
    y = subHead(doc, 'Risk Products', y);
    riskProducts.forEach((rp, idx) => {
      y = pb(doc, y, 40, pages, logoDataUrl, clientName);
      doc.setFillColor(...BG);
      doc.rect(ML, y - 3, CW, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...NAVY);
      const coverStr = (rp._covers || []).map(c => c.cover_type).join(', ') || '—';
      doc.text(`Risk Product ${idx + 1}: ${val(rp.provider)} — ${coverStr}`, ML + 2, y + 1.5);
      y += 9;

      y = row(doc, 'Provider', val(rp.provider), y);
      (rp._covers || []).forEach(cover => {
        y = row(doc, `${cover.cover_type} — Sum Assured`, cover.amount_required > 0 ? fmtNum(cover.amount_required) : '—', y);
        y = row(doc, `${cover.cover_type} — Monthly Premium`, cover.premium > 0 ? fmtNum(cover.premium) : '—', y);
        if (cover.annual_premium_increase_percent > 0) y = row(doc, 'Annual Premium Increase', fmtPct(cover.annual_premium_increase_percent), y);
        if (cover.annual_cover_increase_percent > 0) y = row(doc, 'Annual Cover Increase', fmtPct(cover.annual_cover_increase_percent), y);
      });
      if (rp.total_premium > 0) y = row(doc, 'Total Monthly Premium', fmtNum(rp.total_premium), y);

      if (rp.reason_for_recommendation) {
        y += 2;
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7);
        doc.setTextColor(...MUTED);
        doc.text('Reason for Recommendation:', ML, y);
        y += 4;
        y = para(doc, rp.reason_for_recommendation, y, 3, 7.5);
      }
      y += 4;
    });
  }

  // ── S8: Motivation ────────────────────────────────────────────────────────
  y = pb(doc, y, 30, pages, logoDataUrl, clientName);
  y = sectionHead(doc, 8, 'Motivation for Recommendation', y);
  if (proposal.personal_message) {
    y = para(doc, proposal.personal_message, y, 0, 7.5);
  } else {
    y = para(doc, 'Based on the client\'s financial profile, risk tolerance and investment objectives, the recommendations above are considered the most appropriate solutions available from our product panel.', y, 0, 7.5);
  }

  // ── S9: Material Risks ────────────────────────────────────────────────────
  y = pb(doc, y, 45, pages, logoDataUrl, clientName);
  y = sectionHead(doc, 9, 'Material Risks Disclosed', y);
  const risks = [
    'Market risk — investment values may fluctuate',
    'Inflation risk — real returns may be eroded over time',
    'Liquidity risk — funds may not be accessible at short notice',
    'Currency risk — offshore investments are subject to exchange rate movements',
    'Counterparty / provider risk — financial soundness of product provider',
  ];
  risks.forEach(r => {
    checkbox(doc, r, true, ML, y);
    y += 6;
  });

  // ── S10: Fees ─────────────────────────────────────────────────────────────
  y = pb(doc, y, 40, pages, logoDataUrl, clientName);
  y = sectionHead(doc, 10, 'Costs, Fees & Remuneration', y);
  if (investments.length > 0) {
    investments.forEach((inv, idx) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...NAVY);
      doc.text(`${val(inv.provider)} — ${val(inv.product_type)}`, ML, y);
      y += 5;
      y = row(doc, 'Initial Advice Fee', fmtPct(inv.initial_fee_percent), y);
      y = row(doc, 'Annual Advice Fee (ongoing)', fmtPct(inv.annual_advice_fee_percent), y);
      y = row(doc, 'Platform Fee', fmtPct(inv.platform_fee_percent), y);
      if (inv.fund_ter_percent) y = row(doc, 'Fund TER', fmtPct(inv.fund_ter_percent), y);
      y += 2;
    });
  } else {
    y = para(doc, 'Fee disclosure not applicable — no investment products recommended.', y, 0, 7.5);
  }

  // ── S11: Alternatives ─────────────────────────────────────────────────────
  y = pb(doc, y, 20, pages, logoDataUrl, clientName);
  y = sectionHead(doc, 11, 'Alternatives Considered', y);
  y = para(doc, 'Alternative products and providers on our accreditation panel were considered. The recommended solutions best match the client\'s risk profile, time horizon, cost structure and objectives as disclosed during the financial planning process.', y, 0, 7.5);

  // ── S12: Replacement ──────────────────────────────────────────────────────
  y = pb(doc, y, 20, pages, logoDataUrl, clientName);
  y = sectionHead(doc, 12, 'Replacement Analysis', y);
  y = row(doc, 'Existing product being replaced', '—', y);
  y = row(doc, 'Replacement justified', '—', y);
  y = row(doc, 'Client informed of implications', '—', y);

  // ── S13: FICA Source of Funds ─────────────────────────────────────────────
  y = pb(doc, y, 40, pages, logoDataUrl, clientName);
  y = sectionHead(doc, 13, 'FICA Source of Funds Declaration', y);
  const sourceFunds = Array.isArray(proposal.onboarding_import_data?.source_of_funds)
    ? proposal.onboarding_import_data.source_of_funds
    : [];
  const fundSources = ['Salary / Employment', 'Business Income', 'Inheritance', 'Investment Returns', 'Sale of Assets', 'Other'];
  fundSources.forEach((f, i) => {
    const lx = ML + (i % 3) * (CW / 3);
    const ly = y + Math.floor(i / 3) * 6;
    checkbox(doc, f, sourceFunds.some(s => s.toLowerCase().includes(f.split(' ')[0].toLowerCase())), lx, ly);
  });
  y += Math.ceil(fundSources.length / 3) * 6 + 4;
  checkbox(doc, 'Client acknowledges all fees and charges: Yes', true, ML, y);
  y += 7;
  checkbox(doc, 'Client informed of all implications of recommendations: Yes', true, ML, y);
  y += 9;

  // ── S14: Limitations ──────────────────────────────────────────────────────
  y = pb(doc, y, 30, pages, logoDataUrl, clientName);
  y = sectionHead(doc, 14, 'Limitations of Advice', y);
  y = para(doc, 'This advice is limited to the financial services and products listed in this Record of Advice. We have not provided advice on matters outside our FSP licence categories. Our advice is based solely on information disclosed by the client — incomplete or inaccurate disclosure may affect the appropriateness of this advice. Past performance of investments does not guarantee future results.', y, 0, 7.5);

  // ── S15: Advisor Declaration ──────────────────────────────────────────────
  y = pb(doc, y, 60, pages, logoDataUrl, clientName);
  y = sectionHead(doc, 15, 'Advisor Declaration', y);
  y = para(doc, 'I, the undersigned, declare that:\n1. I am an authorised representative under FSP 28337 and/or FSP 45624;\n2. I have conducted this advice in accordance with the FAIS General Code of Conduct;\n3. The recommendations made are appropriate and suitable for the client\'s disclosed circumstances;\n4. All material conflicts of interest have been disclosed;\n5. This Record of Advice accurately reflects the advice rendered.', y, 0, 7.5);
  y += 4;
  y = renderSig(doc, proposal, y);

  // ── S16: Client Declaration ───────────────────────────────────────────────
  y = pb(doc, y, 55, pages, logoDataUrl, clientName);
  y = sectionHead(doc, 16, 'Client Declaration', y);
  y = para(doc, 'I, the undersigned, confirm that:\n1. I have read and understood this Record of Advice and the Disclosure Document;\n2. The information I provided is accurate and complete to the best of my knowledge;\n3. I have been made aware of all fees, charges, and material risks;\n4. I accept the recommendations made herein.', y, 0, 7.5);
  y += 4;

  // Client signature block
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text('Client Name:', ML, y);
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.text(clientName, ML + 28, y);
  y += 8;
  doc.setDrawColor(...NAVY);
  doc.line(ML, y, ML + 90, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text('Client Signature', ML, y);
  doc.text('Date: _______________', ML + 95, y);
  y += 12;

  // ═══════════════ ADD FOOTERS TO ALL PAGES ════════════════════════════════
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    if (i > 1) addFooter(doc, i, totalPages, clientName);
  }

  return doc;
}