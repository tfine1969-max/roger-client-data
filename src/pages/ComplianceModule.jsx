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
  { key: 'dashboard', label: 'Compliance Portal', icon: LayoutDashboard },
  { key: 'registers', label: 'Registers', icon: FileText },
  { key: 'verification', label: 'Client Verification', icon: ShieldCheck },
  { key: 'documents', label: 'Document Repository', icon: Upload },
  { key: 'audit', label: 'Audit Report', icon: Download },
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

const PortalTile = ({ icon: Icon, title, description, meta, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="text-left border border-border bg-card p-5 hover:border-navy/40 hover:bg-secondary/30 transition-colors"
  >
    <div className="flex items-start justify-between gap-4">
      <div className="w-10 h-10 border border-border bg-background flex items-center justify-center text-ocean">
        <Icon className="w-5 h-5" />
      </div>
      {meta && <Badge className="bg-secondary text-muted-foreground border-border">{meta}</Badge>}
    </div>
    <h3 className="text-lg font-semibold text-navy mt-4">{title}</h3>
    <p className="text-sm text-muted-foreground mt-2 leading-6">{description}</p>
  </button>
);

const isClientVerificationIssue = (client = {}) => {
  const status = String(client.fica_status || client.verification_status || client.review_status || '').toLowerCase();
  const needsReview = client.advisor_review_required || status.includes('referred') || status.includes('declined') || status.includes('manual') || status.includes('awaiting') || status.includes('pending');
  return !!client.email && (needsReview || (client.onboarding_complete && client.verification_status !== 'Verified' && client.fica_status !== 'Approved'));
};

const RegisterTypeDirectory = ({ entries, setFilters }) => (
  <section className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-5">
    {REGISTER_TYPES.map(type => {
      const typeEntries = entries.filter(entry => entry.register_type === type);
      const openCount = typeEntries.filter(entry => entry.status !== 'Closed').length;
      return (
        <button
          type="button"
          key={type}
          onClick={() => setFilters({ type, status: '', risk: '', advisor: '', category: '' })}
          className="border border-border bg-card p-3 text-left hover:border-navy/40 transition-colors"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-navy">{type}</p>
            <Badge className={openCount ? statusClass.Open : statusClass.Closed}>{openCount} open</Badge>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">{CATEGORY_BY_REGISTER[type] || 'Internal'} register</p>
        </button>
      );
    })}
  </section>
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

  const { data: documents = [] } = useQuery({
    queryKey: ['compliance-documents'],
    queryFn: () => base44.entities.Compliance_Documents.list('-created_date', 300),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['compliance-registers'] });
    queryClient.invalidateQueries({ queryKey: ['compliance-training'] });
    queryClient.invalidateQueries({ queryKey: ['compliance-documents'] });
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
  const verificationClients = clients.filter(isClientVerificationIssue);
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
            <section className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
              <PortalTile
                icon={FileText}
                title="Compliance Registers"
                description="Open every FICA, FAIS, POPIA and internal register. Empty registers are still visible and clickable for inspection readiness."
                meta={`${entries.length} entries`}
                onClick={() => setActiveTab('registers')}
              />
              <PortalTile
                icon={ShieldCheck}
                title="Client Verification"
                description="Review or reverify clients whose FICA, sanctions or document checks were not successful, then move verified clients into proposal work."
                meta={`${verificationClients.length} to review`}
                onClick={() => setActiveTab('verification')}
              />
              <PortalTile
                icon={Upload}
                title="Document Repository"
                description="Store and access the RMCP, training certificates, policies and evidence documents used during compliance audits."
                meta={`${documents.length} docs`}
                onClick={() => setActiveTab('documents')}
              />
              <PortalTile
                icon={Download}
                title="Audit Report"
                description="Generate an audit-ready export containing all registers, documents, training records, outstanding items and audit trail evidence."
                meta="FSCA pack"
                onClick={() => setActiveTab('audit')}
              />
            </section>

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
            <RegisterTypeDirectory entries={entries} setFilters={setFilters} />
            <RegistersTable entries={entries} clients={clients} currentUser={currentUser} filters={filters} setFilters={setFilters} onUpdated={refresh} />
          </div>
        )}

        {activeTab === 'verification' && (
          <VerificationQueue clients={verificationClients} entries={entries} refresh={refresh} />
        )}

        {activeTab === 'documents' && (
          <DocumentRepository documents={documents} entries={entries} clients={clients} currentUser={currentUser} refresh={refresh} />
        )}

        {activeTab === 'audit' && (
          <AuditReport entries={entries} documents={documents} training={training} clients={clients} exportCurrent={exportCurrent} />
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

const VerificationQueue = ({ clients, entries, refresh }) => {
  const navigate = useNavigate();

  const runReverify = async (client) => {
    await base44.functions.invoke('runBackgroundVerification', {
      client_id: client.id,
      client_type: client.client_type || 'Natural Person',
    });
    toast.success('Reverification started.');
  };

  const markVerified = async (client) => {
    await base44.entities.Clients.update(client.id, {
      verification_status: 'Verified',
      fica_status: 'Approved',
      review_status: 'Approved',
      advisor_review_required: false,
      client_status: 'Active',
      review_decision_at: new Date().toISOString(),
    });
    const related = entries.filter(entry => entry.linked_client_id === client.id && ['FICA_Exception', 'EDD', 'Sanctions', 'CDD', 'RMCP_Review'].includes(entry.register_type));
    await Promise.all(related.map(entry => updateComplianceRegister(entry, { status: 'Closed', audit_action: 'Client verified' }, 'Compliance', 'Client verified and ready for proposal phase')));
    toast.success('Client verified and ready for proposal phase.');
    refresh();
  };

  return (
    <div className="space-y-4">
      <section className="border border-border bg-card p-5">
        <h3 className="text-xl font-semibold text-navy">Client Verification & Reverification</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-3xl">
          Clients listed here have unsuccessful, pending, referred, declined or manual-review verification outcomes. Once verified, they can be sent through to proposal creation.
        </p>
      </section>
      <div className="border border-border bg-card overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-muted text-[10px] uppercase tracking-[.12em] text-muted-foreground">
            <tr><th className="p-3 text-left">Client</th><th className="p-3 text-left">FICA</th><th className="p-3 text-left">Risk</th><th className="p-3 text-left">Documents</th><th className="p-3 text-left">Issue</th><th className="p-3 text-left">Actions</th></tr>
          </thead>
          <tbody>
            {clients.map(client => {
              const related = entries.filter(entry => entry.linked_client_id === client.id && entry.status !== 'Closed');
              return (
                <tr key={client.id} className="border-t border-border">
                  <td className="p-3"><p className="font-semibold text-navy">{clientDisplayName(client)}</p><p className="text-xs text-muted-foreground">{client.email}</p></td>
                  <td className="p-3">{client.fica_status || client.verification_status || '-'}</td>
                  <td className="p-3"><Badge className={riskClass[normalizeRisk(client.rmcp_risk_band || client.fica_risk_band)]}>{normalizeRisk(client.rmcp_risk_band || client.fica_risk_band)}</Badge></td>
                  <td className="p-3">{client.doc_status || '-'}</td>
                  <td className="p-3 text-muted-foreground">{related[0]?.description || 'Verification requires review'}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => runReverify(client)} className="border border-border px-3 py-1.5 text-xs font-bold text-navy">Reverify</button>
                      <button type="button" onClick={() => markVerified(client)} className="bg-teal text-white px-3 py-1.5 text-xs font-bold">Mark Verified</button>
                      <button type="button" onClick={() => navigate(`/create-proposal?client=${client.id}`)} className="bg-navy text-white px-3 py-1.5 text-xs font-bold">Proposal</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {clients.length === 0 && <tr><td colSpan="6" className="p-8 text-center text-muted-foreground">No unsuccessful verification items right now.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const DocumentRepository = ({ documents, entries, clients, currentUser, refresh }) => {
  const [form, setForm] = useState({ document_type: 'RMCP', title: 'WealthWorks RMCP', description: '', linked_register_id: '', linked_client_id: '', staff_member: '', expiry_date: '' });
  const [uploading, setUploading] = useState(false);

  const upload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!form.title.trim()) {
      toast.error('Document title is required.');
      return;
    }
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.Compliance_Documents.create({
        ...form,
        file_url,
        file_name: file.name,
        uploaded_by: currentUser?.email || currentUser?.full_name || 'Compliance',
        uploaded_at: new Date().toISOString(),
        status: 'Current',
      });
      if (form.document_type === 'Training Certificate') {
        await base44.entities.Compliance_Training.create({
          staff_member: form.staff_member || form.title,
          training_type: form.title,
          certificate_upload: file_url,
          expiry_date: form.expiry_date,
          status: trainingStatus({ expiry_date: form.expiry_date }),
        });
      }
      toast.success('Document uploaded to compliance repository.');
      refresh();
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const rmcpDocs = documents.filter(doc => doc.document_type === 'RMCP');

  return (
    <div className="space-y-5">
      <section className="border border-border bg-card p-5">
        <h3 className="text-xl font-semibold text-navy">Compliance Document Repository</h3>
        <p className="text-sm text-muted-foreground mt-2">Upload RMCP versions, training certificates, register evidence, policies and audit evidence. Your RMCP PDF should be uploaded here as type RMCP.</p>
        {rmcpDocs.length > 0 && (
          <div className="mt-4 border border-teal/20 bg-teal/5 p-3">
            <p className="text-xs font-bold uppercase tracking-[.12em] text-teal mb-2">Current RMCP access</p>
            {rmcpDocs.map(doc => <a key={doc.id} href={doc.file_url} target="_blank" rel="noreferrer" className="block text-sm text-ocean hover:underline">{doc.title} - {doc.file_name}</a>)}
          </div>
        )}
      </section>

      <section className="border border-border bg-card p-4 grid md:grid-cols-3 gap-3">
        <label className="text-xs font-semibold text-navy">
          Type
          <select className="mt-1 w-full border border-border bg-background px-3 py-2" value={form.document_type} onChange={e => setForm({ ...form, document_type: e.target.value })}>
            {['RMCP', 'Training Certificate', 'Policy', 'Audit Evidence', 'Register Evidence', 'Other'].map(type => <option key={type} value={type}>{type}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-navy">
          Title
          <input className="mt-1 w-full border border-border bg-background px-3 py-2" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
        </label>
        <label className="text-xs font-semibold text-navy">
          Link Register
          <select className="mt-1 w-full border border-border bg-background px-3 py-2" value={form.linked_register_id} onChange={e => setForm({ ...form, linked_register_id: e.target.value })}>
            <option value="">None</option>
            {entries.map(entry => <option key={entry.id} value={entry.id}>{entry.register_type} - {entry.linked_client_name || entry.description}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-navy">
          Link Client
          <select className="mt-1 w-full border border-border bg-background px-3 py-2" value={form.linked_client_id} onChange={e => setForm({ ...form, linked_client_id: e.target.value })}>
            <option value="">None</option>
            {clients.map(client => <option key={client.id} value={client.id}>{clientDisplayName(client)}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-navy">
          Staff / Owner
          <input className="mt-1 w-full border border-border bg-background px-3 py-2" value={form.staff_member} onChange={e => setForm({ ...form, staff_member: e.target.value })} />
        </label>
        <label className="text-xs font-semibold text-navy">
          Expiry
          <input type="date" className="mt-1 w-full border border-border bg-background px-3 py-2" value={form.expiry_date} onChange={e => setForm({ ...form, expiry_date: e.target.value })} />
        </label>
        <label className="text-xs font-semibold text-navy md:col-span-3">
          Description
          <textarea className="mt-1 w-full border border-border bg-background px-3 py-2 min-h-16" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        </label>
        <div className="md:col-span-3">
          <label className="inline-flex items-center gap-2 bg-navy text-white px-4 py-2 text-xs font-bold uppercase tracking-[.08em] cursor-pointer">
            <Upload className="w-4 h-4" />
            {uploading ? 'Uploading...' : 'Upload Document'}
            <input type="file" className="hidden" onChange={upload} />
          </label>
        </div>
      </section>

      <div className="border border-border bg-card overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-muted text-[10px] uppercase tracking-[.12em] text-muted-foreground">
            <tr><th className="p-3 text-left">Type</th><th className="p-3 text-left">Title</th><th className="p-3 text-left">File</th><th className="p-3 text-left">Owner</th><th className="p-3 text-left">Uploaded</th><th className="p-3 text-left">Status</th></tr>
          </thead>
          <tbody>
            {documents.map(doc => (
              <tr key={doc.id} className="border-t border-border">
                <td className="p-3 font-semibold text-navy">{doc.document_type}</td>
                <td className="p-3">{doc.title}</td>
                <td className="p-3"><a href={doc.file_url} target="_blank" rel="noreferrer" className="text-ocean hover:underline">{doc.file_name || 'Open'}</a></td>
                <td className="p-3">{doc.staff_member || doc.uploaded_by || '-'}</td>
                <td className="p-3 text-muted-foreground">{dateFmt(doc.uploaded_at || doc.created_date)}</td>
                <td className="p-3"><Badge className={doc.status === 'Current' ? riskClass.Low : riskClass.Medium}>{doc.status || 'Current'}</Badge></td>
              </tr>
            ))}
            {documents.length === 0 && <tr><td colSpan="6" className="p-8 text-center text-muted-foreground">No compliance documents uploaded yet. Upload the WealthWorks RMCP first.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const AuditReport = ({ entries, documents, training, clients, exportCurrent }) => {
  const generateHtmlReport = () => {
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>WealthWorks Compliance Audit Report</title><style>body{font-family:Arial,sans-serif;color:#1e3a5f;padding:32px}h1,h2{margin-bottom:4px}table{border-collapse:collapse;width:100%;margin:16px 0 28px}th,td{border:1px solid #d9e2ec;padding:8px;font-size:12px;text-align:left}th{background:#eef2f6}.meta{color:#64748b;font-size:12px}.red{color:#b91c1c}.green{color:#047857}</style></head><body><h1>WealthWorks Compliance Audit Report</h1><p class="meta">Generated ${new Date().toLocaleString('en-ZA')} | Registers: ${entries.length} | Clients: ${clients.length} | Documents: ${documents.length}</p><h2>Register Summary</h2><table><thead><tr><th>Register</th><th>Total</th><th>Open</th><th>Escalated</th><th>Closed</th></tr></thead><tbody>${REGISTER_TYPES.map(type => { const rows = entries.filter(e => e.register_type === type); return `<tr><td>${type}</td><td>${rows.length}</td><td>${rows.filter(e => e.status === 'Open').length}</td><td class="red">${rows.filter(e => e.status === 'Escalated').length}</td><td class="green">${rows.filter(e => e.status === 'Closed').length}</td></tr>`; }).join('')}</tbody></table><h2>All Register Entries</h2><table><thead><tr><th>Date</th><th>Type</th><th>Client</th><th>Advisor</th><th>Status</th><th>Risk</th><th>Description</th></tr></thead><tbody>${entries.map(e => `<tr><td>${dateFmt(e.created_date)}</td><td>${e.register_type}</td><td>${e.linked_client_name || ''}</td><td>${e.linked_advisor || ''}</td><td>${e.status}</td><td>${e.risk_level}</td><td>${e.description || ''}</td></tr>`).join('')}</tbody></table><h2>Document Repository</h2><table><thead><tr><th>Type</th><th>Title</th><th>File</th><th>Status</th></tr></thead><tbody>${documents.map(d => `<tr><td>${d.document_type}</td><td>${d.title}</td><td>${d.file_name || ''}</td><td>${d.status || 'Current'}</td></tr>`).join('')}</tbody></table><h2>Training Register</h2><table><thead><tr><th>Staff</th><th>Training</th><th>Completed</th><th>Expiry</th><th>Status</th></tr></thead><tbody>${training.map(t => `<tr><td>${t.staff_member || ''}</td><td>${t.training_type || ''}</td><td>${dateFmt(t.date_completed)}</td><td>${dateFmt(t.expiry_date)}</td><td>${trainingStatus(t)}</td></tr>`).join('')}</tbody></table></body></html>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `wealthworks-compliance-audit-report-${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <section className="border border-border bg-card p-5">
        <h3 className="text-xl font-semibold text-navy">Audit-Ready Report Pack</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-3xl">Generate evidence for inspection: all registers, open/escalated counts, RMCP/document repository, training certificates and audit-trail source data.</p>
        <div className="flex flex-wrap gap-3 mt-5">
          <button type="button" onClick={generateHtmlReport} className="inline-flex items-center gap-2 bg-navy text-white px-4 py-2 text-xs font-bold uppercase tracking-[.08em]">
            <Download className="w-4 h-4" />
            Generate Audit Report
          </button>
          <button type="button" onClick={() => exportCurrent('all-compliance-registers', entries)} className="inline-flex items-center gap-2 border border-border text-navy px-4 py-2 text-xs font-bold uppercase tracking-[.08em]">
            <Download className="w-4 h-4" />
            Export Registers CSV
          </button>
        </div>
      </section>
      <RegisterTypeDirectory entries={entries} setFilters={() => {}} />
    </div>
  );
};

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
