import React, { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Banknote,
  BarChart3,
  Calculator,
  CalendarDays,
  ChevronRight,
  FileText,
  Layers3,
  Search,
  TrendingUp,
  WalletCards,
  X,
} from 'lucide-react';

import credoLogo from '@/assets/provider-logos/credo.png';
import gryphonLogo from '@/assets/provider-logos/gryphon.png';
import juliusBaerLogo from '@/assets/provider-logos/julius-baer.png';
import primeLogo from '@/assets/provider-logos/prime-investments.png';
import { feeRates, monthlyClientData } from '@/data/monthlyClientData';

const providerBranding = {
  'julius-baer': { name: 'Julius Baer', logo: juliusBaerLogo, accent: '#172158' },
  credo: { name: 'Credo', logo: credoLogo, accent: '#00A9E0' },
  gryphon: { name: 'Gryphon', logo: gryphonLogo, accent: '#6E4CB8' },
  prime: { name: 'Prime Investments', logo: primeLogo, accent: '#B51F2F' },
  'northstar-fnb': { name: 'Northstar FNB', accent: '#176B87' },
  'northstar-sanlam': { name: 'Northstar Sanlam', accent: '#176B87' },
  peresec: { name: 'Peresec', accent: '#5B5F68' },
  prescient: { name: 'Prescient', accent: '#244C37' },
};

const providerOrder = ['julius-baer', 'credo', 'gryphon', 'prime', 'prescient', 'northstar-fnb', 'northstar-sanlam', 'peresec'];

const currency = (value, code = 'ZAR') =>
  new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: code,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const compactCurrency = (value, code = 'ZAR') =>
  new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: code,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Number(value || 0));

const percent = (value) => `${(Number(value || 0) * 100).toFixed(4)}%`;

const sum = (items) => items.reduce((total, item) => total + Number(item || 0), 0);

const feeFor = (client, feeType) => {
  const rate = feeRates[client.providerId]?.[`${feeType}AnnualRate`] || 0;
  return {
    annualRate: rate,
    monthlyRate: rate / 12,
    nativeFees: Object.fromEntries(
      Object.entries(client.nativeValues).map(([code, value]) => [code, Number(value || 0) * rate / 12]),
    ),
    zarFee: Number(client.zarAum || 0) * rate / 12,
  };
};

const combineNativeValues = (clients, selector) => {
  const values = {};
  clients.forEach((client) => {
    Object.entries(selector(client)).forEach(([code, value]) => {
      values[code] = (values[code] || 0) + Number(value || 0);
    });
  });
  return values;
};

const providerControlTotal = (month, providerId, fallback) =>
  month.providerSourceTotals?.[providerId]?.zarTotal ?? fallback;

function ProviderLogo({ providerId }) {
  const brand = providerBranding[providerId] || { name: providerId };

  if (brand.logo) {
    return <img src={brand.logo} alt={`${brand.name} logo`} className="max-h-9 max-w-[170px] object-contain" />;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="h-3 w-3" style={{ backgroundColor: brand.accent }} />
      <span className="text-sm font-semibold text-navy">{brand.name}</span>
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
      <p className="mt-3 text-xs text-muted-foreground">{helper}</p>
    </div>
  );
}

export default function Landing() {
  const [selectedMonthId, setSelectedMonthId] = useState(monthlyClientData[0].id);
  const [selectedProviderId, setSelectedProviderId] = useState('julius-baer');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [query, setQuery] = useState('');
  const [calculation, setCalculation] = useState({ providerId: 'julius-baer', monthId: monthlyClientData[0].id, feeType: 'advisory' });

  const selectedMonth = monthlyClientData.find((month) => month.id === selectedMonthId) || monthlyClientData[0];
  const selectedProviderBrand = providerBranding[selectedProviderId] || { name: selectedProviderId, accent: '#0E4166' };

  const providerSummaries = useMemo(
    () =>
      providerOrder
        .map((providerId) => {
          const clients = selectedMonth.clients.filter((client) => client.providerId === providerId);
          if (!clients.length) return null;
          const rebate = sum(clients.map((client) => feeFor(client, 'rebate').zarFee));
          const advisory = sum(clients.map((client) => feeFor(client, 'advisory').zarFee));
          const clientAumZar = sum(clients.map((client) => client.zarAum));
          return {
            providerId,
            clients,
            clientCount: clients.length,
            aumZar: providerControlTotal(selectedMonth, providerId, clientAumZar),
            clientAumZar,
            nativeValues: combineNativeValues(clients, (client) => client.nativeValues),
            rebateZar: rebate,
            advisoryZar: advisory,
            totalFeesZar: rebate + advisory,
          };
        })
        .filter(Boolean),
    [selectedMonth],
  );

  const selectedProviderSummary = providerSummaries.find((provider) => provider.providerId === selectedProviderId) || providerSummaries[0];
  const providerClients = selectedProviderSummary?.clients || [];
  const filteredClients = providerClients.filter((client) =>
    `${client.client} ${client.accountCode}`.toLowerCase().includes(query.toLowerCase()),
  );
  const selectedClient = providerClients.find((client) => client.id === selectedClientId) || providerClients[0];

  const monthTotals = {
    aumZar: selectedMonth.sourceZarTotal || sum(providerSummaries.map((provider) => provider.aumZar)),
    rebateZar: sum(providerSummaries.map((provider) => provider.rebateZar)),
    advisoryZar: sum(providerSummaries.map((provider) => provider.advisoryZar)),
  };

  const sourceReconciliationRows = Object.entries(selectedMonth.sourceNativeTotals || {}).map(([code, nativeValue]) => ({
    code,
    nativeValue,
    fxRate: selectedMonth.exchangeRates[code] || 1,
    zarValue: selectedMonth.sourceZarTotals?.[code] || nativeValue * (selectedMonth.exchangeRates[code] || 1),
  }));

  const clientSummaries = Object.values(
    selectedMonth.clients.reduce((summary, client) => {
      if (!summary[client.client]) {
        summary[client.client] = {
          id: client.client,
          client: client.client,
          providers: new Set(),
          nativeValues: {},
          zarAum: 0,
          rebateZar: 0,
          advisoryZar: 0,
          accounts: 0,
        };
      }

      const row = summary[client.client];
      row.providers.add(client.providerName);
      row.accounts += 1;
      row.zarAum += Number(client.zarAum || 0);
      row.rebateZar += feeFor(client, 'rebate').zarFee;
      row.advisoryZar += feeFor(client, 'advisory').zarFee;
      Object.entries(client.nativeValues).forEach(([code, value]) => {
        row.nativeValues[code] = (row.nativeValues[code] || 0) + Number(value || 0);
      });
      return summary;
    }, {}),
  )
    .map((client) => ({ ...client, providers: [...client.providers].join(', ') }))
    .sort((a, b) => b.zarAum - a.zarAum);

  const monthlyProviderRows = monthlyClientData.map((month) => {
    const clients = month.clients.filter((client) => client.providerId === selectedProviderId);
    const rebate = sum(clients.map((client) => feeFor(client, 'rebate').zarFee));
    const advisory = sum(clients.map((client) => feeFor(client, 'advisory').zarFee));
    const clientAumZar = sum(clients.map((client) => client.zarAum));
    return {
      ...month,
      clients,
      aumZar: providerControlTotal(month, selectedProviderId, clientAumZar),
      clientAumZar,
      nativeValues: combineNativeValues(clients, (client) => client.nativeValues),
      rebateZar: rebate,
      advisoryZar: advisory,
      totalFeesZar: rebate + advisory,
    };
  });

  const selectedCalculationMonth = monthlyClientData.find((month) => month.id === calculation.monthId) || selectedMonth;
  const calculationClients = selectedCalculationMonth.clients.filter((client) => client.providerId === calculation.providerId);
  const calculationBrand = providerBranding[calculation.providerId] || { name: calculation.providerId, accent: '#0E4166' };
  const calculationFeeRows = calculationClients.map((client) => ({
    ...client,
    fee: feeFor(client, calculation.feeType),
  }));
  const calculationTotals = {
    aumZar: sum(calculationFeeRows.map((client) => client.zarAum)),
    nativeAum: combineNativeValues(calculationFeeRows, (client) => client.nativeValues),
    nativeFees: combineNativeValues(calculationFeeRows, (client) => client.fee.nativeFees),
    zarFee: sum(calculationFeeRows.map((client) => client.fee.zarFee)),
    annualRate: calculationFeeRows[0]?.fee.annualRate || 0,
  };

  const providerReconciliationRows = providerSummaries.map((provider) => ({
    ...provider,
    providerName: providerBranding[provider.providerId]?.name || provider.providerId,
    sourceAumZar: selectedMonth.providerSourceTotals?.[provider.providerId]?.zarTotal ?? provider.aumZar,
    difference: (selectedMonth.providerSourceTotals?.[provider.providerId]?.zarTotal ?? provider.aumZar) - provider.clientAumZar,
  }));

  const openCalculation = (providerId, monthId, feeType) => {
    setCalculation({ providerId, monthId, feeType });
  };

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
              <p className="text-sm text-muted-foreground">Native currency AUM, ZAR conversion and fee audit trail</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {monthlyClientData.map((month) => (
              <button
                key={month.id}
                type="button"
                onClick={() => setSelectedMonthId(month.id)}
                className={`h-10 border px-4 text-xs font-semibold transition-colors ${
                  selectedMonthId === month.id ? 'border-navy bg-navy text-white' : 'border-border bg-white text-navy hover:border-navy/40'
                }`}
              >
                {month.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <section className="grid gap-4 md:grid-cols-3">
          <Metric icon={WalletCards} label={`${selectedMonth.label} total AUM`} value={currency(monthTotals.aumZar)} helper={`Source: ${selectedMonth.sourceFile}`} />
          <Metric icon={Banknote} label="Rebate fees" value={currency(monthTotals.rebateZar)} helper="Calculated from native client values, then converted to ZAR" />
          <Metric icon={FileText} label="Advisory fees" value={currency(monthTotals.advisoryZar)} helper="Click any ZAR fee total to audit the calculation" />
        </section>

        <section className="mt-6 border border-border bg-white">
          <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">AUM source reconciliation</p>
              <h2 className="mt-1 text-xl font-semibold text-navy">{selectedMonth.label} native values converted to ZAR</h2>
            </div>
            <p className="text-sm text-muted-foreground">USD/ZAR {selectedMonth.exchangeRates.USD.toFixed(4)}</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="bg-[#F2F5F7] text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Currency</th>
                  <th className="px-4 py-3 font-semibold">Native AUM</th>
                  <th className="px-4 py-3 font-semibold">FX rate</th>
                  <th className="px-4 py-3 font-semibold">ZAR value</th>
                </tr>
              </thead>
              <tbody>
                {sourceReconciliationRows.map((row) => (
                  <tr key={row.code} className="border-t border-border">
                    <td className="px-4 py-4 font-semibold text-navy">{row.code}</td>
                    <td className="px-4 py-4">{currency(row.nativeValue, row.code)}</td>
                    <td className="px-4 py-4">{row.fxRate.toFixed(4)}</td>
                    <td className="px-4 py-4 font-semibold">{currency(row.zarValue)}</td>
                  </tr>
                ))}
                <tr className="border-t border-border bg-navy/5">
                  <td className="px-4 py-4 font-semibold text-navy" colSpan={3}>Total AUM</td>
                  <td className="px-4 py-4 text-lg font-semibold text-navy">{currency(monthTotals.aumZar)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6 border border-border bg-white">
          <div className="border-b border-border p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Provider control reconciliation</p>
            <h2 className="mt-1 text-xl font-semibold text-navy">Provider totals from workbook tabs</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-[#F2F5F7] text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Provider</th>
                  <th className="px-4 py-3 font-semibold">Source total</th>
                  <th className="px-4 py-3 font-semibold">Client rows total</th>
                  <th className="px-4 py-3 font-semibold">Difference</th>
                  <th className="px-4 py-3 font-semibold">Client records</th>
                </tr>
              </thead>
              <tbody>
                {providerReconciliationRows.map((row) => (
                  <tr key={row.providerId} className="border-t border-border">
                    <td className="px-4 py-4 font-semibold text-navy">{row.providerName}</td>
                    <td className="px-4 py-4">{currency(row.sourceAumZar)}</td>
                    <td className="px-4 py-4">{currency(row.clientAumZar)}</td>
                    <td className="px-4 py-4 font-semibold">{currency(row.difference)}</td>
                    <td className="px-4 py-4">{row.clientCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.55fr]">
          <div className="space-y-6">
            <div className="border border-border bg-white">
              <div className="border-b border-border p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Provider Fee Section</p>
                <h2 className="mt-1 text-xl font-semibold text-navy">Provider ledger</h2>
              </div>

              <div className="grid gap-3 p-4">
                {providerSummaries.map((provider) => {
                  const active = provider.providerId === selectedProviderId;
                  return (
                    <button
                      key={provider.providerId}
                      type="button"
                      onClick={() => {
                        setSelectedProviderId(provider.providerId);
                        setSelectedClientId('');
                      }}
                      className={`border p-4 text-left transition-all ${active ? 'border-navy bg-navy/5' : 'border-border bg-white hover:border-navy/30'}`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex h-14 w-48 items-center justify-center border border-border bg-white px-4">
                          <ProviderLogo providerId={provider.providerId} />
                        </div>
                        <ChevronRight className={`h-4 w-4 ${active ? 'text-navy' : 'text-muted-foreground'}`} />
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                        <div>
                          <p className="text-muted-foreground">Clients</p>
                          <p className="mt-1 font-semibold text-foreground">{provider.clientCount}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">AUM ZAR</p>
                          <p className="mt-1 font-semibold text-foreground">{compactCurrency(provider.aumZar)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Fees</p>
                          <p className="mt-1 font-semibold text-foreground">{currency(provider.totalFeesZar)}</p>
                        </div>
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
                      key={row.id}
                      type="button"
                      onClick={() => setSelectedMonthId(row.id)}
                      className={`grid w-full grid-cols-[76px_1fr_116px] items-center gap-3 border p-3 text-left transition-colors ${
                        selectedMonthId === row.id ? 'border-navy bg-navy/5' : 'border-border hover:border-navy/30'
                      }`}
                    >
                      <span className="text-xs font-semibold text-navy">{row.label}</span>
                      <span className="h-2 bg-secondary">
                        <span
                          className="block h-full"
                          style={{
                            width: `${Math.max((row.aumZar / Math.max(...monthlyProviderRows.map((item) => item.aumZar), 1)) * 100, 8)}%`,
                            backgroundColor: selectedProviderBrand.accent,
                          }}
                        />
                      </span>
                      <span className="text-right text-sm font-semibold text-foreground">{compactCurrency(row.aumZar)}</span>
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
                  <div className="flex h-14 w-48 items-center justify-center border border-border bg-white px-4">
                    <ProviderLogo providerId={selectedProviderId} />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Selected provider</p>
                    <h2 className="mt-1 text-2xl font-semibold text-navy">{selectedProviderBrand.name}</h2>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  USD/ZAR {selectedMonth.exchangeRates.USD.toFixed(4)} from {selectedMonth.sourceFile}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[840px] text-sm">
                  <thead className="bg-[#F2F5F7] text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Fee type</th>
                      {monthlyClientData.map((month) => (
                        <th key={month.id} className="px-4 py-3 font-semibold">{month.label} native</th>
                      ))}
                      {monthlyClientData.map((month) => (
                        <th key={`${month.id}-zar`} className="px-4 py-3 font-semibold">{month.label} ZAR</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {['rebate', 'advisory', 'total'].map((feeType) => (
                      <tr key={feeType} className="border-t border-border">
                        <td className={`px-4 py-4 font-semibold capitalize ${feeType === 'total' ? 'text-navy' : 'text-foreground'}`}>{feeType}</td>
                        {monthlyClientData.map((month) => {
                          const clients = month.clients.filter((client) => client.providerId === selectedProviderId);
                          const nativeFees = feeType === 'total'
                            ? combineNativeValues(clients, (client) => {
                                const rebate = feeFor(client, 'rebate').nativeFees;
                                const advisory = feeFor(client, 'advisory').nativeFees;
                                return Object.fromEntries([...new Set([...Object.keys(rebate), ...Object.keys(advisory)])].map((code) => [code, (rebate[code] || 0) + (advisory[code] || 0)]));
                              })
                            : combineNativeValues(clients, (client) => feeFor(client, feeType).nativeFees);
                          return (
                            <td key={`${feeType}-${month.id}-native`} className="px-4 py-4 font-medium">
                              {Object.entries(nativeFees).map(([code, value]) => (
                                <span key={code} className="mr-3 whitespace-nowrap">{currency(value, code)}</span>
                              ))}
                            </td>
                          );
                        })}
                        {monthlyClientData.map((month) => {
                          const clients = month.clients.filter((client) => client.providerId === selectedProviderId);
                          const value = feeType === 'total'
                            ? sum(clients.map((client) => feeFor(client, 'rebate').zarFee + feeFor(client, 'advisory').zarFee))
                            : sum(clients.map((client) => feeFor(client, feeType).zarFee));
                          return (
                            <td key={`${feeType}-${month.id}-zar`} className="px-4 py-4 font-semibold">
                              <button
                                type="button"
                                onClick={() => openCalculation(selectedProviderId, month.id, feeType === 'total' ? 'advisory' : feeType)}
                                className="inline-flex items-center gap-2 text-navy underline-offset-4 hover:underline"
                              >
                                {currency(value)}
                                <Calculator className="h-4 w-4" />
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="border border-border bg-white">
                <div className="border-b border-border p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Client drilldown</p>
                      <h2 className="mt-1 text-lg font-semibold text-navy">Native value and ZAR fees</h2>
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

                <div className="max-h-[540px] divide-y divide-border overflow-y-auto">
                  {filteredClients.map((client) => {
                    const active = selectedClient?.id === client.id;
                    const advisory = feeFor(client, 'advisory');
                    return (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => setSelectedClientId(client.id)}
                        className={`w-full p-4 text-left transition-colors ${active ? 'bg-navy/5' : 'hover:bg-muted/40'}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-semibold text-navy">{client.client}</p>
                            <p className="mt-1 text-xs text-muted-foreground">Account {client.accountCode} | {client.holdingCount} holdings</p>
                          </div>
                          <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                          <div>
                            <p className="text-muted-foreground">Native AUM</p>
                            <p className="mt-1 font-semibold text-foreground">
                              {Object.entries(client.nativeValues).map(([code, value]) => `${currency(value, code)} `)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">ZAR AUM</p>
                            <p className="mt-1 font-semibold text-foreground">{currency(client.zarAum)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Advisory ZAR</p>
                            <p className="mt-1 font-semibold text-foreground">{currency(advisory.zarFee)}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <aside className="border border-border bg-white">
                {selectedClient && (
                  <>
                    <div className="border-b border-border p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{selectedMonth.label}</p>
                      <h2 className="mt-1 text-lg font-semibold text-navy">{selectedClient.client}</h2>
                      <p className="mt-2 text-sm text-muted-foreground">{selectedClient.providerName} | Account {selectedClient.accountCode}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-px bg-border">
                      <div className="bg-white p-4">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Native AUM</p>
                        <p className="mt-2 text-lg font-semibold">
                          {Object.entries(selectedClient.nativeValues).map(([code, value]) => (
                            <span key={code} className="block">{currency(value, code)}</span>
                          ))}
                        </p>
                      </div>
                      <div className="bg-white p-4">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">ZAR AUM</p>
                        <p className="mt-2 text-lg font-semibold">{currency(selectedClient.zarAum)}</p>
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-navy" />
                        <h3 className="text-sm font-semibold text-navy">Holdings used in calculation</h3>
                      </div>
                      <div className="max-h-[330px] space-y-3 overflow-y-auto">
                        {selectedClient.holdings.map((holding) => (
                          <div key={`${holding.investment}-${holding.nativeValue}`} className="border border-border p-3">
                            <p className="text-sm font-semibold text-foreground">{holding.investment}</p>
                            <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                              <span>{currency(holding.nativeValue, holding.currency)}</span>
                              <span>{currency(holding.zarValue)}</span>
                            </div>
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
                <CalendarDays className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Consolidated advisory fees</p>
                <h2 className="text-xl font-semibold text-navy">Client invoice summary for {selectedMonth.label}</h2>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-[#F2F5F7] text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Client</th>
                  <th className="px-4 py-3 font-semibold">Provider</th>
                  <th className="px-4 py-3 font-semibold">Native AUM</th>
                  <th className="px-4 py-3 font-semibold">ZAR AUM</th>
                  <th className="px-4 py-3 font-semibold">Rebate ZAR</th>
                  <th className="px-4 py-3 font-semibold">Advisory ZAR</th>
                </tr>
              </thead>
              <tbody>
                {clientSummaries.map((client) => (
                  <tr key={client.id} className="border-t border-border">
                    <td className="px-4 py-4 font-semibold text-navy">{client.client}</td>
                    <td className="px-4 py-4">{client.providers}</td>
                    <td className="px-4 py-4">
                      {Object.entries(client.nativeValues).map(([code, value]) => (
                        <span key={code} className="mr-3 whitespace-nowrap">{currency(value, code)}</span>
                      ))}
                    </td>
                    <td className="px-4 py-4">{currency(client.zarAum)}</td>
                    <td className="px-4 py-4">{currency(client.rebateZar)}</td>
                    <td className="px-4 py-4 font-semibold">{currency(client.advisoryZar)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {calculation && (
        <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-border bg-white shadow-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-border p-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Calculation audit</p>
              <h2 className="mt-1 text-xl font-semibold text-navy">
                {currency(calculationTotals.zarFee)} {calculation.feeType} fee
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {calculationBrand.name} | {selectedCalculationMonth.label} | USD/ZAR {selectedCalculationMonth.exchangeRates.USD.toFixed(4)}
              </p>
            </div>
            <button type="button" onClick={() => setCalculation(null)} className="flex h-9 w-9 items-center justify-center border border-border text-navy hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-5 overflow-y-auto p-5">
            <div className="border border-border bg-[#F8FAFB] p-4">
              <div className="flex items-center gap-2 text-navy">
                <Calculator className="h-5 w-5" />
                <h3 className="font-semibold">Formula</h3>
              </div>
              <p className="mt-3 text-sm text-foreground">
                ZAR fee = ZAR AUM x annual {calculation.feeType} rate / 12
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {currency(calculationTotals.aumZar)} x {percent(calculationTotals.annualRate)} / 12 = {currency(calculationTotals.zarFee)}
              </p>
              <div className="mt-3 text-sm text-muted-foreground">
                Native fee:
                {Object.entries(calculationTotals.nativeFees).map(([code, value]) => (
                  <span key={code} className="ml-2 font-semibold text-foreground">{currency(value, code)}</span>
                ))}
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                Native AUM:
                {Object.entries(calculationTotals.nativeAum).map(([code, value]) => (
                  <span key={code} className="ml-2 font-semibold text-foreground">{currency(value, code)}</span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold text-navy">Client contribution</h3>
              <div className="overflow-x-auto border border-border">
                <table className="w-full min-w-[620px] text-sm">
                  <thead className="bg-[#F2F5F7] text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Client</th>
                      <th className="px-3 py-2 font-semibold">Native AUM</th>
                      <th className="px-3 py-2 font-semibold">Native fee</th>
                      <th className="px-3 py-2 font-semibold">ZAR fee</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculationFeeRows.map((client) => (
                      <tr key={client.id} className="border-t border-border">
                        <td className="px-3 py-3 font-semibold text-navy">{client.client}</td>
                        <td className="px-3 py-3">
                          {Object.entries(client.nativeValues).map(([code, value]) => (
                            <span key={code} className="block whitespace-nowrap">{currency(value, code)}</span>
                          ))}
                        </td>
                        <td className="px-3 py-3">
                          {Object.entries(client.fee.nativeFees).map(([code, value]) => (
                            <span key={code} className="block whitespace-nowrap">{currency(value, code)}</span>
                          ))}
                        </td>
                        <td className="px-3 py-3 font-semibold">{currency(client.fee.zarFee)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
