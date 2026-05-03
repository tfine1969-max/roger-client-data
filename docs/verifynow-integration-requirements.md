# VerifyNow FICA Integration Requirements

This portal should treat VerifyNow as the evidence source for CDD checks, while Elite Wealth remains the CRM and advice workflow record. The Wealth Works RMCP requires onboarding to feed the AML workflow, weighted risk rating, and ROA evidence.

## Confirmed From VerifyNow Documentation

- Base URL: `https://www.verifynow.co.za/api/external`.
- Authentication header: `x-api-key`.
- Production requests require an `Idempotency-Key` header. Sandbox can auto-generate one, but the portal sends one for every request.
- SA ID verification: `POST /verify` with `reportType: "said_verification"`, `idNumber`, and `mode`.
- Consumer trace: `POST /verify` with `reportType: "consumer_trace"`, `idNumber`, and `mode`.
- CIPC company verification: `POST /cipc` with `reportType: "cipc_company_match"`, `registration_number`, optional `sole_prop_id_number`, and `mode`.
- AML/PEP screening: `POST /aml-screening` with `mode`, `name`, `entity`, `country`, and `dataset`.
- ID document OCR: `POST /id-document-verify` with `bundle: "id_document_verification"`, `mode`, `front_image_base64`, optional `back_image_base64`, optional `document_type`, and optional `issuing_country`.
- Passive liveness: `POST /passive-liveness` with `mode` and `image_base64`.

## Information Still Required From VerifyNow

- Confirm whether `front_image_base64` should include the `data:image/...;base64,` prefix or raw base64 only. The portal currently sends raw base64.
- Exact response schemas and status values for pass, fail, refer, pending, no match, service unavailable, and duplicate requests across production and sandbox.
- Sample successful and failed payloads for individuals, companies, trusts, directors, trustees, beneficial owners, and entity AML screening.
- File upload limits for OCR: accepted file types, maximum file size, front/back image rules, and whether passports require separate fields.
- Face match endpoint request schema for `/facematch`, because the supplied documentation confirms `/passive-liveness` but only lists `/facematch` in the quick reference.
- Webhook or callback support, including retry policy, signing secret, event names, and correlation IDs.
- Idempotency requirements and allowed reference/correlation fields.
- Data retention, POPIA terms, and whether raw reports may be stored in the portal document repository.
- Pricing or throttle limits per check so the workflow can avoid unnecessary duplicate calls.

## Recommended Verification Flow

Individuals:
- Verify SA ID/passport details.
- Run consumer trace using ID number plus captured residential address.
- Run OCR/authentication on the uploaded ID document.
- Run AML/PEP/sanctions screening.
- Run face match/liveness when a selfie is supplied.
- Calculate RMCP weighted risk and save FICA reference, failure reasons, evidence, and AML risk rating to the client profile and ROA.

Companies:
- Verify CIPC registration and company status.
- Screen the company/entity name for AML/PEP/sanctions/adverse media where supported.
- Verify each director and beneficial owner using ID verification, consumer trace, uploaded-ID OCR/authentication, and AML/PEP screening.
- Store all company documents plus director/beneficial-owner documents in the advisor document repository.
- Calculate RMCP weighted risk and refer for EDD when CIPC, AML, address, document, ownership, or high-risk-product factors require it.

Trusts:
- Capture trust deed, letter of authority, proof of address, and bank statement.
- Verify each trustee, founder/donor, named beneficiary, and controlling person where available.
- Run ID verification, consumer trace, uploaded-ID OCR/authentication, and AML/PEP screening for trustees and controlling persons.
- Store trust documents plus trustee/beneficiary/controller documents in the advisor document repository.
- Calculate RMCP weighted risk and refer for EDD when trust structure, beneficiaries, source of funds, AML, address, or document checks require it.

## Current Gaps To Close Before Production

- VerifyNow endpoint names and payload fields must be confirmed against their official integration pack.
- The current portal does not yet capture and verify all beneficial owners/controllers for every company and trust.
- Entity AML screening should be added for companies and trusts in addition to director/trustee screening.
- Proof-of-address document OCR/name-address matching should be added; consumer trace is useful but should not be the only address evidence.
- Raw VerifyNow reports need a formal storage policy: what is stored, where it is indexed, who can view it, and when it is deleted.
- The portal needs consent wording and immutable audit records for every verification call.
- Webhook handling, retries, idempotency, and service-failure fallbacks need to be implemented once VerifyNow confirms their API contract.
- Manual review/EDD needs structured reason codes, approval notes, reviewer name, and review timestamp.
- RMCP wording should explicitly reference VerifyNow/eas-e FICA replacement, consumer trace, OCR, entity screening, beneficial owner checks, evidence retention, and re-verification cycles.
