import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DatePickerField from '@/components/ui/date-picker-field';

const PROVINCES = ['Western Cape','Gauteng','KwaZulu-Natal','Eastern Cape','Limpopo','Mpumalanga','North West','Free State','Northern Cape'];
const COUNTRIES = ['South Africa','Zimbabwe','Mozambique','Botswana','Namibia','Zambia','Malawi','United Kingdom','United States','Australia','Other'];

// Extract DOB from 13-digit SA ID: YYMMDD
function dobFromSAID(id) {
  if (!id || id.length < 6) return '';
  const yy = id.substring(0, 2);
  const mm = id.substring(2, 4);
  const dd = id.substring(4, 6);
  const year = parseInt(yy) <= new Date().getFullYear() % 100 ? `20${yy}` : `19${yy}`;
  // Store as dd-mm-yyyy string
  if (mm < '01' || mm > '12' || dd < '01' || dd > '31') return '';
  return `${dd}-${mm}-${year}`;
}

function F({ label, children }) {
  return (
    <div>
      <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

export default function PersonCard({ person, idx, role, onUpdate, onRemove, canRemove }) {
  const update = (field, value) => onUpdate(idx, field, value);

  const handleIdNumber = (val) => {
    update('id_number', val);
    if (person.identity_type !== 'Passport' && val.length >= 6) {
      const dob = dobFromSAID(val);
      if (dob) update('date_of_birth', dob);
    }
  };

  return (
    <div className="border border-border bg-card rounded p-3 w-full">
      {/* Card header */}
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[11px] font-bold text-navy uppercase tracking-wider">{role} {idx + 1}</span>
        {canRemove && (
          <button type="button" onClick={() => onRemove(idx)} className="text-xs font-medium text-red-500 hover:text-red-700 transition-colors px-2 py-0.5 border border-red-200 rounded hover:bg-red-50">
            Delete
          </button>
        )}
      </div>

      <div className="space-y-2">
        {/* Row 1: Title | First Name | Surname */}
        <div className="grid grid-cols-[100px_1fr_1fr] gap-2">
          <F label="Title">
            <Select value={person.title || ''} onValueChange={v => update('title', v)}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Title" /></SelectTrigger>
              <SelectContent>{['Mr','Mrs','Ms','Dr','Prof'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </F>
          <F label="First Name(s) *">
            <Input className="h-8 text-sm" placeholder="As per ID" value={person.first_name || ''} onChange={e => update('first_name', e.target.value)} />
          </F>
          <F label="Surname *">
            <Input className="h-8 text-sm" value={person.last_name || ''} onChange={e => update('last_name', e.target.value)} />
          </F>
        </div>

        {/* Row 2: Identity type toggle + conditional fields */}
        <div>
          <Label className="text-[10px] font-semibold tracking-wider text-navy uppercase block mb-1">Identity Type</Label>
          <div className="flex gap-2 mb-2">
            {['SA ID', 'Passport'].map(opt => (
              <button key={opt} type="button"
                onClick={() => update('identity_type', opt)}
                className={`px-3 py-1 text-xs font-medium border rounded transition-all ${(person.identity_type || 'SA ID') === opt ? 'bg-navy text-white border-navy' : 'bg-card text-navy border-border hover:border-navy'}`}>
                {opt === 'SA ID' ? 'SA ID Number' : 'Passport Number'}
              </button>
            ))}
          </div>

          {(person.identity_type || 'SA ID') === 'SA ID' ? (
            <div className="grid grid-cols-2 gap-2">
              <F label="SA ID Number *">
                <Input className="h-8 text-sm font-mono" maxLength="13" placeholder="13-digit number" value={person.id_number || ''} onChange={e => handleIdNumber(e.target.value)} />
              </F>
              <F label="Date of Birth (dd-mm-yyyy)">
                <DatePickerField value={person.date_of_birth || ''} onChange={v => update('date_of_birth', v)} outputFormat="dd-MM-yyyy" />
              </F>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <F label="Passport Number *">
                <Input className="h-8 text-sm" placeholder="Passport number" value={person.id_number || ''} onChange={e => update('id_number', e.target.value)} />
              </F>
              <F label="Country of Issue">
                <Select value={person.passport_country || ''} onValueChange={v => update('passport_country', v)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </F>
              <F label="Date of Birth (dd-mm-yyyy)">
                <DatePickerField value={person.date_of_birth || ''} onChange={v => update('date_of_birth', v)} outputFormat="dd-MM-yyyy" />
              </F>
            </div>
          )}
        </div>

        {/* Row 3: Gender | Marital Status | Nationality */}
        <div className="grid grid-cols-3 gap-2">
          <F label="Gender">
            <Select value={person.gender || ''} onValueChange={v => update('gender', v)}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{['Male','Female','Other'].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
            </Select>
          </F>
          <F label="Marital Status">
            <Select value={person.marital_status || ''} onValueChange={v => update('marital_status', v)}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{['Single','Married','Divorced','Widowed'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </F>
          <F label="Nationality">
            <Input className="h-8 text-sm" placeholder="e.g. South African" value={person.nationality || ''} onChange={e => update('nationality', e.target.value)} />
          </F>
        </div>

        {/* Row 4: Email | Mobile */}
        <div className="grid grid-cols-2 gap-2">
          <F label="Email">
            <Input type="email" className="h-8 text-sm" value={person.email || ''} onChange={e => update('email', e.target.value)} />
          </F>
          <F label="Mobile">
            <Input type="tel" className="h-8 text-sm" placeholder="+27" value={person.mobile || ''} onChange={e => update('mobile', e.target.value)} />
          </F>
        </div>

        {/* Row 5: Residential address */}
        <div>
          <Label className="text-[10px] font-semibold tracking-wider text-ocean uppercase block mb-1">Residential Address</Label>
          <div className="space-y-1.5">
            <Input className="h-8 text-sm" placeholder="Street address" value={person.street_address || ''} onChange={e => update('street_address', e.target.value)} />
            <div className="grid grid-cols-[1fr_1fr_140px_80px] gap-2">
              <Input className="h-8 text-sm" placeholder="Suburb" value={person.suburb || ''} onChange={e => update('suburb', e.target.value)} />
              <Input className="h-8 text-sm" placeholder="City" value={person.city || ''} onChange={e => update('city', e.target.value)} />
              <Select value={person.province || ''} onValueChange={v => update('province', v)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Province" /></SelectTrigger>
                <SelectContent>{PROVINCES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
              <Input className="h-8 text-sm" placeholder="Code" maxLength="4" value={person.postal_code || ''} onChange={e => update('postal_code', e.target.value)} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
