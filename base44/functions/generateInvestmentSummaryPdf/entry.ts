import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { jsPDF } from 'npm:jspdf@4.2.1';

const MONTHS = [
  { key: 'dec_2025', label: 'Dec 2025' },
  { key: 'jan_2026', label: 'Jan 2026' },
  { key: 'feb_2026', label: 'Feb 2026' },
  { key: 'mar_2026', label: 'Mar 2026' },
  { key: 'apr_2026', label: 'Apr 2026' },
  { key: 'may_2026', label: 'May 2026' },
  { key: 'jun_2026', label: 'Jun 2026' },
  { key: 'jul_2026', label: 'Jul 2026' },
  { key: 'aug_2026', label: 'Aug 2026' },
  { key: 'sep_2026', label: 'Sep 2026' },
  { key: 'oct_2026', label: 'Oct 2026' },
  { key: 'nov_2026', label: 'Nov 2026' },
  { key: 'dec_2026', label: 'Dec 2026' },
];

function fmtNum(val, currency) {
  if (!val && val !== 0) return '';
  const n = Number(val);
  if (!n) return '';
  const sym = currency === 'USD' ? '$' : 'R';
  return sym + n.toLocaleString('en-ZA', { maximumFractionDigits: 0 });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { client_name } = await req.json();
    if (!client_name) return Response.json({ error: 'client_name required' }, { status: 400 });

    const rows = await base44.asServiceRole.entities.InvestmentSummaryReport.filter(
      { client_name },
      'sort_order',
      100
    );

    if (!rows.length) return Response.json({ error: 'No data found for client' }, { status: 404 });

    const localRows = rows.filter(r => r.portfolio === 'LOCAL').sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    const offshoreRows = rows.filter(r => r.portfolio === 'OFFSHORE').sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    // Determine which months have any data
    const activeCols = MONTHS.filter(m => rows.some(r => r[m.key]));

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    const NAVY = [26, 54, 93];
    const GOLD = [176, 141, 68];
    const WHITE = [255, 255, 255];
    const LIGHT = [245, 247, 250];
    const BORDER = [200, 205, 215];

    // Header
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, pageW, 22, 'F');
    doc.setTextColor(...WHITE);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(client_name, 14, 14);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Investment Portfolio Summary', 14, 20);

    const generated = new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });
    doc.setFontSize(8);
    doc.text(`Generated: ${generated}`, pageW - 14, 14, { align: 'right' });

    // Gold accent line
    doc.setFillColor(...GOLD);
    doc.rect(0, 22, pageW, 1.5, 'F');

    const COL_FUND = 55;
    const COL_VAL = (pageW - 14 - COL_FUND - 14) / activeCols.length;
    const ROW_H = 7;

    function drawTable(startY, title, tableRows, currency) {
      let y = startY;

      // Section title
      doc.setFillColor(...NAVY);
      doc.rect(10, y, pageW - 20, 8, 'F');
      doc.setFillColor(...GOLD);
      doc.rect(10, y, 3, 8, 'F');
      doc.setTextColor(...WHITE);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(title, 16, y + 5.5);
      y += 8;

      // Column headers
      doc.setFillColor(40, 62, 100);
      doc.rect(10, y, pageW - 20, ROW_H, 'F');
      doc.setTextColor(...WHITE);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.text('Fund / Investment Name', 13, y + 4.8);
      activeCols.forEach((m, i) => {
        const x = 10 + COL_FUND + i * COL_VAL + COL_VAL / 2;
        doc.text(m.label, x, y + 4.8, { align: 'center' });
      });
      y += ROW_H;

      // Data rows
      tableRows.forEach((row, idx) => {
        const bg = idx % 2 === 0 ? WHITE : LIGHT;
        doc.setFillColor(...bg);
        doc.rect(10, y, pageW - 20, ROW_H, 'F');
        doc.setDrawColor(...BORDER);
        doc.setLineWidth(0.2);
        doc.line(10, y + ROW_H, pageW - 10, y + ROW_H);

        doc.setTextColor(30, 40, 60);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.text(row.fund_name || '', 13, y + 4.8);

        activeCols.forEach((m, i) => {
          const x = 10 + COL_FUND + i * COL_VAL + COL_VAL / 2;
          const val = fmtNum(row[m.key], currency);
          doc.text(val, x, y + 4.8, { align: 'center' });
        });
        y += ROW_H;
      });

      // Totals row
      doc.setFillColor(...NAVY);
      doc.rect(10, y, pageW - 20, ROW_H, 'F');
      doc.setTextColor(...WHITE);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text('TOTAL', 13, y + 4.8);
      activeCols.forEach((m, i) => {
        const total = tableRows.reduce((sum, r) => sum + (Number(r[m.key]) || 0), 0);
        const x = 10 + COL_FUND + i * COL_VAL + COL_VAL / 2;
        doc.text(fmtNum(total, currency), x, y + 4.8, { align: 'center' });
      });
      y += ROW_H;

      return y + 6;
    }

    let y = 30;
    y = drawTable(y, 'LOCAL PORTFOLIO (ZAR)', localRows, 'ZAR');
    y = drawTable(y, 'OFFSHORE PORTFOLIO (USD)', offshoreRows, 'USD');

    // Footer
    doc.setFillColor(...NAVY);
    doc.rect(0, pageH - 8, pageW, 8, 'F');
    doc.setTextColor(...WHITE);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('WealthWorks — Confidential', 14, pageH - 3);
    doc.text(`Page 1`, pageW - 14, pageH - 3, { align: 'right' });

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${client_name.replace(/\s+/g, '_')}_Investment_Summary.pdf"`,
      },
    });
  } catch (error) {
    console.error('generateInvestmentSummaryPdf error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});