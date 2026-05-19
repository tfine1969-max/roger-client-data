import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertTriangle, Check, CheckSquare, ChevronRight, Download, LayoutList, Merge, Pencil, Search, Square, Table2, Trash2, X } from 'lucide-react';
import MonthlyComparisonView from '@/components/clients/MonthlyComparisonView';
import { fetchAllPortfolioValuations } from '@/lib/portfolio-data';
import { renameClient, deleteZeroBalances } from '@/lib/client-merge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import MonthBadge from '@/components/shared/MonthBadge';
import EditAccountModal from '@/components/clients/EditAccountModal';
import ClientConsolidation from '@/components/clients/ClientConsolidation';
import ManualMergeDialog from '@/components/clients/ManualMergeDialog';
import { cn } from '@/lib/utils';
import { getSortedMonths, fmtNum, formatMonth, zarVal } from '@/lib/valuation-utils';
import { buildStructuredClientName, hasUnknownValue, clientKey, rowHasUnknown, formatClientName, splitClientName } from '@/lib/client-utils';

const ALL_VALUE = '__all__';
const LATEST_VALUE = '__latest__';

export default function Clients() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterPlatform, setFilterPlatform] = useState(ALL_VALUE);
  const [filterCurrency, setFilterCurrency] = useState(ALL_VALUE);
  const [filterMonth, setFilterMonth] = useState(LATEST_VALUE);
  const [needsCorrectionOnly, setNeedsCorrectionOnly] = useState(false);
  const [zeroBalancesOnly, setZeroBalancesOnly] = useState(false);
  const [editingKey, setEditingKey] = useState(null);
  const [editingSurname, setEditingSurname] = useState('');
  const [editingFirstNames, setEditingFirstNames] = useState('');
  const [editingClient, setEditingClient] = useState(null);
  const [selectedKeys, setSelectedKeys] = useState(new Set());
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [actionStatus, setActionStatus] = useState(null);
  const [isDeletingZeroBalances, setIsDeletingZeroBalances] = useState(false);
  const [viewMode, setViewMode] = useState('single'); // 'single' | 'monthly'

  const { data: valuations = [], isLoading } = useQuery({
    queryKey: ['portfolioValuations'],
    queryFn: fetchAllPortfolioValuations,
  });

  const months = useMemo(() => getSortedMonths(valuations), [valuations]);
  const latestMonth = filterMonth === LATEST_VALUE ? months[0] || '' : filterMonth;
  const platforms = useMemo(() => [...new Set(valuations.map(v => v.platform).filter(Boolean))].sort(), [valuations]);
  const currencies = useMemo(() => [...new Set(valuations.map(v => v.currency).filter(Boolean))].sort(), [valuations]);

  const clients = useMemo(() => {
    const current = valuations.filter(v => v.upload_month === latestMonth);
    const map = {};

    current.forEach(row => {
      const key = clientKey(row);
      if (!map[key]) {
        map[key] = {
          client_key: key,
          account_codes: new Set(),
          identity_no: row.identity_no,
          portfolio_name: row.portfolio_name,
          platforms: new Set(),
          currencies: new Set(),
          investments: 0,
          totalValue: 0,
          hasUnknown: false,
        };
      }

      const client = map[key];
      if (row.account_code) client.account_codes.add(row.account_code);
      if (!client.identity_no && row.identity_no) client.identity_no = row.identity_no;
      if (!client.portfolio_name && row.portfolio_name) client.portfolio_name = row.portfolio_name;
      if (row.platform) client.platforms.add(row.platform);
      if (row.currency) client.currencies.add(row.currency);
      client.investments += 1;
      client.totalValue += zarVal(row);
      client.hasUnknown = client.hasUnknown || rowHasUnknown(row);
    });

    return Object.values(map)
      .map(client => ({
        ...client,
        account_codes: [...client.account_codes].sort(),
        platforms: [...client.platforms].sort(),
        currencies: [...client.currencies].sort(),
      }))
      .sort((a, b) => (formatClientName(a.portfolio_name) || '').localeCompare(formatClientName(b.portfolio_name) || ''));
  }, [valuations, latestMonth]);

  const correctionCount = useMemo(() => clients.filter(c => c.hasUnknown).length, [clients]);
  const zeroBalanceClients = useMemo(() => clients.filter(c => Math.abs(c.totalValue) < 0.01), [clients]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return clients.filter(client => {
      const matchSearch = !q ||
        client.portfolio_name?.toLowerCase().includes(q) ||
        client.account_codes.some(code => code?.toLowerCase().includes(q)) ||
        client.identity_no?.toLowerCase().includes(q);
      const matchPlatform = filterPlatform === ALL_VALUE || client.platforms.includes(filterPlatform);
      const matchCurrency = filterCurrency === ALL_VALUE || client.currencies.includes(filterCurrency);
      const matchCorrection = !needsCorrectionOnly || client.hasUnknown;
      const matchZero = !zeroBalancesOnly || Math.abs(client.totalValue) < 0.01;
      return matchSearch && matchPlatform && matchCurrency && matchCorrection && matchZero;
    });
  }, [clients, search, filterPlatform, filterCurrency, needsCorrectionOnly, zeroBalancesOnly]);

  // All-months client map — needed so merge works in monthly comparison view
  const allMonthsClients = useMemo(() => {
    const map = {};
    valuations.forEach(row => {
      const key = clientKey(row);
      if (!map[key]) {
        map[key] = { client_key: key, portfolio_name: row.portfolio_name || '', account_codes: new Set(), identity_no: row.identity_no, totalValue: 0 };
      }
      const c = map[key];
      if (!c.portfolio_name || hasUnknownValue(c.portfolio_name)) c.portfolio_name = row.portfolio_name || c.portfolio_name;
      if (row.account_code) c.account_codes.add(row.account_code);
    });
    return Object.values(map).map(c => ({ ...c, account_codes: [...c.account_codes].sort() }));
  }, [valuations]);

  const selectedClients = useMemo(() => {
    if (selectedKeys.size === 0) return [];
    const source = viewMode === 'monthly' ? allMonthsClients : clients;
    return source.filter(client => selectedKeys.has(client.client_key));
  }, [clients, allMonthsClients, selectedKeys, viewMode]);
  const selectedZeroClients = selectedClients.filter(client => Math.abs(client.totalValue) < 0.01);
  const visibleKeys = filtered.map(client => client.client_key);
  const allVisibleSelected = visibleKeys.length > 0 && visibleKeys.every(key => selectedKeys.has(key));
  const deleteTargetClients = selectedZeroClients.length > 0 ? selectedZeroClients : filtered.filter(client => Math.abs(client.totalValue) < 0.01);

  const toggleSelect = (key) => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleSelectVisible = () => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (allVisibleSelected) visibleKeys.forEach(key => next.delete(key));
      else visibleKeys.forEach(key => next.add(key));
      return next;
    });
  };

  const clearSelection = () => setSelectedKeys(new Set());

  const refreshClientData = () => {
    queryClient.invalidateQueries({ queryKey: ['portfolioValuations'] });
    queryClient.invalidateQueries({ queryKey: ['clients'] });
  };

  const startEditingName = (client) => {
    const parts = splitClientName(client.portfolio_name || '');
    setEditingKey(client.client_key);
    setEditingSurname(parts.surname);
    setEditingFirstNames(parts.firstNames);
  };

  const handleSaveName = async (key) => {
    const trimmedName = buildStructuredClientName(editingSurname, editingFirstNames);
    const currentClient = clients.find(client => client.client_key === key)
      || allMonthsClients.find(client => client.client_key === key);
    if (!trimmedName || !currentClient || trimmedName === currentClient.portfolio_name) {
      setEditingKey(null);
      return;
    }

    setActionStatus('Saving client name...');
    try {
      await renameClient(key, trimmedName);
      refreshClientData();
      setEditingKey(null);
      setActionStatus(null);
    } catch (err) {
      setActionStatus(err?.message || 'Rename failed');
      setTimeout(() => setActionStatus(null), 2200);
    }
  };

  const handleDeleteZeroBalances = async () => {
    if (!latestMonth || deleteTargetClients.length === 0) return;
    setIsDeletingZeroBalances(true);
    setActionStatus('Deleting zero-balance clients...');
    try {
      await deleteZeroBalances(latestMonth, deleteTargetClients.map(client => client.client_key));
      setSelectedKeys(prev => {
        const next = new Set(prev);
        deleteTargetClients.forEach(client => next.delete(client.client_key));
        return next;
      });
      refreshClientData();
      setDeleteDialogOpen(false);
    } catch (err) {
      setActionStatus(err?.message || 'Delete failed');
    } finally {
      setIsDeletingZeroBalances(false);
      setTimeout(() => setActionStatus(null), 1800);
    }
  };

  const tableColSpan = 8;

  const handleDownloadMonthlyComparison = () => {
    // Build sorted list of all unique months (ascending = chronological)
    const sortedMonths = [...months].reverse(); // months is desc, reverse to get asc

    // Collect unique client names across ALL months, grouped by clientKey
    const allClientMap = {};
    valuations.forEach(row => {
      const key = clientKey(row);
      if (!allClientMap[key]) {
        allClientMap[key] = { name: row.portfolio_name || '', monthsPresent: new Set() };
      }
      // Prefer a non-unknown name
      if (!allClientMap[key].name || hasUnknownValue(allClientMap[key].name)) {
        allClientMap[key].name = row.portfolio_name || allClientMap[key].name;
      }
      allClientMap[key].monthsPresent.add(row.upload_month);
    });

    // Sort client names alphabetically
    const sortedClients = Object.values(allClientMap).sort((a, b) =>
      (formatClientName(a.name) || '').localeCompare(formatClientName(b.name) || '')
    );

    // Build CSV
    const header = ['Client Name', ...sortedMonths.map(m => formatMonth(m))];
    const rows = sortedClients.map(client => {
      const name = formatClientName(client.name) || client.name || '—';
      const cells = sortedMonths.map(m => client.monthsPresent.has(m) ? 'Y' : '');
      return [name, ...cells];
    });

    // Add count row at bottom
    const countRow = ['Client Count', ...sortedMonths.map(m => {
      return sortedClients.filter(c => c.monthsPresent.has(m)).length;
    })];

    const allRows = [header, ...rows, [], countRow];
    const csv = allRows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'client_monthly_comparison.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold">Clients</h1>
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger className="h-9 w-40 bg-white">
                <SelectValue placeholder="Latest month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={LATEST_VALUE}>Latest month</SelectItem>
                {months.map(month => <SelectItem key={month} value={month}>{formatMonth(month)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {clients.length} active client{clients.length === 1 ? '' : 's'} · {latestMonth ? <span>Viewing <MonthBadge month={latestMonth} /></span> : 'No data'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode('single')}
              className={cn('flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors', viewMode === 'single' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}
              title="Single month view"
            >
              <LayoutList className="h-4 w-4" />
              <span className="hidden sm:inline">Month view</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('monthly')}
              className={cn('flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-l', viewMode === 'monthly' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}
              title="All months comparison"
            >
              <Table2 className="h-4 w-4" />
              <span className="hidden sm:inline">All months</span>
            </button>
          </div>
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={handleDownloadMonthlyComparison}
            disabled={valuations.length === 0}
            title="Download a CSV showing which clients appear in each month"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ClientConsolidation clients={clients} />

      {viewMode === 'monthly' && (
        <div className="rounded-lg border bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          Showing all clients across all months. Click a client name to edit it, or use the checkbox to select for merging.
        </div>
      )}

      <div className={cn('flex flex-wrap gap-3 rounded-lg border bg-white p-4', viewMode === 'monthly' && 'hidden')}>
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, account code or ID..."
            value={search}
            onChange={event => setSearch(event.target.value)}
            className="h-9 pl-9"
          />
        </div>

        <Select value={filterPlatform} onValueChange={setFilterPlatform}>
          <SelectTrigger className="h-9 w-40">
            <SelectValue placeholder="All platforms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All platforms</SelectItem>
            {platforms.map(platform => <SelectItem key={platform} value={platform}>{platform}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterCurrency} onValueChange={setFilterCurrency}>
          <SelectTrigger className="h-9 w-36">
            <SelectValue placeholder="All currencies" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All currencies</SelectItem>
            {currencies.map(currency => <SelectItem key={currency} value={currency}>{currency}</SelectItem>)}
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant={needsCorrectionOnly ? 'default' : 'outline'}
          className="h-9 gap-2"
          onClick={() => setNeedsCorrectionOnly(value => !value)}
        >
          <AlertTriangle className="h-4 w-4" />
          Needs correction
          {correctionCount > 0 && (
            <span className={cn('rounded px-1.5 text-xs', needsCorrectionOnly ? 'bg-white/20' : 'bg-amber-50 text-amber-700')}>
              {correctionCount}
            </span>
          )}
        </Button>

        <Button
          type="button"
          variant={zeroBalancesOnly ? 'default' : 'outline'}
          className="h-9 gap-2"
          onClick={() => setZeroBalancesOnly(value => !value)}
        >
          <Trash2 className="h-4 w-4" />
          Zero balances
          {zeroBalanceClients.length > 0 && (
            <span className={cn('rounded px-1.5 text-xs', zeroBalancesOnly ? 'bg-white/20' : 'bg-red-50 text-red-700')}>
              {zeroBalanceClients.length}
            </span>
          )}
        </Button>
      </div>

      {viewMode === 'monthly' && (
        <MonthlyComparisonView
          valuations={valuations}
          months={months}
          selectedKeys={selectedKeys}
          toggleSelect={toggleSelect}
          startEditingName={startEditingName}
          editingKey={editingKey}
          editingSurname={editingSurname}
          editingFirstNames={editingFirstNames}
          setEditingSurname={setEditingSurname}
          setEditingFirstNames={setEditingFirstNames}
          handleSaveName={handleSaveName}
          setEditingKey={setEditingKey}
          buildStructuredClientName={buildStructuredClientName}
        />
      )}

      {viewMode === 'single' && <div className="overflow-hidden rounded-lg border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="w-36 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleSelectVisible}
                    className="h-4 w-4 cursor-pointer accent-primary"
                    aria-label="Select visible clients"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Client</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Accounts</th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">ID Number</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Platforms</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Investments</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Value</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading && (
                <tr><td colSpan={tableColSpan} className="py-12 text-center text-sm text-muted-foreground">Loading...</td></tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={tableColSpan} className="py-12 text-center text-sm text-muted-foreground">No clients found.</td></tr>
              )}
              {filtered.map(client => {
                const selected = selectedKeys.has(client.client_key);
                return (
                  <tr
                    key={client.client_key}
                    className={cn('group transition-colors hover:bg-muted/30', selected && 'bg-primary/5')}
                  >
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => toggleSelect(client.client_key)}
                        className={cn(
                          'inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-colors',
                          selected
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-white text-muted-foreground hover:border-primary/40 hover:text-primary'
                        )}
                      >
                        {selected ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                        {selected ? 'Selected' : 'Select'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {client.hasUnknown && <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />}
                        {editingKey === client.client_key ? (
                          <div className="flex flex-wrap items-end gap-1.5">
                            <label className="space-y-0.5">
                              <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Surname / Entity</span>
                              <input
                                type="text"
                                value={editingSurname}
                                onChange={(event) => setEditingSurname(event.target.value)}
                                className="w-48 rounded border px-2 py-1 text-sm font-medium"
                                autoFocus
                              />
                            </label>
                            <label className="space-y-0.5">
                              <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">First names</span>
                              <input
                                type="text"
                                value={editingFirstNames}
                                onChange={(event) => setEditingFirstNames(event.target.value)}
                                className="w-48 rounded border px-2 py-1 text-sm font-medium"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => handleSaveName(client.client_key)}
                              className="rounded p-1 hover:bg-muted"
                              title={`Save as ${buildStructuredClientName(editingSurname, editingFirstNames) || 'client name'}`}
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </button>
                            <button type="button" onClick={() => setEditingKey(null)} className="rounded p-1 hover:bg-muted">
                              <X className="h-4 w-4 text-red-600" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <Link
                              to={`/clients/${encodeURIComponent(client.client_key)}`}
                              className="font-medium text-foreground transition-colors hover:text-primary"
                            >
                              {formatClientName(client.portfolio_name) || '-'}
                            </Link>
                            <button
                              type="button"
                              onClick={() => startEditingName(client)}
                              className="rounded p-1 opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
                              aria-label="Edit client name"
                            >
                              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                            {client.hasUnknown && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-800">Needs correction</span>}
                            {Math.abs(client.totalValue) < 0.01 && <span className="rounded bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-700">Zero balance</span>}
                          </>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1 font-mono text-xs">
                        {client.account_codes.map(code => (
                          <button
                            key={code}
                            type="button"
                            onClick={() => setEditingClient(client)}
                            className={cn(
                              'cursor-pointer text-muted-foreground hover:underline',
                              hasUnknownValue(code) && 'rounded bg-amber-50 px-1 py-0.5 text-amber-800 ring-1 ring-amber-200'
                            )}
                          >
                            {code}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground">{client.account_codes.length}</td>
                    <td className="hidden px-4 py-3 text-xs text-muted-foreground md:table-cell">{client.identity_no || '-'}</td>
                    <td className="px-4 py-3 text-center text-muted-foreground">{client.platforms.length}</td>
                    <td className="px-4 py-3 text-center text-muted-foreground">{client.investments}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-mono font-semibold">R {fmtNum(client.totalValue)}</td>
                    <td className="px-4 py-3">
                      <Link to={`/clients/${encodeURIComponent(client.client_key)}`}>
                        <ChevronRight className="h-4 w-4 text-muted-foreground hover:text-primary" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>}

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white/95 px-6 py-3 shadow-lg backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="text-sm">
            <span className="font-semibold">{selectedClients.length}</span> selected
            {selectedZeroClients.length > 0 && <span className="ml-2 text-muted-foreground">· {selectedZeroClients.length} zero-balance</span>}
            {actionStatus && <span className="ml-3 text-muted-foreground">{actionStatus}</span>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={toggleSelectVisible}>
              {allVisibleSelected ? 'Unselect visible' : 'Select visible'}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={clearSelection} disabled={selectedClients.length === 0}>
              Clear
            </Button>
            <Button
              type="button"
              className="h-10 min-w-40 cursor-pointer gap-2 px-5"
              onClick={() => setMergeDialogOpen(true)}
              disabled={selectedClients.length < 2}
            >
              <Merge className="h-4 w-4" />
              Merge selected
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="h-10 min-w-48 cursor-pointer gap-2 px-5"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={deleteTargetClients.length === 0}
            >
              <Trash2 className="h-4 w-4" />
              Delete zero balances
            </Button>
          </div>
        </div>
      </div>

      <ManualMergeDialog
        open={mergeDialogOpen}
        onOpenChange={setMergeDialogOpen}
        selectedClients={selectedClients}
        onMerged={clearSelection}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete zero-balance clients?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete valuation rows for {deleteTargetClients.length} zero-balance client{deleteTargetClients.length === 1 ? '' : 's'} in {formatMonth(latestMonth)}.
              Clients with non-zero balances will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingZeroBalances}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteZeroBalances}
              disabled={isDeletingZeroBalances || deleteTargetClients.length === 0}
            >
              {isDeletingZeroBalances ? 'Deleting...' : 'Delete zero balances'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {editingClient && (
        <EditAccountModal
          client={editingClient}
          valuations={valuations}
          onClose={() => setEditingClient(null)}
          onSaved={() => {
            setEditingClient(null);
            refreshClientData();
          }}
        />
      )}
    </div>
  );
}