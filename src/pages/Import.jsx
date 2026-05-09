import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Upload, CheckCircle, AlertCircle, Loader2, FileSpreadsheet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const MONTH_MAP = {
  'jan 2026': '2026-01', 'jan': '2026-01',
  'feb 2026': '2026-02', 'feb': '2026-02',
  'mar 2026': '2026-03', 'mar': '2026-03',
  'apr 2026': '2026-04', 'apr': '2026-04',
  'may 2026': '2026-05', 'may': '2026-05',
  'jun 2026': '2026-06', 'jun': '2026-06',
  'jul 2026': '2026-07', 'jul': '2026-07',
  'aug 2026': '2026-08', 'aug': '2026-08',
  'sep 2026': '2026-09', 'sep': '2026-09',
  'oct 2026': '2026-10', 'oct': '2026-10',
  'nov 2026': '2026-11', 'nov': '2026-11',
  'dec 2026': '2026-12', 'dec': '2026-12',
};

export default function Import() {
  const [file, setFile] = useState(null);
  const [manualMonth, setManualMonth] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setResults(null);
    setError(null);
  };

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      // Upload the file first
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const ROW_SCHEMA = {
        type: 'object',
        properties: {
          portfolio_id: { type: 'string', description: 'Portfolio Id column' },
          account_code: { type: 'string', description: 'Account Code column' },
          identity_no: { type: 'string', description: 'Identity No column' },
          portfolio_name: { type: 'string', description: 'Portfolio Name column' },
          platform: { type: 'string', description: 'Platform column' },
          investment_name: { type: 'string', description: 'Investment Name column' },
          currency: { type: 'string', description: 'Currency column' },
          market_value: { type: 'number', description: 'Month End Market Value column' },
          number_of_units: { type: 'number', description: 'Number of Units column' },
          unit_price: { type: 'number', description: 'Month End Unit Price column' },
          exchange_rate: { type: 'number', description: 'Exchange rate — last column (col_12 or col_13), decimal like 16.13, only on some rows' }
        }
      };

      // Try flat extraction first (works for single-sheet files)
      const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: 'object',
          properties: {
            rows: { type: 'array', items: ROW_SCHEMA }
          }
        }
      });

      if (extracted.status !== 'success') throw new Error(extracted.details || 'Extraction failed');

      const output = extracted.output;
      // Handle flat extraction result (rows array at top level)
      let sheets = [];
      if (output?.rows?.length) {
        sheets = [{ sheet_name: manualMonth || 'sheet1', rows: output.rows }];
      } else if (output?.sheets?.length) {
        sheets = output.sheets;
      } else if (Array.isArray(output) && output[0]?.rows) {
        sheets = output;
      }
      let clientsCreated = 0, investmentsCreated = 0, valuesCreated = 0, valuesUpdated = 0;

      // Load existing clients and investments
      const existingClients = await base44.entities.Client.list();
      const existingInvestments = await base44.entities.Investment.list();
      const existingValues = await base44.entities.MonthlyValue.list();

      const clientMap = {};
      existingClients.forEach(c => { clientMap[c.account_code] = c; });

      const investmentMap = {};
      existingInvestments.forEach(i => { investmentMap[`${i.client_id}||${i.investment_name}||${i.platform}`] = i; });

      for (const sheet of sheets) {
        const sheetKey = sheet.sheet_name?.toLowerCase().trim();
        const month = MONTH_MAP[sheetKey] || manualMonth || sheetKey;

        for (const row of (sheet.rows || [])) {
          if (!row.portfolio_name || !row.investment_name) continue;

          // Upsert client
          let client = clientMap[row.account_code];
          if (!client) {
            client = await base44.entities.Client.create({
              name: row.portfolio_name,
              account_code: row.account_code,
              identity_no: row.identity_no,
            });
            clientMap[row.account_code] = client;
            clientsCreated++;
          }

          // Upsert investment
          const invKey = `${client.id}||${row.investment_name}||${row.platform}`;
          let investment = investmentMap[invKey];
          if (!investment) {
            investment = await base44.entities.Investment.create({
              client_id: client.id,
              portfolio_id: row.portfolio_id,
              investment_name: row.investment_name,
              platform: row.platform,
              currency: row.currency,
            });
            investmentMap[invKey] = investment;
            investmentsCreated++;
          }

          // Upsert monthly value
          const existingVal = existingValues.find(
            v => v.investment_id === investment.id && v.month === month
          );

          const valueData = {
            investment_id: investment.id,
            client_id: client.id,
            month,
            market_value: row.market_value,
            number_of_units: row.number_of_units,
            unit_price: row.unit_price,  // Month End Unit Price
            currency: row.currency,
            exchange_rate: row.exchange_rate || null,  // col_12 or col_13 depending on sheet
          };

          if (existingVal) {
            await base44.entities.MonthlyValue.update(existingVal.id, valueData);
            valuesUpdated++;
          } else {
            await base44.entities.MonthlyValue.create(valueData);
            valuesCreated++;
          }
        }
      }

      setResults({ clientsCreated, investmentsCreated, valuesCreated, valuesUpdated, sheetsProcessed: sheets.length });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Import Data</h1>
        <p className="text-muted-foreground mt-1">Upload your monthly spreadsheet to update all client values</p>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileSpreadsheet className="w-5 h-5" /> Upload Spreadsheet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
            <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-3">
              Supports <strong>.xlsx</strong> files with monthly sheets (Jan, Feb, Mar…)
            </p>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload">
              <Button variant="outline" asChild className="cursor-pointer">
                <span>Choose File</span>
              </Button>
            </label>
            {file && (
              <p className="mt-3 text-sm font-medium text-foreground">{file.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Month override <span className="text-muted-foreground font-normal">(for single-month files where the sheet isn't named by month)</span></p>
            <Select value={manualMonth} onValueChange={setManualMonth}>
              <SelectTrigger>
                <SelectValue placeholder="Auto-detect from sheet name" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Auto-detect from sheet name</SelectItem>
                {['2026-01','2026-02','2026-03','2026-04','2026-05','2026-06',
                  '2026-07','2026-08','2026-09','2026-10','2026-11','2026-12'].map(m => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-muted/50 rounded-xl p-4 text-sm space-y-1 text-muted-foreground">
            <p className="font-medium text-foreground mb-2">Expected format:</p>
            <p>• Each sheet = one month (e.g. "Jan 2026", "Feb", "Mar")</p>
            <p>• Columns: Portfolio Name, Account Code, Identity No, Platform, Investment Name, Currency, Month End Market Value, Number of Units, Unit Price</p>
            <p>• Clients and investments are created automatically if new</p>
            <p>• Existing monthly values are updated if re-imported</p>
          </div>

          <Button
            onClick={handleImport}
            disabled={!file || loading}
            className="w-full"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing…</>
            ) : (
              <><Upload className="w-4 h-4 mr-2" /> Import Spreadsheet</>
            )}
          </Button>
        </CardContent>
      </Card>

      {results && (
        <Card className="rounded-2xl border-accent/20 bg-accent/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-5 h-5 text-accent" />
              <p className="font-semibold text-accent">Import successful!</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Sheets', value: results.sheetsProcessed },
                { label: 'Clients', value: results.clientsCreated, suffix: ' new' },
                { label: 'Investments', value: results.investmentsCreated, suffix: ' new' },
                { label: 'Values', value: `${results.valuesCreated}↑ ${results.valuesUpdated}↻` },
              ].map(s => (
                <div key={s.label} className="bg-card rounded-xl border p-3 text-center">
                  <p className="text-xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}{s.suffix || ''}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="rounded-2xl border-destructive/20 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-destructive">Import failed</p>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}