import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtDateTime as formatDateTime } from '@/lib/constants';

const STATUS_CLASSES = {
  Pending:    { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border' },
  Submitted:  { bg: 'bg-blue-50 dark:bg-blue-950', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
  Verified:   { bg: 'bg-green-50 dark:bg-green-950', text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-800' },
  Incomplete: { bg: 'bg-red-50 dark:bg-red-950', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800' },
  Complete:   { bg: 'bg-green-50 dark:bg-green-950', text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-800' },
};

const TAG_CLASSES = {
  SIGNED:       'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
  'PROPOSAL PDF': 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  'QUOTE PDF':  'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  'APP FORM':   'bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  'SUPPORT DOC':'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
};

const DEFAULT_DOCUMENT_INDEX = [
  { key: 'doc_identity', index: '01', label: 'Identity Document', description: 'SA ID / Smart Card / Passport — front & back', required: true, backKey: 'doc_identity_back', backLabel: 'SA ID Back' },
  { key: 'doc_proof_of_address', index: '02', label: 'Proof of Address', description: 'Utility bill or bank statement showing name and address', required: true },
  { key: 'doc_source_of_funds', index: '03', label: 'Income / Source of Funds', description: '3 months payslips or 6 months bank statements', required: true },
  { key: 'doc_existing_policies', index: '04', label: 'Existing Policies', description: 'Current policy documents or statements', required: false },
  { key: 'doc_banking_proof', index: '05', label: 'Proof of Banking Details', description: 'Bank-stamped letter or 3 months bank statements', required: false },
];

const getDocumentIndex = (clientType) => {
  if (clientType === 'Company') return [
    { key: 'doc_identity', index: '01', label: 'CIPC Registration Certificate', description: 'CoR14.3 / CoR15.1A or equivalent', required: true },
    { key: 'doc_proof_of_address', index: '02', label: 'Proof of Registered Address', description: 'Utility bill or bank statement showing registered address', required: true },
    { key: 'doc_source_of_funds', index: '03', label: 'Financial Statements', description: 'Most recent audited or management accounts', required: true },
    { key: 'doc_existing_policies', index: '04', label: 'MOI / Memorandum of Incorporation', description: 'Certified copy of current MOI', required: false },
  ];
  if (clientType === 'Trust') return [
    { key: 'doc_identity', index: '01', label: 'Trust Deed', description: 'Certified copy of the trust deed', required: true },
    { key: 'doc_proof_of_address', index: '02', label: 'Proof of Registered Address', description: 'Utility bill or bank statement showing registered address', required: true },
    { key: 'doc_source_of_funds', index: '03', label: 'Trust Bank Statement', description: 'Most recent 3 months bank statements', required: true },
    { key: 'doc_existing_policies', index: '04', label: 'Letter of Authority', description: 'Master of the High Court letter', required: false },
  ];
  return DEFAULT_DOCUMENT_INDEX;
};

const parseDocumentJson = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try { const p = JSON.parse(value); return Array.isArray(p) ? p : []; } catch { return []; }
};

const TagBadge = ({ tag }) => (
  <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide border ${TAG_CLASSES[tag] || 'bg-muted text-muted-foreground border-border'}`}>
    {tag}
  </span>
);

const StatusBadge = ({ uploaded }) => uploaded
  ? <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">Uploaded</span>
  : <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">Missing</span>;

const ViewBtn = ({ url, label = 'View / Download' }) => (
  <button onClick={() => window.open(url, '_blank')}
    className="bg-navy text-white text-[11px] font-bold tracking-wide px-3 py-1.5 hover:bg-ocean transition-colors whitespace-nowrap">
    {label}
  </button>
);

const SectionHeader = ({ children }) => (
  <tr>
    <td colSpan={5} className="px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground bg-muted border-t-2 border-b border-border">
      {children}
    </td>
  </tr>
);

export default function ClientDocumentRepository({ client, proposals = [], attachments = [], investments = [], onStatusUpdate }) {
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const documentIndex = getDocumentIndex(client?.client_type);

  const ficaComplete = !!(client?.doc_identity && client?.doc_proof_of_address && client?.doc_source_of_funds);
  const displayStatus = ficaComplete ? 'Complete' : (client?.doc_status || 'Pending');
  const statusStyle = STATUS_CLASSES[displayStatus] || STATUS_CLASSES.Pending;

  useEffect(() => {
    if (!client?.id) return;
    if (ficaComplete && client.doc_status !== 'Complete') {
      base44.entities.Clients.update(client.id, { doc_status: 'Complete' })
        .then(() => { if (onStatusUpdate) onStatusUpdate(); })
        .catch(() => {});
    }
  }, [ficaComplete, client?.id, client?.doc_status]);

  const handleStatusChange = async (newStatus) => {
    setUpdatingStatus(true);
    try {
      await base44.entities.Clients.update(client.id, { doc_status: newStatus });
      if (onStatusUpdate) onStatusUpdate();
    } catch (err) { console.error(err); }
    setUpdatingStatus(false);
  };

  // Proposal rows
  const proposalRows = [];
  proposals.forEach((proposal, i) => {
    const base = 5 + (i * 2);
    if (proposal.pdf_generated_at || proposal.proposal_pdf_url) {
      proposalRows.push({ index: String(base).padStart(2,'0'), label: `Proposal — ${proposal.reference || 'Draft'}`, description: `Generated: ${formatDateTime(proposal.pdf_generated_at)}`, fileUrl: proposal.proposal_pdf_url || null, statusOverride: proposal.proposal_pdf_url ? 'uploaded' : 'missing', tag: 'PROPOSAL PDF' });
    }
    if (proposal.signed_pdf_url || proposal.status === 'Signed') {
      proposalRows.push({ index: String(base+1).padStart(2,'0'), label: `Signed — ${proposal.reference || 'Draft'}`, description: `Signed: ${formatDateTime(proposal.signed_at)}`, fileUrl: proposal.signed_pdf_url || null, statusOverride: proposal.signed_pdf_url ? 'uploaded' : 'missing', tag: 'SIGNED' });
    }
  });

  // Investment attachment rows
  const attachmentTypes = [
    { suffix: 'Quote', tag: 'QUOTE PDF' },
    { suffix: 'Application Form', tag: 'APP FORM' },
    { suffix: 'Supporting Doc', tag: 'SUPPORT DOC' },
  ];
  const invDocs = [];
  investments.forEach(inv => {
    const invLabel = [inv.provider, inv.product_type].filter(Boolean).join(' — ') || 'Investment';
    attachmentTypes.forEach(({ suffix, tag }) => {
      const att = attachments.find(a => a.attachment_type === `${suffix}::${inv.id}`);
      if (att?.file_url) invDocs.push({ label: invLabel, tag, url: att.file_url });
    });
  });

  // Person docs
  const personsList = Array.isArray(client?.directors_list) ? client.directors_list : Array.isArray(client?.trustees_list) ? client.trustees_list : [];
  const personLabel = client?.client_type === 'Trust' ? 'Trustee' : 'Director';
  const indexedPersonDocs = client?.client_type === 'Trust' ? parseDocumentJson(client?.trustee_documents_json) : parseDocumentJson(client?.director_documents_json);
  const personDocSources = indexedPersonDocs.length > 0 ? indexedPersonDocs : personsList;
  const personDocs = [];
  personDocSources.forEach((person, personIndex) => {
    const sourceIndex = person.trustee_index ?? person.director_index ?? personIndex;
    const listPerson = personsList[sourceIndex] || {};
    const fullName = person.name || [person.first_name || listPerson.first_name, person.last_name || listPerson.last_name].filter(Boolean).join(' ') || `${personLabel} ${sourceIndex+1}`;
    const tag = `${personLabel.toUpperCase()} DOC`;
    if (person.id_file_url && !person.id_front_file_url) personDocs.push({ label: `${personLabel} ${sourceIndex+1} ID / Passport - ${fullName}`, description: person.id_file_name || 'Certified identity document', fileUrl: person.id_file_url, tag });
    if (person.id_front_file_url) personDocs.push({ label: `${personLabel} ${sourceIndex+1} SA ID Front - ${fullName}`, description: person.id_front_file_name || 'Identity document front', fileUrl: person.id_front_file_url, tag });
    if (person.id_back_file_url) personDocs.push({ label: `${personLabel} ${sourceIndex+1} SA ID Back - ${fullName}`, description: person.id_back_file_name || 'Identity document back', fileUrl: person.id_back_file_url, tag });
    if (person.addr_file_url) personDocs.push({ label: `${personLabel} ${sourceIndex+1} Proof of Address - ${fullName}`, description: person.addr_file_name || 'Residential address document', fileUrl: person.addr_file_url, tag });
  });

  const ficaUploaded = documentIndex.filter(d => !!client?.[d.key]).length;
  const proposalUploaded = proposalRows.filter(d => d.statusOverride === 'uploaded').length;
  const totalRows = documentIndex.length + personDocs.length + proposalRows.length + invDocs.length;
  const totalUploaded = ficaUploaded + personDocs.length + proposalUploaded + invDocs.length;
  const requiredCount = documentIndex.filter(d => d.required).length;
  const requiredUploaded = documentIndex.filter(d => d.required && !!client?.[d.key]).length;

  return (
    <div className="bg-card border border-border rounded-xl p-5 mt-6 w-full overflow-x-auto shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-3 mb-5 pb-4 border-b border-border">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-navy">FICA Document Repository</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {totalUploaded} of {totalRows} documents uploaded · {requiredUploaded} of {requiredCount} required
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wide rounded-full border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
            {displayStatus}
          </span>
          <Select value={displayStatus} onValueChange={handleStatusChange} disabled={updatingStatus}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {['Complete','Pending','Submitted','Verified','Incomplete'].map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Submission banner */}
      {client?.doc_submitted_at ? (
        <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded px-3.5 py-2.5 mb-5 text-[11px] text-green-700 dark:text-green-300">
          ✓ Documents submitted by client on {formatDateTime(client.doc_submitted_at)}
        </div>
      ) : (
        <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded px-3.5 py-2.5 mb-5 text-[11px] text-amber-700 dark:text-amber-300">
          ⏳ Client has not yet submitted documents via onboarding.
        </div>
      )}

      {/* Table */}
      <table className="w-full text-sm border-collapse" style={{ minWidth: 700 }}>
        <colgroup>
          <col style={{ width: 40 }} />
          <col />
          <col style={{ width: 90 }} />
          <col style={{ width: 110 }} />
          <col style={{ width: 170 }} />
        </colgroup>
        <thead>
          <tr className="border-b-2 border-border">
            {['#','Document','Required','Status','Action'].map((h, i) => (
              <th key={h} className={`px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground ${i === 4 ? 'text-right' : 'text-left'}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* FICA rows */}
          {documentIndex.map((doc, i) => {
            const fileUrl = client?.[doc.key];
            const backUrl = doc.backKey ? client?.[doc.backKey] : null;
            const uploaded = !!fileUrl;
            return (
              <tr key={doc.key} className={`border-b border-border ${i % 2 === 0 ? 'bg-card' : 'bg-muted/30'}`}>
                <td className="px-3 py-3.5 text-[11px] font-bold text-muted-foreground">{doc.index}</td>
                <td className="px-3 py-3.5">
                  <p className="font-semibold text-navy text-[13px] mb-0.5">{doc.label}</p>
                  {client?.[`${doc.key}_name`] && <p className="text-[11px] text-ocean font-semibold mb-0.5">Front: {client[`${doc.key}_name`]}</p>}
                  {doc.backKey && client?.[`${doc.backKey}_name`] && <p className="text-[11px] text-ocean font-semibold mb-0.5">Back: {client[`${doc.backKey}_name`]}</p>}
                  <p className="text-[11px] text-muted-foreground">{doc.description}</p>
                </td>
                <td className="px-3 py-3.5">
                  <span className={`text-[11px] font-semibold ${doc.required ? 'text-red-700 dark:text-red-400' : 'text-muted-foreground'}`}>
                    {doc.required ? 'Required' : 'Optional'}
                  </span>
                </td>
                <td className="px-3 py-3.5 whitespace-nowrap"><StatusBadge uploaded={uploaded} /></td>
                <td className="px-3 py-3.5 text-right whitespace-nowrap">
                  {uploaded ? (
                    <div className="flex gap-1.5 justify-end flex-wrap">
                      <ViewBtn url={fileUrl} label={backUrl ? 'View Front' : 'View / Download'} />
                      {backUrl && <ViewBtn url={backUrl} label="View Back" />}
                    </div>
                  ) : <span className="text-[11px] text-muted-foreground">Not uploaded</span>}
                </td>
              </tr>
            );
          })}

          {/* Person docs */}
          {personDocs.length > 0 && (
            <>
              <SectionHeader>{client?.client_type === 'Trust' ? 'Trustee Documents' : 'Director Documents'}</SectionHeader>
              {personDocs.map((doc, i) => (
                <tr key={`pd-${i}`} className={`border-b border-border ${i % 2 === 0 ? 'bg-card' : 'bg-muted/30'}`}>
                  <td className="px-3 py-3.5 text-[11px] font-bold text-muted-foreground">{String(documentIndex.length + i + 1).padStart(2,'0')}</td>
                  <td className="px-3 py-3.5">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="font-semibold text-navy text-[13px] m-0">{doc.label}</p>
                      <TagBadge tag={doc.tag} />
                    </div>
                    <p className="text-[11px] text-muted-foreground">{doc.description}</p>
                  </td>
                  <td className="px-3 py-3.5"><span className="text-[11px] font-semibold text-red-700 dark:text-red-400">Required</span></td>
                  <td className="px-3 py-3.5"><StatusBadge uploaded={true} /></td>
                  <td className="px-3 py-3.5 text-right"><ViewBtn url={doc.fileUrl} /></td>
                </tr>
              ))}
            </>
          )}

          {/* Proposal docs */}
          {proposalRows.length > 0 && (
            <>
              <SectionHeader>Proposal Documents</SectionHeader>
              {proposalRows.map((doc, i) => (
                <tr key={`pr-${i}`} className={`border-b border-border ${i % 2 === 0 ? 'bg-card' : 'bg-muted/30'}`}>
                  <td className="px-3 py-3.5 text-[11px] font-bold text-muted-foreground">{String(documentIndex.length + personDocs.length + i + 1).padStart(2,'0')}</td>
                  <td className="px-3 py-3.5">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="font-semibold text-navy text-[13px] m-0 whitespace-nowrap">{doc.label}</p>
                      <TagBadge tag={doc.tag} />
                    </div>
                    <p className="text-[11px] text-muted-foreground">{doc.description}</p>
                  </td>
                  <td className="px-3 py-3.5"><span className="text-[11px] text-muted-foreground">Optional</span></td>
                  <td className="px-3 py-3.5"><StatusBadge uploaded={doc.statusOverride === 'uploaded'} /></td>
                  <td className="px-3 py-3.5 text-right">
                    {doc.fileUrl ? <ViewBtn url={doc.fileUrl} /> : <span className="text-[11px] text-muted-foreground">Not available</span>}
                  </td>
                </tr>
              ))}
            </>
          )}

          {/* Investment docs */}
          {invDocs.length > 0 && (
            <>
              <SectionHeader>Investment Documents</SectionHeader>
              {invDocs.map((doc, i) => (
                <tr key={`id-${i}`} className={`border-b border-border ${i % 2 === 0 ? 'bg-card' : 'bg-muted/30'}`}>
                  <td className="px-3 py-3.5 text-[11px] font-bold text-muted-foreground">{String(documentIndex.length + personDocs.length + proposalRows.length + i + 1).padStart(2,'0')}</td>
                  <td className="px-3 py-3.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-navy text-[13px] m-0 whitespace-nowrap">{doc.label}</p>
                      <TagBadge tag={doc.tag} />
                    </div>
                  </td>
                  <td className="px-3 py-3.5"><span className="text-[11px] text-muted-foreground">Optional</span></td>
                  <td className="px-3 py-3.5"><StatusBadge uploaded={true} /></td>
                  <td className="px-3 py-3.5 text-right"><ViewBtn url={doc.url} /></td>
                </tr>
              ))}
            </>
          )}
        </tbody>
      </table>

      {/* Footer note */}
      <div className="mt-5 px-4 py-3 bg-muted border border-border rounded text-[11px] text-muted-foreground leading-relaxed">
        <strong className="text-foreground">Certification requirement:</strong>{' '}
        All copies must be certified by a Commissioner of Oaths, attorney, bank official, or notary.
        Documents are stored encrypted in compliance with FICA and POPIA obligations.
      </div>
    </div>
  );
}