import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Download,
  Eye,
  FileText,
  Filter,
  GraduationCap,
  LayoutDashboard,
  Plus,
  Scale,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  CATEGORY_BY_REGISTER,
  REGISTER_TYPES,
  clientDisplayName,
  daysOpen,
  exportRows,
  normalizeRisk,
  updateComplianceRegister,
  upsertComplianceRegister,
} from '@/lib/complianceEngine';
import { ADVISORS } from '@/lib/constants';

const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'registers', label: 'Registers', icon: FileText },
  { key: 'fica', label: 'FICA', icon: ShieldCheck },
  { key: 'fais', label: 'FAIS', icon: Scale },
  { key: 'training', label: 'Training', icon: GraduationCap },
  { key: 'oversight', label: 'Risk & Oversight', icon: Activity },
  { key: 'client', label: 'Client View', icon: Eye },
];

const FICA_TYPES = ['CDD', 'EDD', 'FICA_Exception', 'STR', 'TPR', 'Sanctions', 'RMCP_Review', 'BRA'];
const FAIS_TYPES = ['Advice', 'Product_Replacement', 'Complaint', 'Compliance_Breach', 'Conflict_of_Interest', 'Gift_Register', 'CPD', 'Representative', 'Debarment', 'Mandate'];
const OVERSIGHT_TYPES = ['RMCP_Review', 'BRA', 'Audit', 'Compliance_Breach', 'Third_Party', 'POPIA_Breach'];

const STATUS_OPTIONS = ['Open', 'Pending', 'Escalated', 'Closed'];
const RISK_OPTIONS = ['Low', 'Medium', 'High'];

const statusClass = {
  Open: 'bg-blue-50 text-blue-700 border-blue-200',
  Pending: 'bg-amber-50 text-amber-700 border-amber-200',
  Escalated: 'bg-red-50 text-red-700 border-red-200',
  Closed: 'bg-teal/10 text-teal border-teal/20',
};

const riskClass = {
  Low: 'bg-teal/10 text-teal border-teal/20',
  Medium: 'bg-amber-50 text-amber-700 border-amber-200',
  High: 'bg-red-50 text-red-700 border-red-200',
};

const dateFmt = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
};

const Badge = ({ children, className = '' }) => (
  <span className={`inline-flex items-center px-2 py-1 border text-[10px] font-bold uppercase tracking-[.08em] ${className}`}>
    {children}
  </span>
);

const Shell = ({ activeTab, setActiveTab, children }) => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden lg:flex w-64 shrink-0 bg-navy text-white flex-col">
        <div className="p-6 border-b border-white/10">
          <p className="text-[10px] uppercase tracking-[.18em] text-white/45">Advisor Portal</p>
          <h1 className="text-xl font-semibold mt-1">Compliance</h1>
        </div>
        <nav className="p-3 space-y-1">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors ${activeTab === tab.key ? 'bg-white text-navy' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={() => navigate('/advisor-dashboard')}
          className="mt-auto m-3 flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10"
        >
          <ArrowLeft className="w-4 h-4" />
          Advisor dashboard
        </button>
      </aside>
      <main className="flex-1 min-w-0">
        <div className="bg-card border-b border-border px-4 md:px-7 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[.18em] text-muted-foreground font-bold">Unified compliance engine</p>
              <h2 className="text-2xl font-semibold text-navy mt-1">Inspection-ready oversight</h2>
            </div>
            <button
              type="button"
              onClick={() => navigate('/advisor-dashboard')}
              className="lg:hidden border border-border px-3 py-2 text-xs font-semibold text-navy"
            >
              Back
            </button>
          </div>
          <div className="lg:hidden flex gap-2 overflow-x-auto mt-4 pb-1">
            {TABS.map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`shrink-0 px-3 py-2 text-xs font-semibold border ${activeTab === tab.key ? 'bg-navy text-white border-navy' : 'bg-card text-navy border-border'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        {children}
      </main>
    </div>
  );
};

const KpiCard = ({ label, value, critical }) => {
  const tone = value === 0 ? 'border-teal/30 text-teal' : critical ? 'border-red-300 text-red-700' : 'border-amber-300 text-amber-700';
  return (
    <div className={`bg-card border p-4 ${tone}`}>
      <p className="text-3xl font-semibold">{value}</p>
      <p className="text-[10px] uppercase tracking-[.12em] text-muted-foreground font-bold mt-1">{label}</p>
    </div>
  );
};

const HealthBar = ({ label, value }) => (
  <div>
    <div className="flex justify-between text-xs mb-1">
      <span className="font-semibold text-navy">{label}</span>
      <span className="text-muted-foreground">{value}%</span>
    </div>
    <div className="h-2 bg-secondary border border-border">
      <div className={`h-full ${value >= 90 ? 'bg-teal' : value >= 70 ? 'bg-amber-500' : 'bg-red-600'}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  </div>
);

const RegisterForm = ({ clients, currentUser, onCreated }) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    register_type: 'CDD',
    linked_client_id: '',
    linked_advisor: 'Trevor Fine',
    status: 'Open',
    risk_level: 'Low',
    description: '',
    action_required: '',
  });

  const selectedClient = clients.find(c => c.id === form.linked_client_id);

  const submit = async () => {
    if (!form.description.trim()) {
      toast.error('Description is required.');
      return;
    }
    await upsertComplianceRegister({
      ...form,
      category: CATEGORY_BY_REGISTER[form.register_type] || 'Internal',
      linked_client_name: selectedClient ? clientDisplayName(selectedClient) : '',
      source_event: 'Manual register entry',
    }, currentUser);
    toast.success('Compliance entry created.');
    setOpen(false);
    onCreated();
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 bg-navy text-white px-4 py-2 text-xs font-bold uppercase tracking-[.08em]">
        <Plus className="w-4 h-4" />
        New Entry
      </button>
    );
  }

  return (
    <div className="border border-border bg-card p-4 mb-4">
      <div className="grid md:grid-cols-3 gap-3">
        <label className="text-xs font-semibold text-navy">
          Register Type
          <select className="mt-1 w-full border border-border bg-background px-3 py-2 text-sm" value={form.register_type} onChange={e => setForm({ ...form, register_type: e.target.value })}>
            {REGISTER_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-navy">
          Client
          <select className="mt-1 w-full border border-border bg-background px-3 py-2 text-sm" value={form.linked_client_id} onChange={e => setForm({ ...form, linked_client_id: e.target.value })}>
            <option value="">No linked client</option>
            {clients.map(client => <option key={client.id} value={client.id}>{clientDisplayName(client)}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-navy">
          Advisor
          <select className="mt-1 w-full border border-border bg-background px-3 py-2 text-sm" value={form.linked_advisor} onChange={e => setForm({ ...form, linked_advisor: e.target.value })}>
            {Object.values(ADVISORS).map(advisor => <option key={advisor.email} value={advisor.name}>{advisor.name}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-navy">
          Status
          <select className="mt-1 w-full border border-border bg-background px-3 py-2 text-sm" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
            {STATUS_OPTIONS.map(status => <option key={status} value={status}>{status}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-navy">
          Risk
          <select className="mt-1 w-full border border-border bg-background px-3 py-2 text-sm" value={form.risk_level} onChange={e => setForm({ ...form, risk_level: e.target.value })}>
            {RISK_OPTIONS.map(risk => <option key={risk} value={risk}>{risk}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-navy md:col-span-3">
          Description
          <textarea className="mt-1 w-full border border-border bg-background px-3 py-2 text-sm min-h-20" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        </label>
        <label className="text-xs font-semibold text-navy md:col-span-3">
          Action Required
          <textarea className="mt-1 w-full border border-border bg-background px-3 py-2 text-sm min-h-16" value={form.action_required} onChange={e => setForm({ ...form, action_required: e.target.value })} />
        </label>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button type="button" onClick={() => setOpen(false)} className="border border-border px-4 py-2 text-xs font-semibold text-navy">Cancel</button>
        <button type="button" onClick={submit} className="bg-navy text-white px-4 py-2 text-xs font-bold">Create</button>
      </div>
    </div>
  );
};

const DetailDrawer = ({ entry, clients, currentUser, onClose, onUpdated }) => {
  const [uploading, setUploading] = useState(false);
  if (!entry) return null;

  const client = clients.find(c => c.id === entry.linked_client_id);
  const auditTrail = Array.isArray(entry.audit_trail) ? entry.audit_trail : [];
  const documents = Array.isArray(entry.documents) ? entry.documents : [];

  const act = async (status, action) => {
    await updateComplianceRegister(entry, {
      status,
      reviewed_by: currentUser?.email || currentUser?.full_name || 'Compliance',
      review_date: new Date().toISOString(),
      audit_action: action,
    }, currentUser, action);
    toast.success(`Entry ${action.toLowerCase()}.`);
    onUpdated();
  };

  const uploadDoc = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await updateComplianceRegister(entry, {
        documents: [
          ...documents,
          { name: file.name, url: file_url, uploaded_at: new Date().toISOString(), uploaded_by: currentUser?.email || 'Compliance' },
        ],
        audit_action: 'Document uploaded',
      }, currentUser, file.name);
      toast.success('Document attached.');
      onUpdated();
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20">
      <aside className="w-full max-w-xl h-full bg-card border-l border-border overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border px-5 py-4 flex justify-between items-center">
          <div>
            <p className="text-[10px] uppercase tracking-[.16em] text-muted-foreground font-bold">{entry.register_type}</p>
            <h3 className="text-lg font-semibold text-navy">{entry.linked_client_name || 'Register entry'}</h3>
          </div>
          <button type="button" onClick={onClose} className="p-2 border border-border text-navy"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-5">
          <section>
            <h4 className="text-xs uppercase tracking-[.12em] text-muted-foreground font-bold mb-3">Summary</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-muted-foreground text-xs">Status</p><Badge className={statusClass[entry.status] || statusClass.Open}>{entry.status}</Badge></div>
              <div><p className="text-muted-foreground text-xs">Risk</p><Badge className={riskClass[entry.risk_level] || riskClass.Low}>{entry.risk_level}</Badge></div>
              <div><p className="text-muted-foreground text-xs">Advisor</p><p className="text-navy">{entry.linked_advisor || '-'}</p></div>
              <div><p className="text-muted-foreground text-xs">Days Open</p><p className="text-navy">{daysOpen(entry)}</p></div>
            </div>
          </section>
          <section>
            <h4 className="text-xs uppercase tracking-[.12em] text-muted-foreground font-bold mb-2">Description</h4>
            <p className="text-sm text-navy whitespace-pre-wrap">{entry.description || '-'}</p>
            <p className="text-sm text-muted-foreground mt-3 whitespace-pre-wrap">{entry.action_required || '-'}</p>
          </section>
          {client && (
            <section>
              <h4 className="text-xs uppercase tracking-[.12em] text-muted-foreground font-bold mb-2">Linked Client</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <p><span className="text-muted-foreground">FICA:</span> {client.fica_status || '-'}</p>
                <p><span className="text-muted-foreground">Risk:</span> {client.rmcp_risk_band || client.fica_risk_band || '-'}</p>
                <p><span className="text-muted-foreground">Docs:</span> {client.doc_status || '-'}</p>
                <p><span className="text-muted-foreground">Review:</span> {client.review_status || '-'}</p>
              </div>
            </section>
          )}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs uppercase tracking-[.12em] text-muted-foreground font-bold">Documents</h4>
              <label className="inline-flex items-center gap-1 text-xs text-ocean cursor-pointer">
                <Upload className="w-3 h-3" />
                {uploading ? 'Uploading' : 'Upload'}
                <input type="file" className="hidden" onChange={uploadDoc} />
              </label>
            </div>
            {documents.length === 0 && <p className="text-sm text-muted-foreground">No documents attached.</p>}
            {documents.map(doc => (
              <a key={`${doc.url}-${doc.name}`} href={doc.url} target="_blank" rel="noreferrer" className="block text-sm text-ocean hover:underline py-1">{doc.name || 'Document'}</a>
            ))}
          </section>
          <section>
            <h4 className="text-xs uppercase tracking-[.12em] text-muted-foreground font-bold mb-2">Audit Trail</h4>
            <div className="border border-border">
              {auditTrail.length === 0 && <p className="p-3 text-sm text-muted-foreground">No audit events.</p>}
              {auditTrail.map((audit, index) => (
                <div key={`${audit.timestamp}-${index}`} className="p-3 border-b border-border last:border-0">
                  <p className="text-sm font-semibold text-navy">{audit.action}</p>
                  <p className="text-xs text-muted-foreground">{audit.actor} - {dateFmt(audit.timestamp)}</p>
                  {audit.notes && <p className="text-xs text-navy mt-1">{audit.notes}</p>}
                </div>
              ))}
            </div>
          </section>
          <section className="flex flex-wrap gap-2">
            <button type="button" onClick={() => act('Pending', 'Marked reviewed')} className="px-3 py-2 text-xs font-bold border border-border text-navy">Mark Reviewed</button>
            <button type="button" onClick={() => act('Escalated', 'Escalated')} className="px-3 py-2 text-xs font-bold bg-red-600 text-white">Escalate</button>
            <button type="button" onClick={() => act('Closed', 'Closed')} className="px-3 py-2 text-xs font-bold bg-teal text-white">Close</button>
          </section>
        </div>
      </aside>
    </div>
  );
};

const RegistersTable = ({ entries, clients, currentUser, filters, setFilters, onUpdated, showFilters = true }) => {
  const [selected, setSelected] = useState(null);
  const filtered = entries.filter(entry => {
    if (filters.type && entry.register_type !== filters.type) return false;
    if (filters.status && entry.status !== filters.status) return false;
    if (filters.risk && entry.risk_level !== filters.risk) return false;
    if (filters.advisor && entry.linked_advisor !== filters.advisor) return false;
    if (filters.category && entry.category !== filters.category) return false;
    return true;
  });

  return (
    <>
      {showFilters && (
        <div className="border border-border bg-card p-3 mb-4 grid md:grid-cols-5 gap-3">
          <label className="text-xs font-semibold text-navy">
            Type
            <select className="mt-1 w-full border border-border bg-background px-2 py-2" value={filters.type} onChange={e => setFilters({ ...filters, type: e.target.value })}>
              <option value="">All</option>
              {REGISTER_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-navy">
            Status
            <select className="mt-1 w-full border border-border bg-background px-2 py-2" value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
              <option value="">All</option>
              {STATUS_OPTIONS.map(status => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-navy">
            Risk
            <select className="mt-1 w-full border border-border bg-background px-2 py-2" value={filters.risk} onChange={e => setFilters({ ...filters, risk: e.target.value })}>
              <option value="">All</option>
              {RISK_OPTIONS.map(risk => <option key={risk} value={risk}>{risk}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-navy">
            Advisor
            <select className="mt-1 w-full border border-border bg-background px-2 py-2" value={filters.advisor} onChange={e => setFilters({ ...filters, advisor: e.target.value })}>
              <option value="">All</option>
              {Object.values(ADVISORS).map(advisor => <option key={advisor.email} value={advisor.name}>{advisor.name}</option>)}
            </select>
          </label>
          <div className="flex items-end gap-2">
            <button type="button" onClick={() => setFilters({ type: '', status: '', risk: '', advisor: '', category: filters.category || '' })} className="w-full border border-border px-3 py-2 text-xs font-bold text-navy">
              Clear
            </button>
          </div>
        </div>
      )}
      <div className="border border-border bg-card overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-muted text-[10px] uppercase tracking-[.12em] text-muted-foreground">
            <tr>
              <th className="text-left p-3">Date</th>
              <th className="text-left p-3">Register Type</th>
              <th className="text-left p-3">Client</th>
              <th className="text-left p-3">Advisor</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Risk</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan="7" className="p-8 text-center text-muted-foreground">No register entries found.</td></tr>
            )}
            {filtered.map(entry => (
              <tr key={entry.id} className="border-t border-border hover:bg-secondary/40">
                <td className="p-3 text-muted-foreground">{dateFmt(entry.created_date)}</td>
                <td className="p-3 font-semibold text-navy">{entry.register_type}</td>
                <td className="p-3">{entry.linked_client_name || '-'}</td>
                <td className="p-3">{entry.linked_advisor || '-'}</td>
                <td className="p-3"><Badge className={statusClass[entry.status] || statusClass.Open}>{entry.status}</Badge></td>
                <td className="p-3"><Badge className={riskClass[entry.risk_level] || riskClass.Low}>{entry.risk_level}</Badge></td>
                <td className="p-3">
                  <button type="button" onClick={() => setSelected(entry)} className="inline-flex items-center gap-1 text-xs font-bold text-ocean">
                    <Eye className="w-3.5 h-3.5" />
                    Detail
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <DetailDrawer entry={selected} clients={clients} currentUser={currentUser} onClose={() => setSelected(null)} onUpdated={() => { setSelected(null); onUpdated(); }} />
    </>
  );
};

export default function ComplianceModule() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const activeTab = searchParams.get('tab') || 'dashboard';
  const setActiveTab = (tab) => setSearchParams({ tab });
  const [currentUser, setCurrentUser] = useState(null);
  const [filters, setFilters] = useState({ type: '', status: '', risk: '', advisor: '', category: '' });
  const [clientId, setClientId] = useState('');

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: entries = [], isLoading: registersLoading } = useQuery({
    queryKey: ['compliance-registers'],
    queryFn: () => base44.entities.Compliance_Registers.list('-created_date', 500),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Clients.list('-created_date', 500),
  });

  const { data: training = [] } = useQuery({
    queryKey: ['compliance-training'],
    queryFn: () => base44.entities.Compliance_Training.list('-created_date', 200),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['compliance-registers'] });
    queryClient.invalidateQueries({ queryKey: ['compliance-training'] });
  };

  const metrics = useMemo(() => {
    const open = entries.filter(e => e.status !== 'Closed');
    const outstandingFica = open.filter(e => e.category === 'FICA' || e.register_type === 'FICA_Exception').length;
    const highRiskClients = clients.filter(c => normalizeRisk(c.rmcp_risk_band || c.fica_risk_band) === 'High').length;
    const openComplaints = open.filter(e => e.register_type === 'Complaint').length;
    const breaches = open.filter(e => ['Compliance_Breach', 'POPIA_Breach'].includes(e.register_type)).length;
    const closed = entries.filter(e => e.status === 'Closed').length;
    const percent = (good, total) => total ? Math.round((good / total) * 100) : 100;
    return {
      outstandingFica,
      highRiskClients,
      openComplaints,
      breaches,
      ficaCompliance: percent(entries.filter(e => e.category === 'FICA' && e.status === 'Closed').length, entries.filter(e => e.category === 'FICA').length),
      trainingCompliance: percent(training.filter(t => trainingStatus(t) === 'Valid').length, training.length),
      complaintsSla: percent(entries.filter(e => e.register_type === 'Complaint' && daysOpen(e) <= 42).length, entries.filter(e => e.register_type === 'Complaint').length),
      breachResolution: percent(closed, entries.length),
    };
  }, [entries, clients, training]);

  const immediate = entries
    .filter(e => e.status === 'Open' || e.status === 'Escalated' || e.risk_level === 'High')
    .sort((a, b) => daysOpen(b) - daysOpen(a))
    .slice(0, 8);

  const recent = entries.slice(0, 8);
  const selectedClient = clients.find(c => c.id === clientId) || clients[0];
  const selectedClientEntries = selectedClient ? entries.filter(e => e.linked_client_id === selectedClient.id) : [];

  const exportCurrent = (name, rows = entries) => {
    exportRows(`${name}-${new Date().toISOString().slice(0, 10)}.csv`, rows.map(row => ({
      date: dateFmt(row.created_date),
      register_type: row.register_type,
      category: row.category,
      client: row.linked_client_name,
      advisor: row.linked_advisor,
      status: row.status,
      risk: row.risk_level,
      days_open: daysOpen(row),
      description: row.description,
      action_required: row.action_required,
    })));
  };

  return (
    <Shell activeTab={activeTab} setActiveTab={setActiveTab}>
      <div className="p-4 md:p-7 max-w-7xl mx-auto">
        {registersLoading && <div className="mb-4 text-sm text-muted-foreground">Loading compliance registers...</div>}

        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-4 gap-4">
              <KpiCard label="Outstanding FICA" value={metrics.outstandingFica} critical={metrics.outstandingFica > 5} />
              <KpiCard label="High Risk Clients" value={metrics.highRiskClients} critical={metrics.highRiskClients > 0} />
              <KpiCard label="Open Complaints" value={metrics.openComplaints} critical={metrics.openComplaints > 0} />
              <KpiCard label="Breaches" value={metrics.breaches} critical={metrics.breaches > 0} />
            </div>
            <div className="grid lg:grid-cols-2 gap-5">
              <section className="border border-border bg-card">
                <div className="p-4 border-b border-border"><h3 className="font-semibold text-navy">Immediate Actions</h3></div>
                <div className="divide-y divide-border">
                  {immediate.map(entry => (
                    <div key={entry.id} className="p-4 grid grid-cols-[1fr_1fr_70px_90px] gap-3 items-center text-sm">
                      <div><p className="font-semibold text-navy">{entry.register_type}</p><p className="text-xs text-muted-foreground">{entry.description}</p></div>
                      <p>{entry.linked_client_name || '-'}</p>
                      <p className="text-red-700 font-semibold">{daysOpen(entry)} days</p>
                      <Badge className={statusClass[entry.status] || statusClass.Open}>{entry.status}</Badge>
                    </div>
                  ))}
                  {immediate.length === 0 && <p className="p-6 text-sm text-muted-foreground">No immediate compliance actions.</p>}
                </div>
              </section>
              <section className="border border-border bg-card">
                <div className="p-4 border-b border-border"><h3 className="font-semibold text-navy">Recent Activity</h3></div>
                <div className="divide-y divide-border">
                  {recent.map(entry => (
                    <div key={entry.id} className="p-4 grid grid-cols-[90px_1fr_1fr_90px] gap-3 items-center text-sm">
                      <p className="text-muted-foreground">{dateFmt(entry.created_date)}</p>
                      <p className="font-semibold text-navy">{entry.register_type}</p>
                      <p>{entry.linked_advisor || '-'}</p>
                      <Badge className={statusClass[entry.status] || statusClass.Open}>{entry.status}</Badge>
                    </div>
                  ))}
                </div>
              </section>
            </div>
            <section className="border border-border bg-card p-5">
              <h3 className="font-semibold text-navy mb-4">Compliance Health</h3>
              <div className="grid md:grid-cols-4 gap-5">
                <HealthBar label="FICA Compliance" value={metrics.ficaCompliance} />
                <HealthBar label="Training Compliance" value={metrics.trainingCompliance} />
                <HealthBar label="Complaints SLA" value={metrics.complaintsSla} />
                <HealthBar label="Breach Resolution" value={metrics.breachResolution} />
              </div>
            </section>
          </div>
        )}

        {activeTab === 'registers' && (
          <div>
            <div className="flex flex-wrap gap-3 justify-between mb-4">
              <RegisterForm clients={clients} currentUser={currentUser} onCreated={refresh} />
              <div className="flex gap-2">
                <button type="button" onClick={() => exportCurrent('compliance-registers')} className="inline-flex items-center gap-2 border border-border px-4 py-2 text-xs font-bold text-navy">
                  <Download className="w-4 h-4" />
                  Export
                </button>
                <button type="button" className="inline-flex items-center gap-2 border border-border px-4 py-2 text-xs font-bold text-navy">
                  <Filter className="w-4 h-4" />
                  Filter
                </button>
              </div>
            </div>
            <RegistersTable entries={entries} clients={clients} currentUser={currentUser} filters={filters} setFilters={setFilters} onUpdated={refresh} />
          </div>
        )}

        {activeTab === 'fica' && (
          <ModuleTabs
            tabs={FICA_TYPES}
            entries={entries}
            clients={clients}
            currentUser={currentUser}
            onUpdated={refresh}
            onExport={type => exportCurrent(`fica-${type}`, entries.filter(e => type === 'All' ? FICA_TYPES.includes(e.register_type) : e.register_type === type))}
          />
        )}

        {activeTab === 'fais' && (
          <ModuleTabs
            tabs={FAIS_TYPES}
            entries={entries}
            clients={clients}
            currentUser={currentUser}
            onUpdated={refresh}
            showComplaintSla
            onExport={type => exportCurrent(`fais-${type}`, entries.filter(e => type === 'All' ? FAIS_TYPES.includes(e.register_type) : e.register_type === type))}
          />
        )}

        {activeTab === 'training' && (
          <TrainingView training={training} refresh={refresh} exportCurrent={() => exportRows('training-register.csv', training.map(t => ({ staff: t.staff_member, training: t.training_type, completed: t.date_completed, expiry: t.expiry_date, status: trainingStatus(t) })))} />
        )}

        {activeTab === 'oversight' && (
          <ModuleTabs
            tabs={OVERSIGHT_TYPES}
            entries={entries}
            clients={clients}
            currentUser={currentUser}
            onUpdated={refresh}
            onExport={type => exportCurrent(`oversight-${type}`, entries.filter(e => type === 'All' ? OVERSIGHT_TYPES.includes(e.register_type) : e.register_type === type))}
          />
        )}

        {activeTab === 'client' && (
          <div className="space-y-5">
            <div className="border border-border bg-card p-4">
              <label className="text-xs font-semibold text-navy">
                Select Client
                <select className="mt-1 block w-full max-w-md border border-border bg-background px-3 py-2 text-sm" value={selectedClient?.id || ''} onChange={e => setClientId(e.target.value)}>
                  {clients.map(client => <option key={client.id} value={client.id}>{clientDisplayName(client)}</option>)}
                </select>
              </label>
            </div>
            {selectedClient && (
              <section className="border border-border bg-card p-5">
                <h3 className="text-xl font-semibold text-navy">{clientDisplayName(selectedClient)}</h3>
                <div className="grid md:grid-cols-5 gap-4 mt-4">
                  <Info label="FICA" value={selectedClient.fica_status || selectedClient.verification_status || '-'} />
                  <Info label="Risk" value={selectedClient.rmcp_risk_band || selectedClient.fica_risk_band || '-'} />
                  <Info label="Documents" value={selectedClient.doc_status || '-'} />
                  <Info label="Complaints" value={selectedClientEntries.filter(e => e.register_type === 'Complaint').length} />
                  <Info label="Advice Records" value={selectedClientEntries.filter(e => e.register_type === 'Advice').length} />
                </div>
              </section>
            )}
            <RegistersTable entries={selectedClientEntries} clients={clients} currentUser={currentUser} filters={{ type: '', status: '', risk: '', advisor: '', category: '' }} setFilters={() => {}} onUpdated={refresh} showFilters={false} />
          </div>
        )}
      </div>
    </Shell>
  );
}

const Info = ({ label, value }) => (
  <div className="border border-border bg-background p-3">
    <p className="text-[10px] uppercase tracking-[.12em] text-muted-foreground font-bold">{label}</p>
    <p className="text-lg font-semibold text-navy mt-1">{value}</p>
  </div>
);

const ModuleTabs = ({ tabs, entries, clients, currentUser, onUpdated, onExport, showComplaintSla = false }) => {
  const [active, setActive] = useState('All');
  const relevant = entries.filter(e => active === 'All' ? tabs.includes(e.register_type) : e.register_type === active);
  return (
    <div>
      <div className="flex flex-wrap gap-2 justify-between mb-4">
        <div className="flex flex-wrap gap-2">
          {['All', ...tabs].map(tab => (
            <button key={tab} type="button" onClick={() => setActive(tab)} className={`px-3 py-2 text-xs font-bold border ${active === tab ? 'bg-navy text-white border-navy' : 'bg-card text-navy border-border'}`}>
              {tab}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => onExport(active)} className="inline-flex items-center gap-2 border border-border px-4 py-2 text-xs font-bold text-navy">
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>
      {showComplaintSla && active === 'Complaint' && (
        <div className="mb-4 border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Complaint SLA turns red once days open exceeds 42 calendar days.
        </div>
      )}
      <RegistersTable entries={relevant} clients={clients} currentUser={currentUser} filters={{ type: '', status: '', risk: '', advisor: '', category: '' }} setFilters={() => {}} onUpdated={onUpdated} showFilters={false} />
    </div>
  );
};

const trainingStatus = (record = {}) => {
  if (!record.expiry_date) return record.status || 'Valid';
  const days = Math.ceil((new Date(record.expiry_date).getTime() - Date.now()) / 86400000);
  if (days < 0) return 'Expired';
  if (days <= 30) return 'Due soon';
  return 'Valid';
};

const TrainingView = ({ training, refresh, exportCurrent }) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ staff_member: '', training_type: 'FICA Training', date_completed: '', expiry_date: '' });

  const create = async () => {
    if (!form.staff_member || !form.training_type) {
      toast.error('Staff member and training type are required.');
      return;
    }
    await base44.entities.Compliance_Training.create({ ...form, status: trainingStatus(form) });
    toast.success('Training record created.');
    setOpen(false);
    refresh();
  };

  return (
    <div>
      <div className="flex justify-between gap-3 mb-4">
        <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 bg-navy text-white px-4 py-2 text-xs font-bold uppercase tracking-[.08em]">
          <Plus className="w-4 h-4" />
          Training Entry
        </button>
        <button type="button" onClick={exportCurrent} className="inline-flex items-center gap-2 border border-border px-4 py-2 text-xs font-bold text-navy">
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>
      {open && (
        <div className="border border-border bg-card p-4 mb-4 grid md:grid-cols-4 gap-3">
          <input className="border border-border px-3 py-2" placeholder="Staff member" value={form.staff_member} onChange={e => setForm({ ...form, staff_member: e.target.value })} />
          <input className="border border-border px-3 py-2" placeholder="Training type" value={form.training_type} onChange={e => setForm({ ...form, training_type: e.target.value })} />
          <input className="border border-border px-3 py-2" type="date" value={form.date_completed} onChange={e => setForm({ ...form, date_completed: e.target.value })} />
          <input className="border border-border px-3 py-2" type="date" value={form.expiry_date} onChange={e => setForm({ ...form, expiry_date: e.target.value })} />
          <div className="md:col-span-4 flex justify-end gap-2">
            <button type="button" className="border border-border px-4 py-2 text-xs font-bold" onClick={() => setOpen(false)}>Cancel</button>
            <button type="button" className="bg-navy text-white px-4 py-2 text-xs font-bold" onClick={create}>Create</button>
          </div>
        </div>
      )}
      <div className="border border-border bg-card overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted text-[10px] uppercase tracking-[.12em] text-muted-foreground">
            <tr><th className="p-3 text-left">Staff</th><th className="p-3 text-left">Training</th><th className="p-3 text-left">Completed</th><th className="p-3 text-left">Expiry</th><th className="p-3 text-left">Status</th></tr>
          </thead>
          <tbody>
            {training.map(record => {
              const status = trainingStatus(record);
              return (
                <tr key={record.id} className="border-t border-border">
                  <td className="p-3 font-semibold text-navy">{record.staff_member}</td>
                  <td className="p-3">{record.training_type}</td>
                  <td className="p-3">{dateFmt(record.date_completed)}</td>
                  <td className="p-3">{dateFmt(record.expiry_date)}</td>
                  <td className="p-3"><Badge className={status === 'Valid' ? riskClass.Low : status === 'Due soon' ? riskClass.Medium : riskClass.High}>{status}</Badge></td>
                </tr>
              );
            })}
            {training.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-muted-foreground">No training records yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};
