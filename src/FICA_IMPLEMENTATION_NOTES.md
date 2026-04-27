# FICA Document Repository Implementation

## ✓ Completed Steps

### STEP 1 — Client Entity Updated
- Added 5 new fields to `entities/Clients.json`:
  - `doc_identity` (string) — Identity Document file URL
  - `doc_proof_of_address` (string) — Proof of Address file URL  
  - `doc_source_of_funds` (string) — Income/Source of Funds file URL
  - `doc_existing_policies` (string) — Existing Policies file URL
  - `doc_submitted_at` (string) — DateTime when documents submitted
  - `doc_status` (enum) — Document verification status (Pending|Submitted|Verified|Incomplete)

### STEP 2 — Onboarding Step 5 Wired
- Updated `pages/ClientOnboarding.jsx` `handleSubmit()` method:
  - Sets `doc_submitted_at` to current ISO timestamp when client submits
  - Sets `doc_status` to "Submitted"
  - Maps document upload flags to Client entity fields:
    - `identity_document_uploaded` → `doc_identity`
    - `proof_of_address_uploaded` → `doc_proof_of_address`
    - `income_proof_uploaded` → `doc_source_of_funds`
    - `existing_policies_uploaded` → `doc_existing_policies`
  - Sends notification email to `tfine1969@gmail.com` with client details and submitted documents list

### STEP 3 — ClientDocumentRepository Component Created
- Created `components/ClientDocumentRepository.jsx`
- Features:
  - Displays 4-document index (01-04) with required/optional indicators
  - Shows uploaded vs. missing status
  - Download links for uploaded documents
  - Advisor can change doc_status via dropdown (Pending→Submitted→Verified→Incomplete)
  - Shows client submission timestamp when available
  - Includes FICA/POPIA compliance note
  - Color-coded status badges

### STEP 4 — Integration Point (Ready to Add)
To integrate into the advisor portal client detail view, add this code where CLIENT SUMMARY is displayed:

```jsx
import ClientDocumentRepository from "../components/ClientDocumentRepository";

// In your client detail/profile component:
<ClientDocumentRepository
  client={client}
  onStatusUpdate={() => {
    qc.invalidateQueries({ queryKey: ['clients'] });
  }}
/>
```

### STEP 5 — FICA Status Indicators Added to Proposals List
- Updated `components/inbox/InboxTable.jsx`:
  - Shows "FICA ✓" (green) badge if `doc_status === 'Verified'`
  - Shows "FICA ✗" (red) badge if `doc_status === 'Incomplete'`
  - Shows "FICA ⏳" (blue) badge if `doc_status === 'Submitted'`
  - Indicators appear next to client name in proposals table

## Data Flow

1. **Client onboarding**: Client uploads documents in Step 5 (checkboxes set upload flags)
2. **Submission**: Client clicks "Save & Submit" or "Review & submit"
3. **Email notification**: Advisor receives email listing which documents were submitted
4. **Repository view**: Advisor logs into portal, views CLIENT SUMMARY + FICA Document Repository
5. **Verification**: Advisor reviews documents and updates `doc_status` from Submitted → Verified or Incomplete
6. **Proposal tracking**: FICA status badge appears next to client name in proposals inbox

## Important Notes

- `doc_status` is **advisor-only** field — only updated via dropdown in ClientDocumentRepository
- `doc_submitted_at` is set **automatically** when client submits Step 5 — never manually updated
- Document fields (`doc_identity`, etc.) are stored as URLs (not actually file uploads yet — currently placeholder strings)
- All 4 document rows always display, regardless of upload status
- FICA status indicators are optional and hidden if `doc_status` is null/Pending

## Integration Checklist

- [ ] Add ClientDocumentRepository import to your client detail/profile component
- [ ] Render `<ClientDocumentRepository client={client} onStatusUpdate={callback} />` below CLIENT SUMMARY
- [ ] Test: Create a test client, complete onboarding with Step 5, verify email sent
- [ ] Test: Open advisor portal, navigate to client detail, verify repository displays
- [ ] Test: Verify dropdown updates `doc_status` correctly
- [ ] Test: Verify FICA badges appear in proposals inbox after status is set