import jsPDF from 'jspdf';

const fmtDate = (val) => {
  if (!val) return '—';
  if (/^\d{2}-\d{2}-\d{4}$/.test(val)) return val;
  if (/^\d{4}-\d{2}-\d{2}/.test(val)) {
    const [y, m, d] = val.split('T')[0].split('-');
    return `${d}-${m}-${y}`;
  }
  try {
    const d = new Date(val);
    if (!isNaN(d)) return [String(d.getDate()).padStart(2,'0'),String(d.getMonth()+1).padStart(2,'0'),d.getFullYear()].join('-');
  } catch(_) {}
  return val;
};

const todayDMY = () => {
  const d = new Date();
  return [String(d.getDate()).padStart(2,'0'),String(d.getMonth()+1).padStart(2,'0'),d.getFullYear()].join('-');
};

const fmtR = (val) => {
  if (!val && val !== 0) return '—';
  const n = parseFloat(String(val).replace(/[^0-9.]/g, ''));
  if (isNaN(n)) return String(val);
  return 'R ' + n.toLocaleString('en-ZA');
};

export default function generateProposalPdf(proposal, investments = [], riskProducts = []) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const W = 210, H = 297, M = 20, CW = W - M * 2;
  let y = 0, pageNum = 0;

  const navy=[14,65,102], ocean=[26,100,148], teal=[74,155,175], white=[255,255,255],
        muted=[138,154,170], bg=[247,249,251], border=[216,228,236], black=[30,30,30];

  const addLogoTopRight = () => {
    doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(...navy);
    doc.text('wealthworks', W-M, 12, {align:'right'});
    doc.setFont('helvetica','normal'); doc.setFontSize(6); doc.setTextColor(...muted);
    doc.text('FSP 28337  |  FSP 45624', W-M, 17, {align:'right'});
  };

  const addFooter = (pn) => {
    const fy = H - 10;
    doc.setDrawColor(...border); doc.line(M, fy-3, W-M, fy-3);
    doc.setFont('helvetica','normal'); doc.setFontSize(6); doc.setTextColor(...muted);
    doc.text('Wealth Works (Pty) Ltd FSP 28337  |  Wealthworks Investments (Pty) Ltd FSP 45624', M, fy);
    doc.text(String(pn), W/2, fy, {align:'center'});
    doc.text('Initials: ___________', W-M, fy, {align:'right'});
  };

  const roaPb = (needed) => {
    if (y + needed > H - 18) {
      addFooter(pageNum); doc.addPage(); pageNum += 1; y = 28; addLogoTopRight();
    }
  };

  const hRule = () => { doc.setDrawColor(...border); doc.line(M,y,W-M,y); y += 6; };

  const secTitle = (title, color=navy) => {
    roaPb(12); doc.setFont('helvetica','bold'); doc.setFontSize(7);
    doc.setTextColor(...color); doc.text(title.toUpperCase(), M, y); y += 5;
  };

  const dataRow = (label, value) => {
    roaPb(6); doc.setFont('helvetica','normal'); doc.setFontSize(8);
    doc.setTextColor(...muted); doc.text(String(label), M, y);
    doc.setFont('helvetica','bold'); doc.setTextColor(...navy);
    doc.text(String(value||'—'), W-M, y, {align:'right'}); y += 5;
  };

  const bodyText = (text, size=8) => {
    if (!text) return;
    roaPb(10); doc.setFont('helvetica','normal'); doc.setFontSize(size);
    doc.setTextColor(...black);
    const lines = doc.splitTextToSize(String(text), CW);
    lines.forEach(line => { roaPb(5); doc.text(line, M, y); y += 4.5; });
    y += 2;
  };

  const tickItem = (label, checked) => {
    if (!checked) return;
    roaPb(6); doc.setFontSize(8); doc.setTextColor(...black);
    doc.setFont('helvetica','bold'); doc.text('/', M, y);
    doc.setFont('helvetica','normal'); doc.text(label, M+6, y); y += 5;
  };

  const checkBox = (label, checked) => {
    roaPb(6); doc.setFontSize(8); doc.setTextColor(...black);
    doc.setDrawColor(...navy); doc.rect(M, y-3.5, 3.5, 3.5);
    if (checked) { doc.setFont('helvetica','bold'); doc.text('✓', M+0.3, y-0.2); }
    doc.setFont('helvetica','normal'); doc.text(label, M+6, y); y += 5;
  };

  const signLine = (label, width=80) => {
    roaPb(16); doc.setDrawColor(...navy); doc.line(M, y, M+width, y); y += 4;
    doc.setFontSize(7); doc.setTextColor(...muted); doc.text(label, M, y); y += 8;
  };

  const statusItem = (label) => {
    roaPb(6); doc.setFontSize(8); doc.setTextColor(...navy);
    doc.setFont('helvetica','normal'); doc.text(`• ${label}`, M, y); y += 5;
  };

  const spacer = (h) => { y += h; };

  const h3 = (text) => {
    roaPb(8); doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.setTextColor(...ocean);
    doc.text(text, M, y); y += 5;
  };

  const table = (rows) => {
    const colW = [CW * 0.35, CW * 0.65];
    roaPb(rows.length * 5);
    rows.forEach((row, idx) => {
      doc.setFontSize(8); doc.setTextColor(...black);
      if (idx === 0) { doc.setFont('helvetica','bold'); doc.setTextColor(...navy); }
      else { doc.setFont('helvetica','normal'); }
      const label = String(row[0] || '');
      const value = String(row[1] || '—');
      doc.text(label, M, y);
      const lines = doc.splitTextToSize(value, colW[1]);
      if (lines.length > 1) {
        doc.text(lines[0], M + colW[0] + 2, y);
        let lineY = y + 4;
        for (let i = 1; i < lines.length; i++) {
          doc.text(lines[i], M + colW[0] + 2, lineY);
          lineY += 4;
          y += 4;
        }
      } else {
        doc.text(value, M + colW[0] + 2, y);
      }
      y += 5;
    });
  };

  const thinRule = () => { roaPb(5); doc.setDrawColor(...border); doc.line(M, y, W-M, y); y += 2; };

  const pb = (needed) => { roaPb(needed); };

  // Parse
  const clientName = proposal.client_name || '—';
  const advisorName = proposal.advisor_name || 'Trevor Fine';
  const riskProfile = proposal.risk_profile || '—';
  const timeHorizon = proposal.time_horizon || '—';
  const reference = proposal.reference || '—';
  const signDate = fmtDate(proposal.sign_date) || todayDMY();
  const today = todayDMY();
  const advisoryNeeds = Array.isArray(proposal.advisory_needs) ? proposal.advisory_needs : [];
  const sourceOfFunds = Array.isArray(proposal.source_of_funds) ? proposal.source_of_funds : [];
  const normalisedRiskProducts = riskProducts.map(rp => ({...rp, covers: rp.covers || rp._covers || []}));

  // ── PAGE 1: COVER (clean white, logo top right, no navy banner) ────────────
  pageNum = 1; y = 20;
  addLogoTopRight();
  y = 50;
  doc.setFont('helvetica','bold'); doc.setFontSize(22); doc.setTextColor(...navy);
  doc.text('Financial Proposal', M, y); y += 10;
  doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(...muted);
  doc.text('Prepared for', M, y); y += 6;
  doc.setFont('helvetica','bold'); doc.setFontSize(14); doc.setTextColor(...navy);
  doc.text(clientName, M, y); y += 8;
  doc.setDrawColor(...border); doc.line(M, y, M+80, y); y += 8;

  [['Reference',reference],['Date',today],['Advisor',advisorName],
   ['FSP Numbers','FSP 28337  |  FSP 45624'],['Risk Profile',riskProfile],['Time Horizon',timeHorizon]
  ].forEach(([label, value]) => {
    doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(...muted);
    doc.text(label, M, y);
    doc.setFont('helvetica','bold'); doc.setTextColor(...navy);
    doc.text(String(value), M+45, y); y += 6;
  });
  addFooter(pageNum);

  // ── PAGES 2–3: DISCLOSURE & TERMS OF BUSINESS ─────────────────────────────
  doc.addPage(); pageNum = 2; y = 28; addLogoTopRight();
  doc.setFont('helvetica','bold'); doc.setFontSize(12); doc.setTextColor(...navy);
  doc.text('DISCLOSURE AND TERMS OF BUSINESS', M, y); y += 8;
  doc.setDrawColor(...navy); doc.line(M, y, W-M, y); y += 8;

  const disclosureSections = [
    ['INTRODUCTION','Thank you for affording me the opportunity to review your insurance/financial portfolio. In the spirit of transparency and to ensure that you have the information necessary to make an informed decision in terms of my role as your advisor and intermediary, I would like to provide you with some background regarding myself and our business, as well as information required in terms of the Financial Intermediary Act 37 of 2002 (FAIS). This Disclosure and Terms of Business Document supports our commitment to a full disclosure of all relevant and material information appropriate to your insurance requirements, enabling you to make well-informed decisions during the course of our professional relationship with you.'],
    ['OUR DETAILS','Full trade name: Wealth Works (Pty) Ltd | Registration number: 2006/018307/07 | FAIS licence number: 28337 (Category 1)\n\nFull trade name: Wealthworks Investments (Pty) Ltd | Registration number: 2012/215566/07 | FAIS licence number: 45624 (Category 2)\n\nWe are licensed to provide advice and discretionary intermediary services on financial products for which we are remunerated by means of statutory commission and fees.\n\nFinancial products we are authorised to advise on: Long-Term Insurance Category A, B and C | Retail Pension Benefits | Pension Funds Benefits (excluding retail) | Participatory interests in Collective Investment Schemes'],
    ['KEY INDIVIDUALS','Trevor Fine – B Compt H DIP Tax CFP\nMalcolm Munsamy – Certificate in Financial Planning, RE5, RE1\nRoger Eskinazi – Higher Diploma Financial Markets, MBA (Cum Laude), RE5/RE1/RE3'],
    ['BUSINESS ADDRESS','1st Floor, Dunkeld Place, 12 North Road, Dunkeld West | Tel: 011 325 2514\nCube Workspace, The Pavilion Building, Corner Dock and Portswood Road, V&A Waterfront 8001'],
    ['COMPLIANCE OFFICER','Justin Joannides – Crux Compliance Practitioners CO3485 | Tel: 011-234 4991 | justin@cruxconsulting.co.za'],
    ['ACCREDITED PROVIDERS','Allan Gray | Discovery Life | Hollard | Liberty | PPS | Momentum | Sanlam | Investec | Prime | Gryphon | Julius Baer | Credo | Old Mutual | Bright Rock'],
    ['CONFLICTS OF INTEREST','We have adopted and implemented a Conflict of Interest Management Policy. In the event of a potential conflict of interest, the interest of our client will be accorded priority over our own interests. A copy of our policy is available upon written request.'],
    ['COMPLAINTS','Contact: Trevor Fine | trevor@wealthworks.co.za | 1st Floor, Dunkeld Place, 12 North Road, Dunkeld West, 2196\n\nFAIS Ombud: Kasteel Office Park, Orange Building 2nd Floor, 546 Jochemus Street, Erasmuskloof, Pretoria 0048 | info@faisombud.co.za | 012 762 5000'],
    ['PRIVACY STATEMENT','Personal Information refers to information about you, your spouse, your dependents and your beneficiaries. By proceeding, you give us permission to process personal information for the purpose of rendering sound financial advice, quotation and application purposes, obtaining information from financial institutions, and for administration purposes within the group. We will not sell, share or disclose your personal information to any third parties without your consent, except where required to do so by law.'],
    ['TERMS OF ENGAGEMENT','Our engagement is governed by the following terms:\n\n1. We will act in your best interests at all times and provide advice that is appropriate to your financial needs and circumstances.\n2. We will disclose all material information relevant to the advice provided.\n3. We will maintain the confidentiality of all information you provide to us.\n4. Our remuneration is disclosed in the relevant product documentation and in this proposal.\n5. You have the right to cancel any product within the cooling-off period specified in the product terms.\n6. This proposal does not constitute a binding offer and is subject to underwriting where applicable.\n7. Past performance is not indicative of future results. Investments are subject to market risk.'],
    ['COOLING-OFF RIGHTS','You have the right to cancel certain financial products within a stipulated cooling-off period without penalty. This period is typically 30 days from inception of the policy or investment. Please refer to the specific product documentation for the applicable cooling-off terms. Cancellation requests must be submitted in writing to the relevant product provider.'],
    ['PROFESSIONAL INDEMNITY','Wealth Works (Pty) Ltd and Wealthworks Investments (Pty) Ltd maintain professional indemnity insurance as required under the FAIS Act. Details of the insurer and policy limits are available upon request.'],
  ];

  disclosureSections.forEach(([heading, text]) => {
    if (y + 20 > H - 18) { addFooter(pageNum); doc.addPage(); pageNum += 1; y = 28; addLogoTopRight(); }
    doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.setTextColor(...navy);
    doc.text(heading, M, y); y += 5;
    doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(...black);
    const lines = doc.splitTextToSize(text, CW);
    lines.forEach(l => {
      if (y + 5 > H - 18) { addFooter(pageNum); doc.addPage(); pageNum += 1; y = 28; addLogoTopRight(); }
      doc.text(l, M, y); y += 4;
    });
    y += 4;
  });
  addFooter(pageNum);

  // ── PAGES 4+: RECORD OF ADVICE (ROA) — ALL 16 SECTIONS ───────────────────
  doc.addPage(); pageNum += 1; y = 28; addLogoTopRight();
  doc.setFont('helvetica','bold'); doc.setFontSize(12); doc.setTextColor(...navy);
  doc.text('RECORD OF ADVICE (ROA)', M, y); y += 6;
  doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(...muted);
  doc.text('Wealth Works (Pty) Ltd FSP 28337  |  Wealthworks Investments (Pty) Ltd FSP 45624', M, y); y += 8;
  doc.setDrawColor(...navy); doc.line(M, y, W-M, y); y += 8;

  // Section 1
  secTitle('1. Client Details (FICA Verified)');
  dataRow('Client / Entity Name', clientName);
  dataRow('ID or Registration Number', proposal.client_id_number || '—');
  dataRow('Date of Birth', fmtDate(proposal.client_dob) || '—');
  dataRow('Email', proposal.client_email || '—');
  dataRow('Mobile Number', proposal.client_mobile || '—');
  const rawType = proposal.client_type || '';
  let clientTypeDisplay = 'Individual';
  if (rawType==='trust') clientTypeDisplay='Trust';
  else if (rawType==='company'||rawType==='entity') clientTypeDisplay='Company';
  else if (rawType&&rawType!=='natural_person'&&rawType!=='individual') clientTypeDisplay=rawType.charAt(0).toUpperCase()+rawType.slice(1);
  dataRow('Client Type', clientTypeDisplay);
  y += 2;
  roaPb(30);
  doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.setTextColor(...navy);
  doc.text('FICA Verification Checklist', M, y); y += 5;
  ['Identity Verified','Proof of Address Verified','Source of Funds Confirmed','Beneficial Ownership Verified (if applicable)'].forEach(item => checkBox(item, false));
  y += 2; hRule();

  // Section 2
  secTitle('2. Financial Services Provider Details');
  dataRow('FSP Name', 'Wealth Works (Pty) Ltd  |  Wealthworks Investments (Pty) Ltd');
  dataRow('FSP Licence Number', '28337  |  45624');
  dataRow('Advisor Name', advisorName);
  dataRow('Date of Advice', today);
  y += 2; roaPb(30);
  doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.setTextColor(...navy);
  doc.text('Compliance Disclosures Provided:', M, y); y += 5;
  ['FAIS Disclosure Letter / Terms of Business','Conflict of Interest Policy','Complaints Resolution Process'].forEach(item => checkBox(item, false));
  y += 2; hRule();

  // Section 3
  secTitle('3. Purpose of Advice / Advisory Needs Identified');
  [['Local investments',['local','investment','wealth','growth','local and offshore']],
   ['Offshore investments',['offshore']],
   ['Life & risk cover',['life','risk cover','risk','insurance']],
   ['Tax planning',['tax']],
   ['Business assurance',['business']],
   ['Retirement planning',['retirement']],
   ['Education planning',['education']],
   ['Estate planning',['estate']],
  ].forEach(([label, keywords]) => {
    const checked = keywords.some(kw => advisoryNeeds.some(n => String(n).toLowerCase().includes(kw)));
    tickItem(label, checked);
  });
  y += 2; hRule();

  // Section 4
  secTitle('4. Client Financial Profile');
  dataRow('Annual Income Band', proposal.annual_income_band || proposal.gross_annual_income_band || '—');
  dataRow('Net Worth Band', proposal.net_worth_band || '—');
  dataRow('Liquidity Requirement', proposal.liquidity_requirement || proposal.client_liquidity_needs || '—');
  dataRow('Investment Horizon', timeHorizon);
  dataRow('Tax Residency', proposal.tax_residency || '—');
  y += 2; hRule();

  // Section 5
  secTitle('5. Risk Profiling Outcome');
  dataRow('Risk Profile Outcome', riskProfile);
  y += 2; roaPb(30);
  doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.setTextColor(...navy);
  doc.text('Factors considered in risk assessment:', M, y); y += 5;
  ['Tolerance for volatility','Investment time horizon','Liquidity needs','Reaction to market declines','Investment experience'].forEach(item => tickItem(item, true));
  y += 2; hRule();

  // Section 6
  secTitle('6. Basis of Advice');
  bodyText('This recommendation is based on: the client\'s stated objectives, the financial profile disclosed, the assessed risk tolerance, and current market conditions and product suitability. The advice provided is appropriate to the client\'s circumstances and aligns with their risk-return expectations. All relevant information has been considered and the basis of advice is consistent with the client\'s best interests as required under FAIS.');
  hRule();

  // Section 7
  secTitle('7. Product / Strategy Recommendation');
  if (investments.length > 0) {
    roaPb(15); doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(...ocean);
    doc.text('Investment Products', M, y); y += 5;
    investments.forEach((inv, i) => {
      roaPb(40);
      doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(...navy);
      doc.text(inv.provider||'—', M, y);
      doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(...muted);
      doc.text([inv.jurisdiction,inv.currency].filter(Boolean).join(' · '), W-M, y, {align:'right'}); y += 5;
      dataRow('Product Type', inv.product_type||'—');
      if (inv.amount>0) dataRow('Lump Sum', `${inv.currency||'R'} ${Number(inv.amount).toLocaleString('en-ZA')}`);
      if (inv.recurring_amount>0) dataRow('Recurring Contribution', `${inv.currency||'R'} ${Number(inv.recurring_amount).toLocaleString('en-ZA')}`);
      if (Array.isArray(inv.underlying_funds)&&inv.underlying_funds.length>0) dataRow('Underlying Funds', inv.underlying_funds.join(', '));
      if (inv.reason_for_recommendation) {
        y += 2; doc.setFont('helvetica','italic'); doc.setFontSize(7.5); doc.setTextColor(...muted);
        doc.splitTextToSize(`Reason: ${inv.reason_for_recommendation}`, CW).forEach(l => { roaPb(5); doc.text(l,M,y); y+=4; });
        y += 2;
      }
      if (i<investments.length-1) { y+=2; doc.setDrawColor(...border); doc.line(M,y,W-M,y); y+=4; }
    });
    y += 4;
  }
  if (normalisedRiskProducts.length > 0) {
    roaPb(15); doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(...teal);
    doc.text('Risk Cover Products', M, y); y += 5;
    normalisedRiskProducts.forEach((rp, i) => {
      roaPb(30);
      doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(...navy);
      doc.text(rp.provider||'—', M, y); y += 5;
      rp.covers.forEach(cover => {
        dataRow(cover.cover_type, `Premium: ${fmtR(cover.premium)} pm`);
        if (cover.amount_required>0) dataRow('  Sum Assured', fmtR(cover.amount_required));
      });
      if (rp.total_premium>0) { doc.setTextColor(...teal); dataRow('Total Monthly Premium', fmtR(rp.total_premium)); doc.setTextColor(...navy); }
      if (rp.reason_for_recommendation) {
        y+=2; doc.setFont('helvetica','italic'); doc.setFontSize(7.5); doc.setTextColor(...muted);
        doc.splitTextToSize(`Reason: ${rp.reason_for_recommendation}`, CW).forEach(l => { roaPb(5); doc.text(l,M,y); y+=4; });
        y+=2;
      }
      if (i<normalisedRiskProducts.length-1) { y+=2; doc.setDrawColor(...border); doc.line(M,y,W-M,y); y+=4; }
    });
  }
  y += 2; hRule();

  // Section 8
  secTitle('8. Motivation for Recommendation');
  bodyText(proposal.overall_suitability_rationale || proposal.investment_rationale || proposal.risk_cover_rationale ||
    'This recommendation is suitable because it aligns with the client\'s stated objectives, the risk profile of the recommended products matches the client\'s assessed risk tolerance, the investment horizon is appropriate for the selected strategies, and the product structure supports the client\'s liquidity requirements and financial profile.');
  hRule();

  // Section 9
  secTitle('9. Material Risks Disclosed to Client');
  ['Market volatility and potential capital loss','Liquidity constraints (where applicable)','Product-specific risks',
   'Currency and exchange rate risks (for offshore products)','Early withdrawal penalties','Inflation risk','Counterparty risk'
  ].forEach(r => tickItem(r, true));
  y += 2; hRule();

  // Section 10
  secTitle('10. Costs, Fees & Remuneration');
  bodyText('The client has been informed of all applicable costs and fees including: initial advice fees, ongoing advice fees, product administration costs, and advisor remuneration / commission where applicable. All fees are disclosed in the relevant product documentation.');
  investments.forEach(inv => {
    if (inv.initial_fee_percent>0) dataRow(`${inv.provider} — Initial fee`, `${inv.initial_fee_percent}%`);
    if (inv.annual_advice_fee_percent>0) dataRow(`${inv.provider} — Annual advice fee`, `${inv.annual_advice_fee_percent}%`);
  });
  y += 2; hRule();

  // Section 11 — Replacement of Existing Products
  spacer(8);
  h3('11. Replacement of Existing Products');
  spacer(2);
  const replacementProducts = Array.isArray(proposal.replacement_products) ? proposal.replacement_products : [];
  const isReplacement = proposal.is_replacement === true || proposal.is_replacement === 'Yes';

  if (!isReplacement || replacementProducts.length === 0) {
    statusItem('No existing products are being replaced in this recommendation');
  } else {
    statusItem('This advice involves the replacement of existing financial products');
    spacer(4);
    replacementProducts.forEach((rep, i) => {
      pb(50);
      doc.setFont('helvetica','bold'); doc.setFontSize(8.5); doc.setTextColor(...navy);
      doc.text(`Replacement ${i + 1}`, M, y); y += 6;
      table([
        ['Existing Provider', rep.existing_product_provider || '—'],
        ['Existing Product', rep.existing_product_type || '—'],
        ...(rep.existing_policy_number ? [['Policy Number', rep.existing_policy_number]] : []),
        ['Replaced By', rep.replacing_investment_label || '—'],
        ['Penalties Disclosed', rep.penalties_disclosed ? 'Yes' : 'No'],
        ['Waiting Periods Disclosed', rep.waiting_periods_disclosed ? 'Yes' : 'No'],
      ]);
      if (rep.replacement_reason) {
        spacer(2);
        doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.setTextColor(...ocean);
        doc.text('REASON FOR REPLACEMENT', M, y); y += 5;
        doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(...black);
        const lines = doc.splitTextToSize(rep.replacement_reason, CW);
        lines.forEach(l => { pb(5); doc.text(l, M, y); y += 4.5; });
        y += 3;
      }
      if (i < replacementProducts.length - 1) { spacer(4); thinRule(); spacer(4); }
    });
  }
  y += 2; hRule();

  // Section 12
  secTitle('12. Alternative Products Considered');
  bodyText(proposal.alternatives_considered ||
    'Alternative products from accredited providers were considered in arriving at this recommendation. The selected product(s) were determined to be the most suitable based on the client\'s financial profile, risk tolerance, stated objectives, and cost-benefit analysis. Details of alternatives are available upon request.');
  y += 2; hRule();

  // Section 13
  secTitle('13. FICA — Source of Funds Declaration');
  [['Salary / Employment income',['salary','employment']],
   ['Business income / Profits',['business']],
   ['Investment proceeds / Returns',['investment','proceeds']],
   ['Inheritance / Gift',['inheritance','gift']],
   ['Retirement / Pension income',['retirement','pension']],
   ['Property / Asset sale',['property','asset','sale']],
   ['Other',['other']],
  ].forEach(([label, keywords]) => {
    const checked = keywords.some(kw => sourceOfFunds.some(s => String(s).toLowerCase().includes(kw)));
    tickItem(label, checked);
  });
  y += 2; hRule();

  // Section 14
  secTitle('14. Specific Needs Analysis');
  bodyText(proposal.specific_needs_analysis ||
    `The client's identified advisory needs are: ${advisoryNeeds.join(', ')||'as discussed'}. The client's risk profile is ${riskProfile} with a time horizon of ${timeHorizon}. All recommendations are tailored to the client's specific circumstances as disclosed during the advice process.`);
  y += 2; hRule();

  // Section 15
  roaPb(60);
  secTitle('15. Advisor Declaration');
  bodyText('I confirm that: the advice provided is appropriate and suitable to the client\'s needs and circumstances, all disclosures required under the FAIS Act have been made, this recommendation is in the client\'s best interest, and the information in this Record of Advice is accurate and complete to the best of my knowledge.');
  dataRow('Advisor Name', advisorName);
  dataRow('Date', signDate);
  y += 6;
  if (proposal.advisor_signature_type==='draw' && proposal.advisor_signature_data) {
    roaPb(25); doc.addImage(proposal.advisor_signature_data,'PNG',M,y,60,18); y += 22;
  } else if (proposal.advisor_signature_type==='type' && proposal.advisor_signature_data) {
    roaPb(20); doc.setFont('times','italic'); doc.setFontSize(16); doc.setTextColor(...navy);
    doc.text(proposal.advisor_signature_data, M, y+6); y += 14;
  }
  doc.setDrawColor(...navy); doc.line(M,y,M+80,y); y+=4;
  doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(...muted);
  doc.text(`Advisor Signature  ·  Date: ${signDate}`, M, y); y+=10;
  hRule();

  // Section 16
  roaPb(50);
  secTitle('16. Client Declaration & Acceptance');
  bodyText('I confirm that: I have provided complete and accurate information to the advisor, the advice and all associated risks have been explained to me in a clear and understandable manner, I understand the recommended product(s) and their implications, I have had the opportunity to ask questions and received satisfactory answers, and I accept the recommendations as set out in this Record of Advice.');
  dataRow('Client Name', clientName);
  y += 4;
  signLine(`Client Signature  ·  Date: _______________`, 80);

  if (proposal.personal_message) {
    roaPb(30); doc.setFont('helvetica','bold'); doc.setFontSize(7); doc.setTextColor(...ocean);
    doc.text('MESSAGE FROM YOUR ADVISOR', M, y); y+=5;
    doc.setFont('helvetica','italic'); doc.setFontSize(8.5); doc.setTextColor(...navy);
    doc.splitTextToSize(proposal.personal_message, CW).forEach(l => { roaPb(5); doc.text(l,M,y); y+=4.5; });
    y+=4;
  }
  addFooter(pageNum);

  // ── MANDATE (appended only if mandate_included = "Yes") ───────────────────
  const inclA = proposal.include_annexure_A === true;
  const inclB = proposal.include_annexure_B === true;
  const inclC = proposal.include_annexure_C === true;
  const h1 = (text) => { roaPb(12); doc.setFont('helvetica','bold'); doc.setFontSize(14); doc.setTextColor(...navy); doc.text(text, M, y); y += 8; };
  const h2 = (text, color=navy) => { roaPb(10); doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.setTextColor(...color); doc.text(text, M, y); y += 6; };
  const body = (text) => { roaPb(8); doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(...black); const lines = doc.splitTextToSize(text, CW); lines.forEach(l => { roaPb(5); doc.text(l, M, y); y += 4.5; }); };
  const bullet = (text) => { roaPb(6); doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(...black); const lines = doc.splitTextToSize(text, CW-6); lines.forEach((l, i) => { roaPb(5); if (i===0) doc.text('• '+l, M, y); else doc.text(l, M+3, y); y += 4.5; }); };
  const mandateThinRule = () => { roaPb(5); doc.setDrawColor(...border); doc.line(M, y, W-M, y); y += 2; };
  const advisorSignatureBlock = () => { if (proposal.advisor_signature_type==='draw'&&proposal.advisor_signature_data) { roaPb(20); doc.addImage(proposal.advisor_signature_data,'PNG',M,y,50,15); y+=18; } else if (proposal.advisor_signature_type==='type'&&proposal.advisor_signature_data) { roaPb(15); doc.setFont('times','italic'); doc.setFontSize(12); doc.setTextColor(...navy); doc.text(proposal.advisor_signature_data, M, y+3); y+=10; } };
  const addHeader = () => { addLogoTopRight(); };

  if (proposal.mandate_included==='Yes') {
    doc.addPage(); pageNum+=1; y=34; addHeader();
    h1('Consolidated Discretionary Mandate'); thinRule(); spacer(4);
    body(`Between WEALTHWORKS INVESTMENTS (PTY) LTD, Registration Number 2012/215566/07 ("The FSP") and:`);
    spacer(4);
    const mandateInvs = investments.filter(inv => inv.investment_mandate === 'Yes');
    if (mandateInvs.length > 0) {
      h2('Investments Under Mandate', ocean); spacer(2);
      mandateInvs.forEach(inv => {
        roaPb(8);
        doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(...black);
        doc.text(`${inv.provider||'—'} — ${inv.product_type||'—'}`, M, y);
        doc.setFont('helvetica','bold'); doc.setTextColor(...teal);
        doc.text(`Annexure ${inv.applicable_annexure||'—'}`, W-M, y, {align:'right'});
        y += 5;
      });
      spacer(4);
    }

    [['Background',`This Investment Mandate authorises The FSP to make investment decisions on behalf of ${clientName} within strictly defined and managed parameters. This Mandate is required under The FSP's Category II FSP registration with the FSCA.`],
     ['Scope of Authority','The FSP is authorised to render discretionary intermediary services and shall exercise its discretion in managing investments on behalf of the Investor. This includes listed and unlisted securities, unit trusts, collective investment schemes, bonds, derivatives, and other instruments.'],
     ['Investment Objectives',`Risk Level: ${riskProfile}\nObjectives: ${advisoryNeeds.length>0?advisoryNeeds.join(', '):'—'}`],
     ['Reporting','The FSP shall provide the Investor with relevant portfolio information on a regular basis, with a minimum of quarterly updates.'],
     ['Termination','Either party may terminate this Mandate on 60 calendar days\' written notice.'],
     ['Risk Disclosure','The Investor acknowledges that investment values may fluctuate and that past performance is not indicative of future results. The FSP will manage investments within the agreed risk parameters.'],
     ['Legislation','This Mandate is subject to FICA (Act 38 of 2001), POCA (2001), and the Policyholder Protection Rules. The Investor confirms all investment funds are legitimate as defined under FICA and POCA.'],
     ['Confidentiality','The FSP will not disclose Confidential Information to any third party without prior written authority from the Investor, unless compelled by law.'],
    ].forEach(([heading,text])=>{ roaPb(20); h2(heading); spacer(2); body(text); spacer(4); });

    spacer(6); h2('Signatures'); spacer(6);
    body('Signature of Investor:'); spacer(4);
    signLine(`${clientName}  ·  Date: _______________`,100);
    spacer(4);
    body('For and on behalf of The FSP (Wealthworks Investments (Pty) Ltd):'); spacer(4);
    advisorSignatureBlock();
    signLine(`${advisorName}  ·  Date: ${signDate}`,100);
    addFooter(pageNum);

    if (inclA) {
      const annexAInvs = investments.filter(inv => inv.investment_mandate==='Yes' && inv.applicable_annexure==='A');
      doc.addPage(); pageNum+=1; y=34; addHeader();
      h1('Annexure A — Model Portfolios'); thinRule(); spacer(4);
      body('This Annexure forms part of the Consolidated Discretionary Mandate and sets out the model portfolio parameters for the following investments:');
      spacer(6);
      annexAInvs.forEach((inv, i) => {
        roaPb(50);
        h2(`${inv.provider||'—'} — ${inv.product_type||'—'}`, ocean);
        table([
          ['Provider', inv.provider||'—'],
          ['Product Type', inv.product_type||'—'],
          ['Currency', inv.currency||'ZAR'],
          ...(inv.amount>0?[['Investment Amount',`${inv.currency||'R'} ${Number(inv.amount).toLocaleString('en-ZA')}`]]:[]),
          ...(inv.recurring_amount>0?[['Recurring Amount',`${inv.currency||'R'} ${Number(inv.recurring_amount).toLocaleString('en-ZA')}`]]:[]),
          ...(Array.isArray(inv.underlying_funds)&&inv.underlying_funds.length>0?[['Portfolio / Fund',inv.underlying_funds.join(', ')]]:[]),
        ]);
        spacer(4);
        h2('Portfolio Parameters', navy); spacer(2);
        table([
          ['Risk Tolerance', riskProfile],
          ['Time Horizon', timeHorizon],
          ['Investment Objectives', advisoryNeeds.length>0?advisoryNeeds.join(', '):'—'],
        ]);
        spacer(4);
        ['The FSP will manage this portfolio in accordance with the agreed risk profile',
         'Asset allocation will be rebalanced periodically to maintain target exposures',
         'Performance reporting will be provided on a quarterly basis',
        ].forEach(b=>bullet(b));
        if (i<annexAInvs.length-1){spacer(6);mandateThinRule();spacer(4);}
      });
      spacer(10); h2('Signatures'); spacer(6);
      body('Investor acknowledges and agrees to the model portfolio parameters set out in this Annexure.');
      spacer(4); signLine(`${clientName}  ·  Date: _______________`,100);
      spacer(4); body('For and on behalf of The FSP:'); spacer(4);
      advisorSignatureBlock();
      signLine(`${advisorName}  ·  Date: ${signDate}`,100);
      addFooter(pageNum);
    }

    if (inclB) {
      const annexBInvs = investments.filter(inv => inv.investment_mandate==='Yes' && inv.applicable_annexure==='B');
      doc.addPage(); pageNum+=1; y=34; addHeader();
      h1('Annexure B — Collective Investments & Offshore Platforms'); thinRule(); spacer(4);
      body('This Annexure forms part of the Consolidated Discretionary Mandate and governs the FSP\'s authority to invest in collective investment schemes and offshore platforms for the following investments:');
      spacer(6);
      annexBInvs.forEach((inv, i) => {
        roaPb(50);
        h2(`${inv.provider||'—'} — ${inv.product_type||'—'}`, ocean);
        table([
          ['Provider', inv.provider||'—'],
          ['Product Type', inv.product_type||'—'],
          ['Currency', inv.currency||'ZAR'],
          ...(inv.amount>0?[['Investment Amount',`${inv.currency||'R'} ${Number(inv.amount).toLocaleString('en-ZA')}`]]:[]),
          ...(inv.recurring_amount>0?[['Recurring Amount',`${inv.currency||'R'} ${Number(inv.recurring_amount).toLocaleString('en-ZA')}`]]:[]),
          ...(Array.isArray(inv.underlying_funds)&&inv.underlying_funds.length>0?[['Portfolio / Fund',inv.underlying_funds.join(', ')]]:[]),
        ]);
        spacer(4);
        ['Collective investment schemes are subject to market risk and are not guaranteed',
         'Offshore investments are subject to exchange rate and political risk',
         'The FSP will select funds appropriate to the agreed risk profile',
        ].forEach(b=>bullet(b));
        if (i<annexBInvs.length-1){spacer(6);mandateThinRule();spacer(4);}
      });
      spacer(10); h2('Signatures'); spacer(6);
      body('Investor acknowledges and agrees to the collective investment and offshore platform parameters set out in this Annexure.');
      spacer(4); signLine(`${clientName}  ·  Date: _______________`,100);
      spacer(4); body('For and on behalf of The FSP:'); spacer(4);
      advisorSignatureBlock();
      signLine(`${advisorName}  ·  Date: ${signDate}`,100);
      addFooter(pageNum);
    }

    if (inclC) {
      const annexCInvs = investments.filter(inv => inv.investment_mandate==='Yes' && inv.applicable_annexure==='C');
      doc.addPage(); pageNum+=1; y=34; addHeader();
      h1('Annexure C — Alternative Investments & Direct Securities'); thinRule(); spacer(4);
      body('This Annexure forms part of the Consolidated Discretionary Mandate and governs the FSP\'s authority to invest in alternative investments and direct securities for the following investments:');
      spacer(6);
      annexCInvs.forEach((inv, i) => {
        roaPb(50);
        h2(`${inv.provider||'—'} — ${inv.product_type||'—'}`, ocean);
        table([
          ['Provider', inv.provider||'—'],
          ['Product Type', inv.product_type||'—'],
          ['Currency', inv.currency||'ZAR'],
          ...(inv.amount>0?[['Investment Amount',`${inv.currency||'R'} ${Number(inv.amount).toLocaleString('en-ZA')}`]]:[]),
          ...(inv.recurring_amount>0?[['Recurring Amount',`${inv.currency||'R'} ${Number(inv.recurring_amount).toLocaleString('en-ZA')}`]]:[]),
        ]);
        spacer(4);
        ['Alternative investments carry higher risk and may have limited liquidity',
         'Direct securities are subject to market and company-specific risk',
         'The FSP will only invest in alternatives consistent with the agreed mandate parameters',
        ].forEach(b=>bullet(b));
        if (i<annexCInvs.length-1){spacer(6);mandateThinRule();spacer(4);}
      });
      spacer(10); h2('Signatures'); spacer(6);
      body('Investor acknowledges and agrees to the alternative investment parameters set out in this Annexure.');
      spacer(4); signLine(`${clientName}  ·  Date: _______________`,100);
      spacer(4); body('For and on behalf of The FSP:'); spacer(4);
      advisorSignatureBlock();
      signLine(`${advisorName}  ·  Date: ${signDate}`,100);
      addFooter(pageNum);
    }
  }

  return doc;
}