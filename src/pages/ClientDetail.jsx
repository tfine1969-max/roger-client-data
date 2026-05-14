import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, Download, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getSortedMonths, fmtNum, formatMonth, zarVal, origVal } from '@/lib/valuation-utils';
import { clientDisplayName, clientKey, hasUnknownValue, rowHasUnknown } from '@/lib/client-utils';
import { feeOptionValues, withCalculatedFees } from '@/lib/fee-utils';
import { feeMappingRows } from '@/data/feeMapping';
import { exportClientFundCSV } from '@/lib/export-utils';
import InvestmentTable from '@/components/client/InvestmentTable';
import FeeInvestmentTable from '@/components/fees/FeeInvestmentTable';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { toast } from 'sonner';

export default function ClientDetail() {
  const { accountCode } = useParams();
  const queryClient = useQueryClient();
  const [selectedFund, setSelectedFund] = useState('');
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [accountCodeEdits, setAccountCodeEdits] = useState({});
  const [savingCorrections, setSavingCorrections] = useState(false);
  const [cleaningDuplicates, setCleaningDuplicates] = useState(false);

  const { data: valuations = [] } = useQuery({
    queryKey: ['portfolioValuations'],
    queryFn: () => base44.entities.PortfolioValuation.list('-upload_month', 5000),
  });

  const { data: feeConfigs = [] } = useQuery({
    queryKey: ['feeConfigs'],
    queryFn: () => base44.entities.FeeConfig.list(),
  });

  const decodedKey = decodeURIComponent(accountCode || '');
  const clientRows = useMemo(() => valuations.filter(v => v.account_code === decodedKey || clientKey(v) === decodedKey), [valuations, decodedKey]);
  const months = useMemo(() => getSortedMonths(clientRows), [clientRows]);
  const latestMonth = months[0] || '';
  const currentRows = useMemo(() => clientRows.filter(v => v.upload_month === latestMonth), [clientRows, latestMonth]);
  const currentFeeRows = useMemo(
    () => currentRows.map(row => withCalculatedFees(row, feeMappingRows, feeConfigs)),
    [currentRows, feeConfigs]
  );

  const clientName = clientDisplayName(clientRows);
  const accountCodes = useMemo(() => [...new Set(clientRows.map(r => r.account_code).filter(Boolean))].sort(), [clientRows]);
  const identityNo = clientRows.find(r => r.identity_no)?.identity_no;
  const totalZar = useMemo(() => currentRows.reduce((s, r) => s + zarVal(r), 0), [currentRows]);
  const totalUsd = useMemo(
    () => currentRows
      .filter(r => String(r.currency || '').toUpperCase() === 'USD')
      .reduce((s, r) => s + origVal(r), 0),
    [currentRows]
  );
  const platforms = useMemo(() => [...new Set(currentRows.map(r => r.platform).filter(Boolean))].sort(), [currentRows]);
  const hasUnknown = useMemo(() => currentRows.some(rowHasUnknown), [currentRows]);
  const unknownAccountCodes = useMemo(() => accountCodes.filter(hasUnknownValue), [accountCodes]);
  const cleanAccountCodes = useMemo(() => accountCodes.filter(code => !hasUnknownValue(code)), [accountCodes]);
  const duplicateJuliusRows = useMemo(() => {
    const duplicateKey = (row) => [
      String(row.investment_name || '').toLowerCase().replace(/[^a-z0-9]+/g, ''),
      String(row.currency || '').toUpperCase(),
      Math.round(origVal(row) * 100),
      Math.round(zarVal(row) * 100),
    ].join('||');

    const credoKeys = new Set(
      currentRows
        .filter(row => row.platform === 'Credo')
        .map(duplicateKey)
    );

    return currentRows.filter(row => row.platform === 'Julius Baer' && credoKeys.has(duplicateKey(row)));
  }, [currentRows]);

  const trendData = useMemo(() => {
    return months.map(month => ({
      month,
      total: clientRows.filter(v => v.upload_month === month).reduce((s, v) => s + zarVal(v), 0),
    })).reverse();
  }, [clientRows, months]);

  const funds = useMemo(() => {
    return [...new Set(clientRows.map(r => `${r.account_code}||${r.investment_name}||${r.platform}||${r.currency}`))].map(k => {
      const [account_code, investment_name, platform, currency] = k.split('||');
      return { key: k, account_code, investment_name, platform, currency };
    });
  }, [clientRows]);

  const fundTrendData = useMemo(() => {
    if (!selectedFund) return [];
    const [account_code, investment_name, platform, currency] = selectedFund.split('||');
    const rows = clientRows.filter(r => r.account_code === account_code && r.investment_name === investment_name && r.platform === platform && r.currency === currency);
    return [...getSortedMonths(rows)].reverse().map(m => {
      const row = rows.find(r => r.upload_month === m);
      return {
        month: formatMonth(m),
        value: row ? zarVal(row) : 0,
        unit_price: row?.month_end_unit_price ?? 0,
      };
    });
  }, [selectedFund, clientRows]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['portfolioValuations'] });
    queryClient.invalidateQueries({ queryKey: ['feeConfigs'] });
  };

  const suggestAccountCode = (code) => {
    const stripped = String(code || '')
      .replace(/^UNKNOWN[_\s-]*/i, '')
      .trim();
    const slashCandidate = stripped.replace(/_/g, '/');
    const compactIdentity = String(identityNo || '').replace(/[^a-zA-Z0-9]+/g, '').toLowerCase();
    const compactCode = stripped.replace(/[^a-zA-Z0-9]+/g, '').toLowerCase();

    if (identityNo && compactIdentity && compactCode.includes(compactIdentity)) return identityNo;
    if (slashCandidate && slashCandidate !== code) return slashCandidate;
    if (cleanAccountCodes.length === 1) return cleanAccountCodes[0];
    return stripped || code;
  };

  const openCorrectionModal = () => {
    setAccountCodeEdits(Object.fromEntries(unknownAccountCodes.map(code => [code, suggestAccountCode(code)])));
    setCorrectionOpen(true);
  };

  const handleSaveCorrections = async () => {
    const replacements = Object.entries(accountCodeEdits)
      .map(([oldCode, newCode]) => [oldCode, String(newCode || '').trim()])
      .filter(([oldCode, newCode]) => newCode && oldCode !== newCode);

    if (replacements.length === 0) {
      toast.info('No account code changes to save');
      return;
    }

    setSavingCorrections(true);
    try {
      const codeMap = new Map(replacements);
      let updated = 0;

      for (const row of clientRows) {
        const nextCode = codeMap.get(row.account_code);
        if (!nextCode) continue;

        const nextRow = { ...row, account_code: nextCode };
        const stillUnknown = rowHasUnknown(nextRow);
        await base44.entities.PortfolioValuation.update(row.id, {
          account_code: nextCode,
          has_missing_account_code: false,
          has_unknown_value: stillUnknown,
          is_flagged: stillUnknown || row.has_missing_identity_no || row.has_missing_market_value || row.is_duplicate || false,
        });
        updated += 1;
      }

      toast.success(`Updated ${updated} valuation row${updated === 1 ? '' : 's'}`);
      setCorrectionOpen(false);
      refresh();
    } catch (err) {
      console.error('Correction save error:', err);
      toast.error(err.message || 'Failed to save corrections');
    } finally {
      setSavingCorrections(false);
    }
  };

  const handleRemoveJuliusDuplicates = async () => {
    if (duplicateJuliusRows.length === 0) return;
    setCleaningDuplicates(true);
    try {
      for (const row of duplicateJuliusRows) {
        await base44.entities.PortfolioValuation.delete(row.id);
      }
      toast.success(`Removed ${duplicateJuliusRows.length} duplicated Julius Baer row${duplicateJuliusRows.length === 1 ? '' : 's'}`);
      refresh();
    } catch (err) {
      console.error('Duplicate cleanup error:', err);
      toast.error(err.message || 'Failed to remove duplicated Julius Baer rows');
    } finally {
      setCleaningDuplicates(false);
    }
  };

  const handleExport = () => {
    exportClientFundCSV(clientName, currentRows, latestMonth);
  };

  if (clientRows.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>No data found for client <strong>{decodedKey}</strong>.</p>
        <Link to="/clients"><Button variant="link" className="mt-2">Back to Clients</Button></Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Link to="/clients" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Clients
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{clientName}</h1>
            {hasUnknown && (
              <div className="mt-2 inline-flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                <AlertTriangle className="w-3.5 h-3.5" />
                Contains UNKNOWN values that need correction
              </div>
            )}
            <div className="flex flex-wrap items-center gap-4 mt-1 text-sm text-muted-foreground">
              <span>Accounts: <strong className="text-foreground font-mono">{accountCodes.join(', ')}</strong></span>
              {identityNo && <span>ID: <strong className="text-foreground">{identityNo}</strong></span>}
              <span>Platforms: <strong className="text-foreground">{platforms.length}</strong></span>
              {totalUsd > 0 && <span>USD Value: <strong className="text-foreground font-mono">$ {fmtNum(totalUsd)}</strong></span>}
              <span>Total: <strong className="text-foreground font-mono">R {fmtNum(totalZar)}</strong></span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {hasUnknown && (
              <Button variant="outline" size="sm" onClick={openCorrectionModal} className="gap-2">
                <Pencil className="w-4 h-4" /> Correct Unknowns
              </Button>
            )}
            {duplicateJuliusRows.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleRemoveJuliusDuplicates} disabled={cleaningDuplicates} className="gap-2 text-destructive hover:text-destructive">
                <Trash2 className="w-4 h-4" /> {cleaningDuplicates ? 'Removing...' : `Remove ${duplicateJuliusRows.length} Julius Duplicate${duplicateJuliusRows.length === 1 ? '' : 's'}`}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
              <Download className="w-4 h-4" /> Export CSV
            </Button>
          </div>
        </div>
      </div>

      <InvestmentTable clientRows={clientRows} months={months} />

      <div>
        <h2 className="text-base font-semibold mb-3">Current Month Components and Fees</h2>
        <FeeInvestmentTable rows={currentFeeRows} feeOptions={feeOptionValues(feeMappingRows)} onFeeUpdated={refresh} />
      </div>

      {trendData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Combined Client Value - Monthly Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,18%,92%)" vertical={false} />
                <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} tickFormatter={m => formatMonth(m)} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1_000_000).toFixed(2)}M`} width={65} />
                <Tooltip
                  formatter={v => [fmtNum(v), 'Total Value']}
                  contentStyle={{ borderRadius: 6, fontSize: 12, border: '1px solid hsl(214,18%,88%)' }}
                  labelFormatter={m => formatMonth(m)}
                />
                <Line type="monotone" dataKey="total" stroke="hsl(220,45%,18%)" strokeWidth={2} dot={{ r: 3, fill: 'hsl(220,45%,18%)' }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {funds.length > 1 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-base font-semibold">Underlying Component Trend</CardTitle>
              <Select value={selectedFund} onValueChange={setSelectedFund}>
                <SelectTrigger className="w-80">
                  <SelectValue placeholder="Select a component to view trend..." />
                </SelectTrigger>
                <SelectContent>
                  {funds.map(f => (
                    <SelectItem key={f.key} value={f.key}>{f.investment_name} ({f.account_code}, {f.platform})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          {selectedFund && fundTrendData.length > 0 && (
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={fundTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,18%,92%)" vertical={false} />
                  <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="val" orientation="left" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} width={55} />
                  <YAxis yAxisId="price" orientation="right" fontSize={11} tickLine={false} axisLine={false} width={55} />
                  <Tooltip contentStyle={{ borderRadius: 6, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line yAxisId="val" type="monotone" dataKey="value" name="ZAR Value" stroke="hsl(220,45%,18%)" strokeWidth={2} dot={{ r: 3 }} />
                  <Line yAxisId="price" type="monotone" dataKey="unit_price" name="Unit Price" stroke="hsl(43,55%,52%)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          )}
        </Card>
      )}

      <Dialog open={correctionOpen} onOpenChange={setCorrectionOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Correct Unknown Values</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <p className="font-medium text-foreground">{clientName}</p>
              <p className="text-muted-foreground">These changes update every matching valuation row for this client.</p>
            </div>

            {unknownAccountCodes.length === 0 ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                This client still has an UNKNOWN value, but it is not an account code. Check the investment, platform, currency, client name, or ID on the imported row.
              </div>
            ) : (
              <div className="space-y-3">
                {unknownAccountCodes.map((code, idx) => (
                  <div key={code} className="grid gap-2 sm:grid-cols-[1fr_1fr] sm:items-end">
                    <div className="space-y-1">
                      <Label className="text-xs">Current UNKNOWN account {idx + 1}</Label>
                      <Input value={code} readOnly className="font-mono text-xs bg-muted/50" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Correct account code</Label>
                      <Input
                        value={accountCodeEdits[code] || ''}
                        onChange={(e) => setAccountCodeEdits(prev => ({ ...prev, [code]: e.target.value }))}
                        placeholder="Enter the correct account code"
                        className="font-mono text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCorrectionOpen(false)} disabled={savingCorrections}>Cancel</Button>
            <Button onClick={handleSaveCorrections} disabled={savingCorrections || unknownAccountCodes.length === 0}>
              {savingCorrections ? 'Saving...' : 'Save Corrections'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
