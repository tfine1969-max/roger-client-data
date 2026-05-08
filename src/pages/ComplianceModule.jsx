import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

const safeEntityList = async (entity, order, limit) => {
  try {
    if (!entity?.list) return [];
    return await entity.list(order, limit);
  } catch (error) {
    console.warn('[ComplianceModule] Optional compliance entity unavailable:', error?.message || error);
    return [];
  }
};

const FICA_TYPES = ['CDD', 'EDD', 'FICA_Exception', 'STR', 'TPR', 'Sanctions', 'RMCP_Review', 'BRA'];
const FAIS_TYPES = ['Advice', 'Product_Replacement', 'Complaint', 'Compliance_Breach', 'Conflict_of_Interest', 'Gift_Register', 'CPD', 'Representative', 'Debarment', 'Mandate'];
const OVERSIGHT_TYPES = ['RMCP_Review', 'BRA', 'Audit', 'Compliance_Breach', 'Third_Party', 'POPIA_Breach'];

const STATUS_OPTIONS = ['Open', 'Pending', 'Escalated', 'Closed'];
const RISK_OPTIONS = ['Low', 'Medium', 'High'];
const STAFF_MEMBERS = ['Trevor Fine', 'Roger Eskinazi', 'Malcolm Munsamy', 'Gemma De Luca'];
const CLIENT_TYPE_OPTIONS = ['Natural Person', 'Company', 'Trust', 'Partnership', 'Other'];

const REGISTER_TYPE_LABELS = {
  CDD: 'Customer Due Diligence',
  EDD: 'Enhanced Due Diligence',
  FICA_Exception: 'FICA Exception',
  STR: 'Suspicious Transaction Report',
  TPR: 'Third Party Relationship',
  Sanctions: 'Sanctions Screening',
  FICA_Training: 'FICA Training',
  RMCP_Review: 'Risk Management and Compliance Programme Review',
  Advice: 'Advice Register',
  Product_Replacement: 'Product Replacement',
  Complaint: 'Complaint Register',
  Compliance_Breach: 'Compliance Breach',
  Conflict_of_Interest: 'Conflict of Interest',
  Gift_Register: 'Gift Register',
  CPD: 'Continuous Professional Development',
  Representative: 'Representative Register',
  Debarment: 'Debarment Register',
  POPIA_Breach: 'Protection of Personal Information Act Breach',
  Mandate: 'Mandate Register',
  Third_Party: 'Third Party Register',
  Audit: 'Audit Register',
  BRA: 'Business Risk Assessment',
};

const FIELD_LABELS = {
  'ID / Registration Number': 'Identity or Registration Number',
  'CDD Completed By': 'Customer Due Diligence Completed By',
  'CDD Completion Date': 'Customer Due Diligence Completion Date',
  'Trigger for EDD': 'Trigger for Enhanced Due Diligence',
  'PEP Status': 'Politically Exposed Person Status',
  'Reported to FIC': 'Reported to Financial Intelligence Centre',
  'Third Party FSP / Registration Number': 'Third Party Financial Services Provider or Registration Number',
  'ROA Generated': 'Record of Advice Generated',
  'Reportable to FSCA': 'Reportable to Financial Sector Conduct Authority',
  'FSCA Number': 'Financial Sector Conduct Authority Number',
  'FSCA Notified': 'Financial Sector Conduct Authority Notified',
};

const registerTypeLabel = (type) => REGISTER_TYPE_LABELS[type] || String(type || '').replace(/_/g, ' ');
const fieldLabel = (field) => FIELD_LABELS[field] || field;

const REGISTER_FIELD_CONFIG = {
  CDD: ['ID / Registration Number', 'Date Onboarded', 'Verification Method', 'ID Verified', 'Address Verified', 'Bank Account Verified', 'Source of Funds Obtained', 'CDD Completed By', 'CDD Completion Date', 'Outstanding Requirements', 'Verification Status'],
  EDD: ['Trigger for EDD', 'PEP Status', 'Sanctions Check Result', 'Source of Wealth Verified', 'Supporting Documents Uploaded', 'Senior Management Approval', 'Approved By', 'Approval Date', 'Monitoring Frequency'],
  FICA_Exception: ['Exception Type', 'Reason for Exception', 'Risk Assessment', 'Interim Measures Taken', 'Approved By (MLCO)', 'Expiry Date', 'Follow-up Required', 'Final Resolution'],
  STR: ['Transaction Description', 'Suspicion Type', 'Date Detected', 'Reported to FIC', 'Report Reference Number', 'Report Date', 'Reported By', 'Internal Notes', 'Outcome / Feedback'],
  TPR: ['Third Party Name', 'Third Party FSP / Registration Number', 'Agreement in Place', 'Documents Received', 'Date Received', 'Verified By', 'Risk Assessment', 'Ongoing Monitoring Required'],
  Sanctions: ['Screening Date', 'Screening Provider', 'Result', 'Match Details', 'Action Taken', 'Escalated', 'Cleared By'],
  FICA_Training: ['Employee Name', 'Role', 'Training Type', 'Training Provider', 'Training Date', 'Assessment Score', 'Pass/Fail', 'Next Training Due Date', 'Certificate Uploaded'],
  RMCP_Review: ['Review Period', 'Review Type', 'Conducted By', 'Key Findings', 'Deficiencies Identified', 'Actions Required', 'Responsible Person', 'Deadline', 'Completion Status'],
  BRA: ['Risk Category', 'Risk Description', 'Inherent Risk Score', 'Controls in Place', 'Residual Risk Score', 'Risk Owner', 'Review Date', 'Action Required'],
  Advice: ['Date of Advice', 'Type of Advice', 'Products Recommended', 'Risk Profile', 'Needs Analysis Completed', 'ROA Generated', 'Client Signed', 'Replacement Involved'],
  Product_Replacement: ['Replaced Product', 'New Product', 'Replacement Reason', 'Replacement Consequences Explained', 'Cost Comparison Done', 'Client Acknowledged', 'Advisor Justification', 'Supporting Documents'],
  Complaint: ['Complaint ID', 'Date Received', 'Complaint Type', 'Description', 'Assigned To', 'Resolution Deadline', 'Outcome', 'Reportable to FSCA'],
  Compliance_Breach: ['Breach Type', 'Description', 'Date Identified', 'Severity', 'Root Cause', 'Immediate Action', 'Remediation Plan', 'Reported to Regulator', 'Closed Date'],
  Conflict_of_Interest: ['Person Involved', 'Conflict Type', 'Description', 'Date Identified', 'Mitigation Action', 'Approved By', 'Status'],
  Gift_Register: ['Employee Name', 'Gift Type', 'Provider', 'Value (ZAR)', 'Date Received', 'Within Policy', 'Approved By'],
  CPD: ['Advisor Name', 'CPD Category', 'Hours Earned', 'Date Completed', 'Provider', 'Total YTD Hours', 'Compliance Status'],
  Representative: ['Name', 'FSCA Number', 'Status', 'Fit & Proper Status', 'Supervision Status', 'CPD Status', 'Date Appointed'],
  Debarment: ['Representative Name', 'Date Initiated', 'Reason', 'Investigation Summary', 'Outcome', 'FSCA Notified', 'Date Finalised'],
  Mandate: ['Mandate Type', 'Signed', 'Date Signed', 'Expiry Date', 'Linked Proposal', 'Special Instructions'],
  POPIA_Breach: ['Breach Description', 'Date Detected', 'Data Type Affected', 'Number of Clients Affected', 'Severity', 'Reported to Information Regulator', 'Client Notification Sent', 'Remediation Actions'],
  Third_Party: ['Name', 'Type', 'Agreement in Place', 'FSP Number', 'Compliance Status', 'Risk Rating', 'Last Review Date'],
  Audit: ['Audit Type', 'Audit Date', 'Auditor Name', 'Scope', 'Findings', 'Actions Required', 'Status', 'Closure Date'],
};

const yesNoFields = ['ID Verified', 'Address Verified', 'Bank Account Verified', 'Source of Funds Obtained', 'PEP Status', 'Source of Wealth Verified', 'Supporting Documents Uploaded', 'Senior Management Approval', 'Follow-up Required', 'Reported to FIC', 'Agreement in Place', 'Documents Received', 'Ongoing Monitoring Required', 'Escalated', 'Certificate Uploaded', 'Needs Analysis Completed', 'ROA Generated', 'Client Signed', 'Replacement Involved', 'Replacement Consequences Explained', 'Cost Comparison Done', 'Client Acknowledged', 'Reportable to FSCA', 'Reported to Regulator', 'Within Policy', 'FSCA Notified', 'Signed', 'Reported to Information Regulator', 'Client Notification Sent'];

const dateFieldNames = ['Date Onboarded', 'CDD Completion Date', 'Approval Date', 'Expiry Date', 'Date Detected', 'Report Date', 'Date Received', 'Screening Date', 'Training Date', 'Next Training Due Date', 'Deadline', 'Review Date', 'Date of Advice', 'Date Received', 'Resolution Deadline', 'Date Identified', 'Date Completed', 'Date Appointed', 'Date Initiated', 'Date Finalised', 'Date Signed', 'Last Review Date', 'Audit Date', 'Closure Date'];

const defaultCustomFields = (type) =>
  Object.fromEntries((REGISTER_FIELD_CONFIG[type] || []).map(field => [field, '']));

const DUPLICATE_REGISTER_FIELDS = [
  'Client Name',
  'Linked Client',
  'Client Type',
  'Advisor',
  'Advisor Name',
  'Employee Name',
  'Reported By',
  'Person Involved',
  'Assigned To',
  'Status',
];

const isDuplicateRegisterField = (field = '') => {
  const normalized = field.toLowerCase().replace(/\s+/g, ' ').trim();
  return DUPLICATE_REGISTER_FIELDS.map(item => item.toLowerCase()).includes(normalized) || normalized === 'linked client' || normalized === 'client name';
};

const visibleRegisterFields = (type) =>
  (REGISTER_FIELD_CONFIG[type] || []).filter(field => !isDuplicateRegisterField(field));

const clientTypeLabel = (client = {}) =>
  client.client_type || client.entity_type || (client.trust_name || client.trust_number ? 'Trust' : client.entity_name || client.registration_number ? 'Company' : client.full_name || client.first_name || client.last_name ? 'Natural Person' : '');

const multilineFieldNames = ['Description', 'Notes', 'Internal Notes', 'Key Findings', 'Deficiencies Identified', 'Actions Required', 'Action Required', 'Reason for Exception', 'Interim Measures Taken', 'Final Resolution', 'Transaction Description', 'Match Details', 'Action Taken', 'Risk Description', 'Products Recommended', 'Advisor Justification', 'Root Cause', 'Immediate Action', 'Remediation Plan', 'Investigation Summary', 'Special Instructions', 'Breach Description', 'Remediation Actions', 'Findings', 'Scope', 'Outcome / Feedback'];

const fieldInputType = (field) => {
  if (fieldOptions(field).length) return 'select';
  if (yesNoFields.includes(field)) return 'yesno';
  if (dateFieldNames.includes(field)) return 'date';
  if (multilineFieldNames.some(name => field.includes(name))) return 'textarea';
  return 'text';
};

function fieldOptions(field) {
  if (['Employee Name', 'Advisor Name', 'Advisor', 'Staff Member', 'CDD Completed By', 'Approved By', 'Approved By (MLCO)', 'Conducted By', 'Responsible Person', 'Risk Owner', 'Assigned To', 'Person Involved', 'Verified By', 'Cleared By', 'Reported By', 'Auditor Name'].includes(field)) return STAFF_MEMBERS;
  if (field === 'Training Type') return ['FICA', 'AML', 'RMCP', 'FAIS', 'CPD', 'Product', 'Supervision'];
  if (field === 'Pass/Fail') return ['Pass', 'Fail'];
  if (field === 'Role') return ['Advisor', 'Compliance Officer', 'Key Individual', 'Representative', 'Admin'];
  if (field === 'Client Type') return CLIENT_TYPE_OPTIONS;
  if (field === 'Verification Method') return ['VerifyNow', 'Manual document review', 'Certified copy', 'Bank confirmation', 'Other'];
  if (field === 'Verification Status') return ['Pending', 'Verified', 'Failed', 'Exception', 'Reverification required'];
  if (field === 'Trigger for EDD') return ['High risk client', 'PEP', 'Sanctions match', 'Adverse media', 'Complex structure', 'Geography risk', 'Other'];
  if (field === 'Sanctions Check Result' || field === 'Result') return ['Clear', 'Possible Match', 'Match', 'Failed'];
  if (field === 'Screening Provider') return ['VerifyNow', 'Manual', 'Other'];
  if (field === 'Suspicion Type') return ['Unusual transaction', 'Source of funds concern', 'Identity concern', 'Sanctions concern', 'Structuring', 'Other'];
  if (field === 'Review Type') return ['Annual', 'Ad Hoc', 'Trigger event', 'Regulatory update'];
  if (field === 'Completion Status') return ['Not started', 'In progress', 'Completed', 'Overdue'];
  if (field === 'Risk Category') return ['Client', 'Product', 'Geography', 'Channel', 'Transaction', 'Third party'];
  if (field === 'Risk Profile' || field === 'Risk Assessment' || field === 'Risk Rating') return RISK_OPTIONS;
  if (field === 'Type of Advice') return ['Investment', 'Risk', 'Retirement', 'Replacement', 'Estate planning', 'Other'];
  if (field === 'Replacement Reason') return ['Cost', 'Performance', 'Benefit improvement', 'Client objective change', 'Provider change', 'Advice review', 'Other'];
  if (field === 'Complaint Type') return ['Advice', 'Service', 'Product', 'Administration', 'Fees', 'Communication', 'Other'];
  if (field === 'Breach Type') return ['FAIS', 'FICA', 'POPIA', 'Internal'];
  if (field === 'Severity') return ['Low', 'Medium', 'High', 'Critical'];
  if (field === 'Conflict Type') return ['Financial interest', 'Ownership interest', 'Relationship', 'Outside business interest', 'Other'];
  if (field === 'Gift Type') return ['Gift', 'Entertainment', 'Hospitality', 'Travel', 'Other'];
  if (field === 'CPD Category') return ['Technical', 'Ethics', 'Regulatory', 'Product', 'Practice management'];
  if (field === 'Compliance Status' || field === 'Fit & Proper Status' || field === 'CPD Status') return ['Compliant', 'Non-compliant', 'Valid', 'Expired', 'Due soon', 'Under review'];
  if (field === 'Supervision Status') return ['Under supervision', 'Supervision complete', 'Not applicable'];
  if (field === 'Status') return STATUS_OPTIONS;
  if (field === 'Mandate Type') return ['Discretionary', 'Non-discretionary', 'Advice only', 'Ongoing service'];
  if (field === 'Data Type Affected') return ['Personal information', 'Special personal information', 'Financial information', 'Identity documents', 'Contact details', 'Other'];
  if (field === 'Type') return ['Introducer', 'Provider', 'Vendor', 'Outsourced service provider', 'Other'];
  if (field === 'Audit Type') return ['Internal', 'FSCA', 'External', 'Compliance monitoring', 'File review'];
  return [];
}

const fieldSummary = (customFields = {}) =>
  Object.entries(customFields)
    .filter(([, value]) => String(value || '').trim())
    .slice(0, 4)
    .map(([field, value]) => `${fieldLabel(field)}: ${value}`)
    .join('\n');

const rmcpDocumentTimestampFields = (timestamp) => timestamp ? {
  'Most Recent RMCP Document Uploaded At': timestamp,
  'Most Recent RMCP Document Updated At': timestamp,
} : {};

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
    <div className={`bg-card border p-3 ${tone}`}>
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-[10px] uppercase tracking-[.12em] text-muted-foreground font-bold mt-0.5">{label}</p>
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
    className="text-left border border-border bg-card p-3 hover:border-navy/40 hover:bg-secondary/30 transition-colors"
  >
    <div className="flex items-center justify-between gap-2">
      <div className="w-7 h-7 border border-border bg-background flex items-center justify-center text-ocean shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      {meta && <Badge className="bg-secondary text-muted-foreground border-border">{meta}</Badge>}
    </div>
    <h3 className="text-sm font-semibold text-navy mt-2">{title}</h3>
    <p className="text-xs text-muted-foreground mt-1 leading-5">{description}</p>
  </button>
);

const isClientVerificationIssue = (client = {}) => {
  const status = String(client.fica_status || client.verification_status || client.review_status || '').toLowerCase();
  const needsReview = client.advisor_review_required || status.includes('referred') || status.includes('declined') || status.includes('manual') || status.includes('awaiting') || status.includes('pending');
  return !!client.email && (needsReview || (client.onboarding_complete && client.verification_status !== 'Verified' && client.fica_status !== 'Approved'));
};

const RegisterTypeDirectory = ({ entries, setFilters, onOpenRegister }) => (
  <section className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-5">
    {REGISTER_TYPES.map(type => {
      const typeEntries = entries.filter(entry => entry.register_type === type);
      const openCount = typeEntries.filter(entry => entry.status !== 'Closed').length;
      return (
        <button
          type="button"
          key={type}
          onClick={() => {
            setFilters({ type, status: '', risk: '', advisor: '', category: '' });
            if (onOpenRegister) onOpenRegister(type);
          }}
          className="border border-border bg-card p-3 text-left hover:border-navy/40 transition-colors"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-navy">{registerTypeLabel(type)}</p>
            <Badge className={openCount ? statusClass.Open : statusClass.Closed}>{openCount} open</Badge>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">{CATEGORY_BY_REGISTER[type] || 'Internal'} register</p>
        </button>
      );
    })}
  </section>
);

const RegisterForm = ({ clients, currentUser, onCreated, requestedType, onRequestHandled }) => {
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
  const [customFields, setCustomFields] = useState(defaultCustomFields('CDD'));
  const [supportingFile, setSupportingFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedClient = clients.find(c => c.id === form.linked_client_id);
  const selectedClientType = customFields['Client Type'] || clientTypeLabel(selectedClient);

  const selectRegisterType = (type) => {
    setForm(prev => ({ ...prev, register_type: type }));
    setCustomFields(defaultCustomFields(type));
  };

  useEffect(() => {
    if (!requestedType) return;
    selectRegisterType(requestedType);
    setOpen(true);
    if (onRequestHandled) onRequestHandled();
  }, [requestedType, onRequestHandled]);

  useEffect(() => {
    const onboardingType = clientTypeLabel(selectedClient);
    setCustomFields(prev => ({ ...prev, 'Client Type': onboardingType || '' }));
  }, [form.linked_client_id, selectedClient]);

  const resetForm = (type = form.register_type) => {
    setForm({
      register_type: type,
      linked_client_id: '',
      linked_advisor: 'Trevor Fine',
      status: 'Open',
      risk_level: 'Low',
      description: '',
      action_required: '',
    });
    setCustomFields(defaultCustomFields(type));
    setSupportingFile(null);
  };

  const syncSupportingRegister = async (register, documents, savedFields) => {
    const fields = savedFields || {};
    const linkedRegisterId = register?.id;
    if (!linkedRegisterId) return;

    if (form.register_type === 'FICA_Training' || form.register_type === 'CPD') {
      const expiry = fields['Next Training Due Date'] || '';
      await base44.entities.Compliance_Training.create({
        staff_member: fields['Employee Name'] || fields['Advisor Name'] || form.linked_advisor || 'Trevor Fine',
        training_type: fields['Training Type'] || fields['CPD Category'] || form.register_type,
        date_completed: fields['Training Date'] || fields['Date Completed'] || new Date().toISOString().split('T')[0],
        expiry_date: expiry,
        certificate_upload: documents[0]?.url || '',
        status: expiry ? trainingStatus({ expiry_date: expiry }) : 'Valid',
        linked_register_id: linkedRegisterId,
      });
    }

    if (form.register_type === 'Complaint') {
      await base44.entities.Complaints_Register.create({
        client_id: form.linked_client_id,
        client_name: selectedClient ? clientDisplayName(selectedClient) : fields['Client Name'] || '',
        complaint_date: fields['Date Received'] || new Date().toISOString().split('T')[0],
        nature_of_complaint: fields['Description'] || form.description || 'Complaint captured in compliance register',
        status: form.status,
        advisor: form.linked_advisor,
        outcome: fields.Outcome || '',
        linked_register_id: linkedRegisterId,
      });
    }

    if (form.register_type === 'Product_Replacement') {
      const hasRequiredProductFields = form.linked_client_id && fields['Replaced Product'] && fields['New Product'];
      if (hasRequiredProductFields) {
        await base44.entities.Product_Replacement_Register.create({
          client_id: form.linked_client_id,
          client_name: selectedClient ? clientDisplayName(selectedClient) : fields['Client Name'] || '',
          existing_product: fields['Replaced Product'] || '',
          new_product: fields['New Product'] || '',
          reason: fields['Replacement Reason'] || form.description || 'Product replacement captured in compliance register',
          disclosure_given: fields['Replacement Consequences Explained'] === 'Yes' && fields['Client Acknowledged'] === 'Yes' ? 'Yes' : 'No',
          replacement_risk_flag: form.risk_level,
          advisor: form.linked_advisor,
          date: new Date().toISOString().split('T')[0],
          linked_register_id: linkedRegisterId,
        });
      }
    }

    if (form.register_type === 'STR') {
      if (form.linked_client_id) {
        await base44.entities.STR_Register.create({
          client_id: form.linked_client_id,
          client_name: selectedClient ? clientDisplayName(selectedClient) : fields['Linked Client'] || '',
          trigger_event: fields['Suspicion Type'] || fields['Transaction Description'] || form.description || 'Suspicious transaction captured',
          reported_to_FIC: fields['Reported to FIC'] || 'No',
          report_reference: fields['Report Reference Number'] || '',
          date_reported: fields['Report Date'] || '',
          status: form.status,
          linked_register_id: linkedRegisterId,
        });
      }
    }

    if (documents[0]?.url) {
      await base44.entities.Compliance_Documents.create({
        document_type: form.register_type === 'FICA_Training' || form.register_type === 'CPD' ? 'Training Certificate' : 'Register Evidence',
        title: documents[0].name || `${form.register_type} evidence`,
        description: `Attached from ${form.register_type} register entry.`,
        file_url: documents[0].url,
        file_name: documents[0].name || '',
        linked_register_id: linkedRegisterId,
        linked_client_id: form.linked_client_id,
        staff_member: fields['Employee Name'] || fields['Advisor Name'] || form.linked_advisor || '',
        uploaded_by: currentUser?.email || 'Compliance',
        uploaded_at: new Date().toISOString(),
        review_date: fields['Most Recent RMCP Document Updated At'] || '',
        expiry_date: fields['Next Training Due Date'] || '',
        status: 'Current',
      });
    }
  };

  const submit = async () => {
    const enteredFields = Object.fromEntries(
      Object.entries(customFields || {})
        .filter(([field, value]) => !isDuplicateRegisterField(field) && String(value || '').trim())
    );
    const savedCustomFields = selectedClientType ? { ...enteredFields, 'Client Type': selectedClientType } : enteredFields;
    const summary = fieldSummary(enteredFields);
    if (!form.description.trim() && !summary) {
      toast.error('Complete at least one register field.');
      return;
    }
    const description = form.description.trim() || summary || `${form.register_type} register entry`;
    setSubmitting(true);
    try {
      let documents = [];
      let documentTimestamp = '';
      if (supportingFile) {
        documentTimestamp = new Date().toISOString();
        const { file_url } = await base44.integrations.Core.UploadFile({ file: supportingFile });
        documents = [{ name: supportingFile.name, url: file_url, uploaded_at: documentTimestamp, updated_at: documentTimestamp, uploaded_by: currentUser?.email || 'Compliance' }];
      }
      const finalCustomFields = form.register_type === 'RMCP_Review'
        ? { ...savedCustomFields, ...rmcpDocumentTimestampFields(documentTimestamp) }
        : savedCustomFields;
      const register = await upsertComplianceRegister({
        ...form,
        description,
        action_required: form.action_required.trim() || customFields['Action Required'] || customFields['Actions Required'] || '',
        category: CATEGORY_BY_REGISTER[form.register_type] || 'Internal',
        linked_client_name: selectedClient ? clientDisplayName(selectedClient) : '',
        documents,
        custom_fields: finalCustomFields,
        source_event: `Manual ${form.register_type} register entry`,
      }, currentUser);
      try {
        await syncSupportingRegister(register, documents, finalCustomFields);
      } catch (supportingError) {
        console.error('Supporting register sync failed', supportingError);
        toast.warning('Register saved. A supporting register or document sync needs review.');
      }
      toast.success(`${form.register_type} register entry created.`);
      setOpen(false);
      resetForm(form.register_type);
      onCreated();
    } catch (error) {
      console.error('Compliance register create failed', error);
      toast.error(error?.message || 'Could not create the register entry.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <button type="button" onClick={() => { resetForm('CDD'); setOpen(true); }} className="inline-flex items-center gap-2 bg-navy text-white px-4 py-2 text-xs font-bold uppercase tracking-[.08em]">
        <Plus className="w-4 h-4" />
        New Entry
      </button>
    );
  }

  return (
    <div className="border border-border bg-card p-4 mb-4">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-[.16em] text-muted-foreground font-bold">New register entry</p>
          <h3 className="text-lg font-semibold text-navy">{registerTypeLabel(form.register_type)}</h3>
        </div>
        <Badge className="bg-secondary text-muted-foreground border-border">{CATEGORY_BY_REGISTER[form.register_type] || 'Internal'}</Badge>
      </div>
      <div className="grid md:grid-cols-3 gap-3">
        <label className="text-xs font-semibold text-navy block">
          Register Type
          <Select value={form.register_type} onValueChange={v => selectRegisterType(v)}>
            <SelectTrigger className="mt-1 h-9 text-sm w-full"><SelectValue /></SelectTrigger>
            <SelectContent>{REGISTER_TYPES.map(type => <SelectItem key={type} value={type}>{registerTypeLabel(type)}</SelectItem>)}</SelectContent>
          </Select>
        </label>
        <label className="text-xs font-semibold text-navy block">
          Client
          <Select value={form.linked_client_id || '__none__'} onValueChange={v => setForm({ ...form, linked_client_id: v === '__none__' ? '' : v })}>
            <SelectTrigger className="mt-1 h-9 text-sm w-full"><SelectValue placeholder="No linked client" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">No linked client</SelectItem>
              {clients.map(client => <SelectItem key={client.id} value={client.id}>{clientDisplayName(client)}</SelectItem>)}
            </SelectContent>
          </Select>
        </label>
        <label className="text-xs font-semibold text-navy block">
          Client Type
          <Select value={selectedClientType || '__none__'} onValueChange={v => setCustomFields({ ...customFields, 'Client Type': v === '__none__' ? '' : v })}>
            <SelectTrigger className="mt-1 h-9 text-sm w-full"><SelectValue placeholder={selectedClient ? 'Select client type' : 'Select a client first'} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">{selectedClient ? 'Select client type' : 'Select a client first'}</SelectItem>
              {CLIENT_TYPE_OPTIONS.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
            </SelectContent>
          </Select>
        </label>
        <label className="text-xs font-semibold text-navy block">
          Staff Member
          <Select value={form.linked_advisor} onValueChange={v => setForm({ ...form, linked_advisor: v })}>
            <SelectTrigger className="mt-1 h-9 text-sm w-full"><SelectValue /></SelectTrigger>
            <SelectContent>{STAFF_MEMBERS.map(staff => <SelectItem key={staff} value={staff}>{staff}</SelectItem>)}</SelectContent>
          </Select>
        </label>
        <label className="text-xs font-semibold text-navy block">
          Status
          <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
            <SelectTrigger className="mt-1 h-9 text-sm w-full"><SelectValue /></SelectTrigger>
            <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </label>
        <label className="text-xs font-semibold text-navy block">
          Risk
          <Select value={form.risk_level} onValueChange={v => setForm({ ...form, risk_level: v })}>
            <SelectTrigger className="mt-1 h-9 text-sm w-full"><SelectValue /></SelectTrigger>
            <SelectContent>{RISK_OPTIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
          </Select>
        </label>
      </div>
      <div className="grid md:grid-cols-2 gap-3 mt-4">
        {visibleRegisterFields(form.register_type).map(field => {
          const type = fieldInputType(field);
          const options = fieldOptions(field);
          return (
            <label key={field} className={`text-xs font-semibold text-navy ${type === 'textarea' ? 'md:col-span-2' : ''}`}>
              {fieldLabel(field)}
              {type === 'select' ? (
                <Select value={customFields[field] || '__none__'} onValueChange={v => setCustomFields({ ...customFields, [field]: v === '__none__' ? '' : v })}>
                  <SelectTrigger className="mt-1 h-9 text-sm w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Select</SelectItem>
                    {options.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : type === 'yesno' ? (
                <Select value={customFields[field] || '__none__'} onValueChange={v => setCustomFields({ ...customFields, [field]: v === '__none__' ? '' : v })}>
                  <SelectTrigger className="mt-1 h-9 text-sm w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Select</SelectItem>
                    <SelectItem value="Yes">Yes</SelectItem>
                    <SelectItem value="No">No</SelectItem>
                  </SelectContent>
                </Select>
              ) : type === 'textarea' ? (
                <textarea className="mt-1 w-full border border-border bg-background px-3 py-2 text-sm min-h-20" value={customFields[field] || ''} onChange={e => setCustomFields({ ...customFields, [field]: e.target.value })} />
              ) : (
                <input type={type} className="mt-1 w-full border border-border bg-background px-3 py-2 text-sm" value={customFields[field] || ''} onChange={e => setCustomFields({ ...customFields, [field]: e.target.value })} />
              )}
            </label>
          );
        })}
      </div>
      <div className="grid md:grid-cols-3 gap-3 mt-4">
        <label className="text-xs font-semibold text-navy md:col-span-3">
          General Description
          <textarea className="mt-1 w-full border border-border bg-background px-3 py-2 text-sm min-h-20" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        </label>
        <label className="text-xs font-semibold text-navy md:col-span-3">
          Action Required
          <textarea className="mt-1 w-full border border-border bg-background px-3 py-2 text-sm min-h-16" value={form.action_required} onChange={e => setForm({ ...form, action_required: e.target.value })} />
        </label>
        <label className="text-xs font-semibold text-navy md:col-span-3">
          Supporting Document
          <input type="file" className="mt-1 w-full border border-border bg-background px-3 py-2 text-sm" onChange={e => setSupportingFile(e.target.files?.[0] || null)} />
          {form.register_type === 'RMCP_Review' && supportingFile && (
            <span className="block mt-1 text-[11px] text-muted-foreground">
              The RMCP Review will stamp this upload and latest document update time automatically when created.
            </span>
          )}
        </label>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button type="button" onClick={() => setOpen(false)} className="border border-border px-4 py-2 text-xs font-semibold text-navy">Cancel</button>
        <button type="button" onClick={submit} disabled={submitting} className="bg-navy text-white px-4 py-2 text-xs font-bold disabled:opacity-60">{submitting ? 'Creating...' : 'Create'}</button>
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
  const customFieldRows = Object.entries(entry.custom_fields || {}).filter(([, value]) => String(value || '').trim());

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
            <p className="text-[10px] uppercase tracking-[.16em] text-muted-foreground font-bold">{registerTypeLabel(entry.register_type)}</p>
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
          {customFieldRows.length > 0 && (
            <section>
              <h4 className="text-xs uppercase tracking-[.12em] text-muted-foreground font-bold mb-2">Register Fields</h4>
              <div className="border border-border divide-y divide-border">
                {customFieldRows.map(([field, value]) => (
                  <div key={field} className="grid grid-cols-[160px_1fr] gap-3 p-3 text-sm">
                    <p className="text-muted-foreground">{fieldLabel(field)}</p>
                    <p className="text-navy whitespace-pre-wrap">{String(value)}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
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
          <label className="text-xs font-semibold text-navy block">
            Type
            <Select value={filters.type || '__all__'} onValueChange={v => setFilters({ ...filters, type: v === '__all__' ? '' : v })}>
              <SelectTrigger className="mt-1 h-8 text-xs w-full"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All</SelectItem>
                {REGISTER_TYPES.map(type => <SelectItem key={type} value={type}>{registerTypeLabel(type)}</SelectItem>)}
              </SelectContent>
            </Select>
          </label>
          <label className="text-xs font-semibold text-navy block">
            Status
            <Select value={filters.status || '__all__'} onValueChange={v => setFilters({ ...filters, status: v === '__all__' ? '' : v })}>
              <SelectTrigger className="mt-1 h-8 text-xs w-full"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All</SelectItem>
                {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </label>
          <label className="text-xs font-semibold text-navy block">
            Risk
            <Select value={filters.risk || '__all__'} onValueChange={v => setFilters({ ...filters, risk: v === '__all__' ? '' : v })}>
              <SelectTrigger className="mt-1 h-8 text-xs w-full"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All</SelectItem>
                {RISK_OPTIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </label>
          <label className="text-xs font-semibold text-navy block">
            Advisor
            <Select value={filters.advisor || '__all__'} onValueChange={v => setFilters({ ...filters, advisor: v === '__all__' ? '' : v })}>
              <SelectTrigger className="mt-1 h-8 text-xs w-full"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All</SelectItem>
                {Object.values(ADVISORS).map(a => <SelectItem key={a.email} value={a.name}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
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
                <td className="p-3 font-semibold text-navy">{registerTypeLabel(entry.register_type)}</td>
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
  const [registerFormType, setRegisterFormType] = useState('');
  const [clientId, setClientId] = useState('');

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: entries = [], isLoading: registersLoading } = useQuery({
    queryKey: ['compliance-registers'],
    queryFn: () => safeEntityList(base44.entities.Compliance_Registers, '-created_date', 500),
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
    queryFn: () => safeEntityList(base44.entities.Compliance_Documents, '-created_date', 300),
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
          <div className="space-y-4">
            <section className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
              <PortalTile
                icon={FileText}
                title="Compliance Registers"
                description="FICA, FAIS, POPIA and internal registers."
                meta={`${entries.length} entries`}
                onClick={() => setActiveTab('registers')}
              />
              <PortalTile
                icon={ShieldCheck}
                title="Client Verification"
                description="Review and reverify clients with unsuccessful FICA or document checks."
                meta={`${verificationClients.length} to review`}
                onClick={() => setActiveTab('verification')}
              />
              <PortalTile
                icon={Upload}
                title="Document Repository"
                description="RMCP, training certificates, policies and audit evidence."
                meta={`${documents.length} docs`}
                onClick={() => setActiveTab('documents')}
              />
              <PortalTile
                icon={Download}
                title="Audit Report"
                description="Export all registers, documents and training records for FSCA inspection."
                meta="FSCA pack"
                onClick={() => setActiveTab('audit')}
              />
            </section>

            <div className="grid md:grid-cols-4 gap-3">
              <KpiCard label="Outstanding FICA" value={metrics.outstandingFica} critical={metrics.outstandingFica > 5} />
              <KpiCard label="High Risk Clients" value={metrics.highRiskClients} critical={metrics.highRiskClients > 0} />
              <KpiCard label="Open Complaints" value={metrics.openComplaints} critical={metrics.openComplaints > 0} />
              <KpiCard label="Breaches" value={metrics.breaches} critical={metrics.breaches > 0} />
            </div>
            <div className="grid lg:grid-cols-2 gap-4">
              <section className="border border-border bg-card">
                <div className="p-3 border-b border-border"><h3 className="text-sm font-semibold text-navy">Immediate Actions</h3></div>
                <div className="divide-y divide-border">
                  {immediate.map(entry => (
                    <div key={entry.id} className="p-3 grid grid-cols-[1fr_1fr_70px_90px] gap-3 items-center text-sm">
                      <div><p className="font-semibold text-navy">{registerTypeLabel(entry.register_type)}</p><p className="text-xs text-muted-foreground">{entry.description}</p></div>
                      <p>{entry.linked_client_name || '-'}</p>
                      <p className="text-red-700 font-semibold">{daysOpen(entry)} days</p>
                      <Badge className={statusClass[entry.status] || statusClass.Open}>{entry.status}</Badge>
                    </div>
                  ))}
                  {immediate.length === 0 && <p className="p-3 text-sm text-muted-foreground">No immediate compliance actions.</p>}
                </div>
              </section>
              <section className="border border-border bg-card">
                <div className="p-3 border-b border-border"><h3 className="text-sm font-semibold text-navy">Recent Activity</h3></div>
                <div className="divide-y divide-border">
                  {recent.map(entry => (
                    <div key={entry.id} className="p-3 grid grid-cols-[90px_1fr_1fr_90px] gap-3 items-center text-sm">
                      <p className="text-muted-foreground">{dateFmt(entry.created_date)}</p>
                      <p className="font-semibold text-navy">{registerTypeLabel(entry.register_type)}</p>
                      <p>{entry.linked_advisor || '-'}</p>
                      <Badge className={statusClass[entry.status] || statusClass.Open}>{entry.status}</Badge>
                    </div>
                  ))}
                </div>
              </section>
            </div>
            <section className="border border-border bg-card p-3">
              <h3 className="text-sm font-semibold text-navy mb-3">Compliance Health</h3>
              <div className="grid md:grid-cols-4 gap-4">
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
              <RegisterForm
                clients={clients}
                currentUser={currentUser}
                onCreated={refresh}
                requestedType={registerFormType}
                onRequestHandled={() => setRegisterFormType('')}
              />
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
            <RegisterTypeDirectory entries={entries} setFilters={setFilters} onOpenRegister={setRegisterFormType} />
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
              <label className="text-xs font-semibold text-navy block">
                Select Client
                <Select value={selectedClient?.id || ''} onValueChange={v => setClientId(v)}>
                  <SelectTrigger className="mt-1 h-9 text-sm w-full max-w-md"><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{clientDisplayName(c)}</SelectItem>)}</SelectContent>
                </Select>
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
      const timestamp = new Date().toISOString();
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.Compliance_Documents.create({
        ...form,
        file_url,
        file_name: file.name,
        uploaded_by: currentUser?.email || currentUser?.full_name || 'Compliance',
        uploaded_at: timestamp,
        review_date: form.document_type === 'RMCP' ? timestamp : form.expiry_date,
        status: 'Current',
      });
      const linkedRegister = entries.find(entry => entry.id === form.linked_register_id);
      if (form.document_type === 'RMCP' && linkedRegister?.register_type === 'RMCP_Review') {
        const existingDocuments = Array.isArray(linkedRegister.documents) ? linkedRegister.documents : [];
        await updateComplianceRegister(linkedRegister, {
          documents: [
            ...existingDocuments,
            { name: file.name, url: file_url, uploaded_at: timestamp, updated_at: timestamp, uploaded_by: currentUser?.email || currentUser?.full_name || 'Compliance' },
          ],
          custom_fields: {
            ...(linkedRegister.custom_fields || {}),
            ...rmcpDocumentTimestampFields(timestamp),
          },
          audit_action: 'RMCP document uploaded',
        }, currentUser, file.name);
      }
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
        <label className="text-xs font-semibold text-navy block">
          Type
          <Select value={form.document_type} onValueChange={v => setForm({ ...form, document_type: v })}>
            <SelectTrigger className="mt-1 h-9 text-sm w-full"><SelectValue /></SelectTrigger>
            <SelectContent>{['RMCP','Training Certificate','Policy','Audit Evidence','Register Evidence','Letter of Authority','Other'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </label>
        <label className="text-xs font-semibold text-navy">
          Title
          <input className="mt-1 w-full border border-border bg-background px-3 py-2" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
        </label>
        <label className="text-xs font-semibold text-navy block">
          Link Register
          <Select value={form.linked_register_id || '__none__'} onValueChange={v => setForm({ ...form, linked_register_id: v === '__none__' ? '' : v })}>
            <SelectTrigger className="mt-1 h-9 text-sm w-full"><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {entries.map(e => <SelectItem key={e.id} value={e.id}>{e.register_type} - {e.linked_client_name || e.description}</SelectItem>)}
            </SelectContent>
          </Select>
        </label>
        <label className="text-xs font-semibold text-navy block">
          Link Client
          <Select value={form.linked_client_id || '__none__'} onValueChange={v => setForm({ ...form, linked_client_id: v === '__none__' ? '' : v })}>
            <SelectTrigger className="mt-1 h-9 text-sm w-full"><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {clients.map(c => <SelectItem key={c.id} value={c.id}>{clientDisplayName(c)}</SelectItem>)}
            </SelectContent>
          </Select>
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
              {tab === 'All' ? 'All' : registerTypeLabel(tab)}
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
  const [form, setForm] = useState({ staff_member: '', training_type: 'FICA', date_completed: '', expiry_date: '' });

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
          <Select value={form.staff_member || '__none__'} onValueChange={v => setForm({ ...form, staff_member: v === '__none__' ? '' : v })}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Staff member" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Staff member</SelectItem>
              {STAFF_MEMBERS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={form.training_type} onValueChange={v => setForm({ ...form, training_type: v })}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>{fieldOptions('Training Type').map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
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