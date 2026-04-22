import jsPDF from 'jspdf';
import { parseRandValue, formatRand } from '@/lib/constants';

export default function generateProposalPdf(proposal) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const W = 210;
  const margin = 20;
  const contentW = W - margin * 2;
  let y = 0;

  // Colors
  const navy = [14, 65, 102];
  const ocean = [26, 100, 148];
  const teal = [74, 155, 175];
  const gold = [196, 151, 58];
  const white = [255, 255, 255];
  const muted = [138, 154, 170];
  const bg = [247, 249, 251];
  const border = [216, 228, 236];

  // ═══ HEADER BAR ═══
  doc.setFillColor(...navy);
  doc.rect(0, 0, W, 32, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...white);
  doc.text('wealthworks', margin, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('Financial Proposal', W - margin, 11, { align: 'right' });
  doc.setFontSize(7);
  doc.setTextColor(200, 200, 200);
  doc.text(`${proposal.reference}  ·  ${new Date().toLocaleDateString('en-ZA')}`, W - margin, 17, { align: 'right' });
  doc.text('FSP 28337', W - margin, 23, { align: 'right' });
  y = 40;

  // ═══ PREPARED FOR ═══
  doc.setFontSize(7);
  doc.setTextColor(...ocean);
  doc.setFont('helvetica', 'bold');
  doc.text('PREPARED FOR', margin, y);
  y += 5;
  doc.setFontSize(12);
  doc.setTextColor(...navy);
  doc.text(proposal.client_name || '—', margin, y);
  y += 5;
  doc.setFontSize(9);
  doc.setTextColor(...muted);
  doc.text(`${proposal.risk_profile || '—'} risk  ·  ${proposal.time_horizon || '—'} horizon  ·  ${proposal.monthly_budget || '—'} budget`, margin, y);
  y += 4;
  doc.setDrawColor(...border);
  doc.line(margin, y, W - margin, y);
  y += 8;

  // ═══ CLIENT SNAPSHOT ═══
  y = sectionTitle(doc, 'Client Snapshot', margin, y);
  y = row(doc, 'Needs identified', proposal.needs_identified, margin, contentW, y);
  y = row(doc, 'Risk profile', proposal.risk_profile, margin, contentW, y);
  y = row(doc, 'Monthly budget', proposal.monthly_budget, margin, contentW, y);
  y = row(doc, 'Time horizon', proposal.time_horizon, margin, contentW, y);
  y += 4;
  doc.setDrawColor(...border);
  doc.line(margin, y, W - margin, y);
  y += 8;

  // ═══ RECOMMENDATION 1 ═══
  if (proposal.rec1_category || proposal.rec1_provider) {
    y = sectionTitle(doc, proposal.rec1_category || 'Recommendation 1', margin, y);
    y = row(doc, 'Provider', proposal.rec1_provider, margin, contentW, y);
    y = row(doc, 'Cover / amount', proposal.rec1_amount, margin, contentW, y);
    y = row(doc, 'Monthly premium', proposal.rec1_premium, margin, contentW, y);
    y = row(doc, 'Annual fee (TIC)', proposal.rec1_fee, margin, contentW, y);
    y = row(doc, 'WW advisory fee', proposal.rec1_wwfee, margin, contentW, y);
    if (proposal.rec1_rationale) {
      y += 2;
      doc.setFontSize(7);
      doc.setTextColor(...muted);
      doc.text('SUITABILITY RATIONALE', margin, y);
      y += 4;
      doc.setFontSize(8);
      doc.setTextColor(...navy);
      const lines = doc.splitTextToSize(proposal.rec1_rationale, contentW);
      doc.text(lines, margin, y);
      y += lines.length * 4;
    }
    y += 4;
    doc.setDrawColor(...border);
    doc.line(margin, y, W - margin, y);
    y += 8;
  }

  // ═══ RECOMMENDATION 2 ═══
  if (proposal.rec2_category || proposal.rec2_provider) {
    y = checkPageBreak(doc, y, 60);
    y = sectionTitle(doc, proposal.rec2_category || 'Recommendation 2', margin, y);
    y = row(doc, 'Provider', proposal.rec2_provider, margin, contentW, y);
    y = row(doc, 'Cover / amount', proposal.rec2_amount, margin, contentW, y);
    y = row(doc, 'Monthly premium', proposal.rec2_premium, margin, contentW, y);
    y = row(doc, 'Annual fee (TIC)', proposal.rec2_fee, margin, contentW, y);
    y = row(doc, 'WW advisory fee', proposal.rec2_wwfee, margin, contentW, y);
    if (proposal.rec2_rationale) {
      y += 2;
      doc.setFontSize(7);
      doc.setTextColor(...muted);
      doc.text('SUITABILITY RATIONALE', margin, y);
      y += 4;
      doc.setFontSize(8);
      doc.setTextColor(...navy);
      const lines = doc.splitTextToSize(proposal.rec2_rationale, contentW);
      doc.text(lines, margin, y);
      y += lines.length * 4;
    }
    y += 4;
    doc.setDrawColor(...border);
    doc.line(margin, y, W - margin, y);
    y += 8;
  }

  // ═══ RECOMMENDATION 3 ═══
  if (proposal.rec3_category || proposal.rec3_amount) {
    y = checkPageBreak(doc, y, 40);
    y = sectionTitle(doc, proposal.rec3_category || 'Recommendation 3', margin, y);
    y = row(doc, 'Provider', proposal.rec3_provider, margin, contentW, y);
    y = row(doc, 'Amount / contribution', proposal.rec3_amount, margin, contentW, y);
    y = row(doc, 'Fee', proposal.rec3_fee, margin, contentW, y);
    if (proposal.rec3_rationale) {
      y += 2;
      doc.setFontSize(7);
      doc.setTextColor(...muted);
      doc.text('SUITABILITY RATIONALE', margin, y);
      y += 4;
      doc.setFontSize(8);
      doc.setTextColor(...navy);
      const lines = doc.splitTextToSize(proposal.rec3_rationale, contentW);
      doc.text(lines, margin, y);
      y += lines.length * 4;
    }
    y += 4;
    doc.setDrawColor(...border);
    doc.line(margin, y, W - margin, y);
    y += 8;
  }

  // ═══ TOTAL ═══
  y = checkPageBreak(doc, y, 30);
  y = sectionTitle(doc, 'Total Monthly Commitment', margin, y);
  const t1 = parseRandValue(proposal.rec1_premium);
  const t2 = parseRandValue(proposal.rec2_premium);
  y = row(doc, 'Rec 1', proposal.rec1_premium || '—', margin, contentW, y);
  y = row(doc, 'Rec 2', proposal.rec2_premium || '—', margin, contentW, y);
  y += 2;
  doc.setDrawColor(...navy);
  doc.line(margin, y, W - margin, y);
  y += 5;
  doc.setFontSize(11);
  doc.setTextColor(...navy);
  doc.setFont('helvetica', 'bold');
  doc.text('Total', margin, y);
  doc.text(t1 + t2 > 0 ? formatRand(t1 + t2) : '—', W - margin, y, { align: 'right' });
  y += 10;

  // ═══ PERSONAL MESSAGE ═══
  if (proposal.personal_message) {
    y = checkPageBreak(doc, y, 30);
    doc.setDrawColor(...border);
    doc.line(margin, y, W - margin, y);
    y += 8;
    doc.setFontSize(7);
    doc.setTextColor(...ocean);
    doc.setFont('helvetica', 'bold');
    doc.text('MESSAGE FROM YOUR ADVISOR', margin, y);
    y += 5;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...navy);
    const msgLines = doc.splitTextToSize(proposal.personal_message, contentW);
    doc.text(msgLines, margin, y);
    y += msgLines.length * 4.5 + 6;
  }

  // ═══ ADVISOR SIGNATURE ═══
  y = checkPageBreak(doc, y, 50);
  doc.setDrawColor(...border);
  doc.line(margin, y, W - margin, y);
  y += 8;
  doc.setFontSize(7);
  doc.setTextColor(...navy);
  doc.setFont('helvetica', 'bold');
  doc.text('ADVISOR SIGNATURE', margin, y);
  y += 6;

  if (proposal.advisor_signature_type === 'draw' && proposal.advisor_signature_data) {
    doc.addImage(proposal.advisor_signature_data, 'PNG', margin, y, 60, 18);
    y += 22;
  } else if (proposal.advisor_signature_type === 'type' && proposal.advisor_signature_data) {
    doc.setFont('times', 'italic');
    doc.setFontSize(18);
    doc.setTextColor(...navy);
    doc.text(proposal.advisor_signature_data, margin, y + 6);
    y += 14;
  }

  doc.setDrawColor(...navy);
  doc.line(margin, y, margin + 80, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...navy);
  doc.text(proposal.advisor_name || '—', margin, y);
  y += 4;
  doc.setTextColor(...muted);
  doc.setFontSize(7);
  doc.text(`Signed: ${proposal.sign_date || '—'}`, margin, y);
  y += 12;

  // ═══ CLIENT SIGNATURE SECTION ═══
  y = checkPageBreak(doc, y, 50);
  doc.setFillColor(...bg);
  doc.rect(margin, y, contentW, 40, 'F');
  doc.setDrawColor(...border);
  doc.rect(margin, y, contentW, 40, 'S');
  y += 8;
  doc.setFontSize(7);
  doc.setTextColor(...navy);
  doc.setFont('helvetica', 'bold');
  doc.text('CLIENT ACCEPTANCE', margin + 6, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...muted);
  doc.text('I have read and understand the above recommendations.', margin + 6, y);
  y += 12;
  doc.setDrawColor(...navy);
  doc.line(margin + 6, y, margin + 86, y);
  y += 4;
  doc.setFontSize(7);
  doc.setTextColor(...navy);
  doc.text(`${proposal.client_name || '—'}  ·  Date: _______________`, margin + 6, y);
  y += 14;

  // ═══ FOOTER / DISCLAIMER ═══
  y = checkPageBreak(doc, y, 20);
  doc.setDrawColor(...border);
  doc.line(margin, y, W - margin, y);
  y += 5;
  doc.setFontSize(6);
  doc.setTextColor(...muted);
  const disclaimer = [
    'This proposal does not constitute a binding offer and is subject to underwriting where applicable.',
    'Wealth Works (Pty) Ltd — FSP 28337 (Category I)  |  Wealthworks Investments (Pty) Ltd — FSP 45624 (Category II)',
    'This document is confidential and intended solely for the named recipient.'
  ];
  disclaimer.forEach(line => {
    doc.text(line, W / 2, y, { align: 'center' });
    y += 3.5;
  });

  return doc;
}

function sectionTitle(doc, title, x, y) {
  doc.setFontSize(8);
  doc.setTextColor(14, 65, 102);
  doc.setFont('helvetica', 'bold');
  doc.text(title.toUpperCase(), x, y);
  return y + 6;
}

function row(doc, label, value, x, w, y) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(138, 154, 170);
  doc.text(label, x, y);
  doc.setTextColor(14, 65, 102);
  doc.setFont('helvetica', 'bold');
  doc.text(value || '—', x + w, y, { align: 'right' });
  return y + 5;
}

function checkPageBreak(doc, y, needed) {
  if (y + needed > 280) {
    doc.addPage();
    return 20;
  }
  return y;
}