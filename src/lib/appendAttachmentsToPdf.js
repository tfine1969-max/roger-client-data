/**
 * Appends uploaded attachment PDFs (Quote PDF, App Form, Supporting Doc)
 * to an existing jsPDF document instance.
 *
 * Each attachment page gets:
 *  - A header line: "{productLabel} | {docType}"
 *  - The PDF page rendered as an image
 *  - A footer matching the rest of the document
 *
 * clientInitials: if provided, renders the actual initials; otherwise "___________"
 */

import * as pdfjsLib from 'pdfjs-dist';

// Point the worker at the CDN so Vite doesn't try to bundle it
pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

const W = 210, H = 297, M = 20;
const navy  = [14, 65, 102];
const muted = [138, 154, 170];
const border= [216, 228, 236];

/**
 * Render one PDF (fetched as ArrayBuffer) into an array of base64 PNG data URLs,
 * one entry per page.
 */
async function pdfToImages(arrayBuffer) {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const images = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const viewport = page.getViewport({ scale: 2 }); // 2× for quality
    const canvas = document.createElement('canvas');
    canvas.width  = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;
    images.push(canvas.toDataURL('image/jpeg', 0.85));
  }
  return images;
}

/**
 * @param {jsPDF} doc            - existing jsPDF instance (will be mutated)
 * @param {Array}  attachments   - array of { label, docType, file_url }
 * @param {string} clientInitials - e.g. "J.S." or "" for unsigned
 * @param {number} pageNum       - current page counter (mutated externally via return value)
 * @returns {number}             - updated pageNum
 */
export async function appendAttachmentsToPdf(doc, attachments, clientInitials = '', pageNum = 1) {
  const initialsText = clientInitials ? clientInitials : '___________';

  for (const att of attachments) {
    if (!att.file_url) continue;

    let arrayBuffer;
    try {
      const res = await fetch(att.file_url);
      arrayBuffer = await res.arrayBuffer();
    } catch {
      continue; // skip silently if fetch fails
    }

    let images;
    try {
      images = await pdfToImages(arrayBuffer);
    } catch {
      continue; // skip silently if render fails
    }

    if (!images || images.length === 0) continue;

    for (const imgData of images) {
      doc.addPage();
      pageNum += 1;

      // ── Navy top stripe ──────────────────────────────────────────────────
      doc.setFillColor(...navy);
      doc.rect(0, 0, W, 8, 'F');

      // ── Header line ──────────────────────────────────────────────────────
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...navy);
      doc.text(`${att.label}`, M, 16);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...muted);
      doc.text(`${att.docType}`, M, 21);

      // Separator
      doc.setDrawColor(...border);
      doc.line(M, 26, W - M, 26);

      // ── PDF page as image ────────────────────────────────────────────────
      const imgY = 28;
      const imgH = H - imgY - 14; // leave room for footer
      doc.addImage(imgData, 'JPEG', M, imgY, W - M * 2, imgH, undefined, 'FAST');

      // ── Footer ───────────────────────────────────────────────────────────
      const fy = H - 10;
      doc.setDrawColor(...border);
      doc.line(M, fy - 4, W - M, fy - 4);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(...muted);
      doc.text(
        'Wealth Works (Pty) Ltd FSP 28337  |  Wealthworks Investments (Pty) Ltd FSP 45624',
        M, fy
      );
      doc.text(String(pageNum), W / 2, fy, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...navy);
      doc.text(`Initials: ${initialsText}`, W - M, fy, { align: 'right' });
    }
  }

  return pageNum;
}