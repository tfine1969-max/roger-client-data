import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import * as XLSX from 'npm:xlsx@0.18.5';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { file_url } = await req.json();
  const fileResp = await fetch(file_url);
  const arrayBuffer = await fileResp.arrayBuffer();
  const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });

  const results = {};
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });
    const firstRow = rows[0] || {};
    results[sheetName] = {
      row_count: rows.length,
      columns: Object.keys(firstRow),
      first_row: firstRow,
      // show any row that has a non-null value in the last few columns
      rows_with_rate: rows.slice(0, 5).map(r => {
        const keys = Object.keys(r);
        return { keys, values: Object.values(r) };
      }),
    };
  }

  return Response.json(results);
});