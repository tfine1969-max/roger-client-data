import React, { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Banknote,
  BarChart3,
  Building2,
  CalendarDays,
  ChevronRight,
  Download,
  FileText,
  Filter,
  Layers3,
  ReceiptText,
  Search,
  TrendingUp,
  WalletCards,
} from 'lucide-react';

import credoLogo from '@/assets/provider-logos/credo.png';
import gryphonLogo from '@/assets/provider-logos/gryphon.png';
import juliusBaerLogo from '@/assets/provider-logos/julius-baer.png';
import primeLogo from '@/assets/provider-logos/prime-investments.png';

const providers = [
  { id: 'julius-baer', name: 'Julius Baer', logo: juliusBaerLogo, accent: '#172158', invoiceCode: 'JB-INV' },
  { id: 'credo', name: 'Credo', logo: credoLogo, accent: '#00A9E0', invoiceCode: 'CR-INV' },
  { id: 'gryphon', name: 'Gryphon', logo: gryphonLogo, accent: '#6E4CB8', invoiceCode: 'GR-INV' },
  { id: 'prime', name: 'Prime Investments', logo: primeLogo, accent: '#B51F2F', invoiceCode: 'PI-INV' },
];

const months = ['Jan 2026', 'Feb 2026', 'Mar 2026', 'Apr 2026', 'May 2026'];

const clientBooks = [
  {
    id: 'c-001',
    client: 'Bennett Family Trust',
    providerId: 'julius-baer',
    portfolio: 'JB Global Growth Portfolio',
    advisor: 'Roger Data',
    aum: [11840000, 12065000, 12320000, 12190000, 12585000],
    rebateFees: [15640, 16025, 16420, 16290, 16815],
    advisoryFees: [49335, 50270, 51335, 50790, 52440],
    funds: [
      { name: 'Global Quality Equity Fund', allocation: 42, value: 5285700 },
      { name: 'Short Duration Income Fund', allocation: 28, value: 3523800 },
      { name: 'Strategic Alternatives Fund', allocation: 18, value: 2265300 },
      { name: 'USD Liquidity Sleeve', allocation: 12, value: 1510200 },
    ],
  },
  {
    id: 'c-002',
    client: 'Maseko Holdings',
    providerId: 'julius-baer',
    portfolio: 'JB Defensive Income Portfolio',
    advisor: 'Roger Data',
    aum: [6450000, 6525000, 6680000, 6735000, 6815000],
    rebateFees: [7390, 7485, 7665, 7720, 7810],
    advisoryFees: [24190, 24470, 25050, 25255, 25555],
    funds: [
      { name: 'Investment Grade Credit Fund', allocation: 48, value: 3271200 },
      { name: 'Global Balanced Fund', allocation: 32, value: 2180800 },
      { name: 'Money Market Reserve', allocation: 20, value: 1363000 },
    ],
  },
  {
    id: 'c-003',
    client: 'Hendrik van Wyk',
    providerId: 'credo',
    portfolio: 'Credo Balanced Mandate',
    advisor: 'Roger Data',
    aum: [5250000, 5410000, 5585000, 5660000, 5725000],
    rebateFees: [4980, 5125, 5300, 5370, 5430],
    advisoryFees: [17650, 18190, 18780, 19025, 19245],
    funds: [
      { name: 'Credo Global Equity', allocation: 55, value: 3148750 },
      { name: 'Credo Bond Plus', allocation: 30, value: 1717500 },
      { name: 'Sterling Cash', allocation: 15, value: 858750 },
    ],
  },
  {
    id: 'c-004',
    client: 'Naidoo Retirement Annuity',
    providerId: 'gryphon',
    portfolio: 'Gryphon Purpose Income',
    advisor: 'Roger Data',
    aum: [4180000, 4245000, 4310000, 4365000, 4420000],
    rebateFees: [3120, 3170, 3225, 3265, 3305],
    advisoryFees: [11845, 12030, 12215, 12370, 12525],
    funds: [
      { name: 'Gryphon Prudential Fund', allocation: 60, value: 2652000 },
      { name: 'Gryphon Income Fund', allocation: 30, value: 1326000 },
      { name: 'Cash Management', allocation: 10, value: 442000 },
    ],
  },
  {
    id: 'c-005',
    client: 'Khumalo Family Office',
    providerId: 'prime',
    portfolio: 'Prime Growth Wrapper',
    advisor: 'Roger Data',
    aum: [8950000, 9020000, 9280000, 9360000, 9495000],
    rebateFees: [8940, 9010, 9285, 9365, 9500],
    advisoryFees: [33560, 33825, 34800, 35100, 35605],
    funds: [
      { name: 'Prime Global Opportunities', allocation: 50, value: 4747500 },
      { name: 'Prime SA Equity', allocation: 25, value: 2373750 },
      { name: 'Prime Flexible Income', allocation: 25, value: 2373750 },
    ],
  },
];

const currency = (value) =>
  new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 0,
  }).format(value);

const compactCurrency = (value) =>
  new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);

const monthIndex = (month) => months.indexOf(month);

const sum = (items) => items.reduce((total, item) => total + item, 0);

function ProviderLogo({ provider, active }) {
  return (
    <div className={`h-14 w-full border bg-white px-4 flex items-center justify-center ${active ? 'border-foreground' : 'border-border'}`}>
      <img src={provider.logo} alt={`${provider.name} logo`} className="max-h-9 max-w-[175px] object-contain" />
    </div>
  );
}

function Metric({ icon: Icon, label, value, helper }) {
  return (
    <div className="border border-border bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
        </div>
        <span className="flex h-10 w-10 items-center justify-center bg-secondary text-navy">
          <Icon className="h-5 w-5" />
        </span>
      </div>
      {helper && <p className="mt-3 text-xs text-muted-foreground">{helper}</p>}
    </div>
  );
}

export default function Landing() {
  const [selectedProviderId, setSelectedProviderId] = useState('julius-baer');
  const [selectedMonth, setSelectedMonth] = useState('May 2026');
  const [selectedClientId, setSelectedClientId] = useState('c-001');
  const [query, setQuery] = useState('');

  const selectedProvider = providers.find((provider) => provider.id === selectedProviderId);
  const selectedMonthIndex = monthIndex(selectedMonth);
  const providerClients = clientBooks.filter((book) => book.providerId === selectedProviderId);
  const selectedClient = clientBooks.find((book) => book.id === selectedClientId) || providerClients[0];
  const filteredClients = providerClients.filter((book) =>
    `${book.client} ${book.portfolio}`.toLowerCase().includes(query.toLowerCase()),
  );

  const monthlyProviderRows = useMemo(
    () =>
      months.map((month, index) => {
        const rows = providerClients.map((book) => ({
          aum: book.aum[index],
          rebateFees: book.rebateFees[index],
          advisoryFees: book.advisoryFees[index],
        }));

        return {
          month,
          aum: sum(rows.map((row) => row.aum)),
          rebateFees: sum(rows.map((row) => row.rebateFees)),
          advisoryFees: sum(rows.map((row) => row.advisoryFees)),
        };
      }),
    [providerClients],
  );

  const providerTotals = useMemo(
    () =>
      providers.map((provider) => {
        const books = clientBooks.filter((book) => book.providerId === provider.id);
        return {
          ...provider,
          aum: sum(books.map((book) => book.aum[selectedMonthIndex])),
          rebateFees: sum(books.map((book) => book.rebateFees[selectedMonthIndex])),
          advisoryFees: sum(books.map((book) => book.advisoryFees[selectedMonthIndex])),
          clientCount: books.length,
        };
      }),
    [selectedMonthIndex],
  );

  const monthTotals = {
    aum: sum(clientBooks.map((book) => book.aum[selectedMonthIndex])),
    rebateFees: sum(clientBooks.map((book) => book.rebateFees[selectedMonthIndex])),
    advisoryFees: sum(clientBooks.map((book) => book.advisoryFees[selectedMonthIndex])),
  };

  const selectedProviderMonth = monthlyProviderRows[selectedMonthIndex] || monthlyProviderRows[0];
  const maxAum = Math.max(...monthlyProviderRows.map((row) => row.aum), 1);

  return (
    <main className="min-h-screen bg-[#F5F7F8] text-foreground">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 md:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center bg-navy text-white">
              <Layers3 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-navy">Roger Client Data</h1>
              <p className="text-sm text-muted-foreground">AUM, provider rebates and advisory fee controls</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {months.map((month) => (
              <button
                key={month}
                type="button"
                onClick={() => setSelectedMonth(month)}
                className={`h-10 border px-3 text-xs font-semibold transition-colors ${
                  selectedMonth === month ? 'border-navy bg-navy text-white' : 'border-border bg-white text-navy hover:border-navy/40'
                }`}
              >
                {month}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <section className="grid gap-4 md:grid-cols-3">
          <Metric icon={WalletCards} label={`${selectedMonth} total AUM`} value={compactCurrency(monthTotals.aum)} helper="All listed providers and client portfolios" />
          <Metric icon={ReceiptText} label="Advisory fees to invoice" value={currency(monthTotals.advisoryFees)} helper="Consolidated monthly advisory fee total" />
          <Metric icon={Banknote} label="Rebate fees tracked" value={currency(monthTotals.rebateFees)} helper="Provider rebate fees for reconciliation" />
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_1.55fr]">
          <div className="space-y-6">
            <div className="border border-border bg-white">
              <div className="border-b border-border p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Provider Fee Section</p>
                    <h2 className="mt-1 text-xl font-semibold text-navy">Monthly provider ledger</h2>
                  </div>
                  <Filter className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
              <div className="grid gap-3 p-4 sm:grid-cols-2">
                {providerTotals.map((provider) => {
                  const active = provider.id === selectedProviderId;
                  return (
                    <button
                      key={provider.id}
                      type="button"
                      onClick={() => {
                        setSelectedProviderId(provider.id);
                        const firstClient = clientBooks.find((book) => book.providerId === provider.id);
                        if (firstClient) setSelectedClientId(firstClient.id);
                      }}
                      className={`text-left transition-all ${active ? 'shadow-[0_12px_30px_rgba(14,65,102,0.12)]' : 'hover:shadow-[0_8px_20px_rgba(14,65,102,0.08)]'}`}
                    >
                      <ProviderLogo provider={provider} active={active} />
                      <div className={`border border-t-0 p-3 ${active ? 'border-foreground bg-[#FAFBFC]' : 'border-border bg-white'}`}>
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-navy">{provider.name}</p>
                          <ChevronRight className={`h-4 w-4 ${active ? 'text-navy' : 'text-muted-foreground'}`} />
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">{provider.clientCount} clients</p>
                        <p className="mt-3 text-lg font-semibold text-foreground">{currency(provider.advisoryFees)}</p>
                        <p className="text-xs text-muted-foreground">Advisory fees in {selectedMonth}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border border-border bg-white">
              <div className="border-b border-border p-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-navy" />
                  <h2 className="text-lg font-semibold text-navy">AUM by month</h2>
                </div>
              </div>
              <div className="p-4">
                <div className="space-y-3">
                  {monthlyProviderRows.map((row) => (
                    <button
                      key={row.month}
                      type="button"
                      onClick={() => setSelectedMonth(row.month)}
                      className={`grid w-full grid-cols-[76px_1fr_96px] items-center gap-3 border p-3 text-left transition-colors ${
                        selectedMonth === row.month ? 'border-navy bg-navy/5' : 'border-border hover:border-navy/30'
                      }`}
                    >
                      <span className="text-xs font-semibold text-navy">{row.month}</span>
                      <span className="h-2 bg-secondary">
                        <span
                          className="block h-full"
                          style={{
                            width: `${Math.max((row.aum / maxAum) * 100, 8)}%`,
                            backgroundColor: selectedProvider.accent,
                          }}
                        />
                      </span>
                      <span className="text-right text-sm font-semibold text-foreground">{compactCurrency(row.aum)}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <section className="border border-border bg-white">
              <div className="flex flex-col gap-4 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-44 border border-border bg-white px-4 flex items-center justify-center">
                    <img src={selectedProvider.logo} alt={`${selectedProvider.name} logo`} className="max-h-9 max-w-full object-contain" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Selected provider</p>
                    <h2 className="mt-1 text-2xl font-semibold text-navy">{selectedProvider.name}</h2>
                  </div>
                </div>
                <button type="button" className="inline-flex h-10 items-center justify-center gap-2 border border-navy bg-navy px-4 text-xs font-semibold uppercase tracking-wide text-white hover:bg-ocean">
                  <Download className="h-4 w-4" />
                  Export
                </button>
              </div>

              <div className="grid gap-px bg-border md:grid-cols-3">
                <div className="bg-white p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Provider AUM</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{compactCurrency(selectedProviderMonth.aum)}</p>
                </div>
                <div className="bg-white p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Rebates</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{currency(selectedProviderMonth.rebateFees)}</p>
                </div>
                <div className="bg-white p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Advisory fees</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{currency(selectedProviderMonth.advisoryFees)}</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="bg-[#F2F5F7] text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Month</th>
                      <th className="px-4 py-3 font-semibold">AUM</th>
                      <th className="px-4 py-3 font-semibold">Rebates</th>
                      <th className="px-4 py-3 font-semibold">Advisory fees</th>
                      <th className="px-4 py-3 font-semibold">Invoice ref</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyProviderRows.map((row, index) => (
                      <tr
                        key={row.month}
                        onClick={() => setSelectedMonth(row.month)}
                        className={`cursor-pointer border-t border-border ${selectedMonth === row.month ? 'bg-navy/5' : 'hover:bg-muted/40'}`}
                      >
                        <td className="px-4 py-4 font-semibold text-navy">{row.month}</td>
                        <td className="px-4 py-4">{currency(row.aum)}</td>
                        <td className="px-4 py-4">{currency(row.rebateFees)}</td>
                        <td className="px-4 py-4 font-semibold">{currency(row.advisoryFees)}</td>
                        <td className="px-4 py-4 text-muted-foreground">{selectedProvider.invoiceCode}-{String(index + 1).padStart(2, '0')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="border border-border bg-white">
                <div className="border-b border-border p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Client drilldown</p>
                      <h2 className="mt-1 text-lg font-semibold text-navy">Fees per client</h2>
                    </div>
                    <div className="flex h-10 items-center gap-2 border border-border bg-white px-3">
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search client"
                        className="w-36 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                      />
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-border">
                  {filteredClients.map((book) => (
                    <button
                      key={book.id}
                      type="button"
                      onClick={() => setSelectedClientId(book.id)}
                      className={`w-full p-4 text-left transition-colors ${selectedClient?.id === book.id ? 'bg-navy/5' : 'hover:bg-muted/40'}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-navy">{book.client}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{book.portfolio}</p>
                        </div>
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                        <div>
                          <p className="text-muted-foreground">AUM</p>
                          <p className="mt-1 font-semibold text-foreground">{compactCurrency(book.aum[selectedMonthIndex])}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Rebate</p>
                          <p className="mt-1 font-semibold text-foreground">{currency(book.rebateFees[selectedMonthIndex])}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Advisory</p>
                          <p className="mt-1 font-semibold text-foreground">{currency(book.advisoryFees[selectedMonthIndex])}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <aside className="border border-border bg-white">
                {selectedClient && (
                  <>
                    <div className="border-b border-border p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{selectedMonth}</p>
                          <h2 className="mt-1 text-lg font-semibold text-navy">{selectedClient.client}</h2>
                        </div>
                        <Building2 className="h-5 w-5 text-navy" />
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{selectedClient.portfolio}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-px bg-border">
                      <div className="bg-white p-4">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Rebate fee</p>
                        <p className="mt-2 text-lg font-semibold">{currency(selectedClient.rebateFees[selectedMonthIndex])}</p>
                      </div>
                      <div className="bg-white p-4">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Advisory fee</p>
                        <p className="mt-2 text-lg font-semibold">{currency(selectedClient.advisoryFees[selectedMonthIndex])}</p>
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-navy" />
                        <h3 className="text-sm font-semibold text-navy">Underlying funds</h3>
                      </div>
                      <div className="space-y-3">
                        {selectedClient.funds.map((fund) => (
                          <div key={fund.name} className="border border-border p-3">
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-sm font-semibold text-foreground">{fund.name}</p>
                              <p className="text-sm font-semibold text-navy">{fund.allocation}%</p>
                            </div>
                            <div className="mt-3 h-2 bg-secondary">
                              <div className="h-full bg-navy" style={{ width: `${fund.allocation}%` }} />
                            </div>
                            <p className="mt-2 text-xs text-muted-foreground">{currency(fund.value)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </aside>
            </section>
          </div>
        </section>

        <section className="mt-6 border border-border bg-white">
          <div className="flex flex-col gap-4 border-b border-border p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center bg-secondary text-navy">
                <FileText className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Consolidated advisory fees</p>
                <h2 className="text-xl font-semibold text-navy">Client invoice summary for {selectedMonth}</h2>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              <span>Month-end review pack</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-[#F2F5F7] text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Client</th>
                  <th className="px-4 py-3 font-semibold">Provider</th>
                  <th className="px-4 py-3 font-semibold">Portfolio</th>
                  <th className="px-4 py-3 font-semibold">AUM</th>
                  <th className="px-4 py-3 font-semibold">Rebate fee</th>
                  <th className="px-4 py-3 font-semibold">Advisory fee</th>
                  <th className="px-4 py-3 font-semibold">Invoice status</th>
                </tr>
              </thead>
              <tbody>
                {clientBooks.map((book) => {
                  const provider = providers.find((item) => item.id === book.providerId);
                  return (
                    <tr key={book.id} className="border-t border-border">
                      <td className="px-4 py-4 font-semibold text-navy">{book.client}</td>
                      <td className="px-4 py-4">{provider.name}</td>
                      <td className="px-4 py-4 text-muted-foreground">{book.portfolio}</td>
                      <td className="px-4 py-4">{currency(book.aum[selectedMonthIndex])}</td>
                      <td className="px-4 py-4">{currency(book.rebateFees[selectedMonthIndex])}</td>
                      <td className="px-4 py-4 font-semibold">{currency(book.advisoryFees[selectedMonthIndex])}</td>
                      <td className="px-4 py-4">
                        <span className="inline-flex border border-forest/25 bg-forest/10 px-2.5 py-1 text-xs font-semibold text-forest">
                          Ready
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
