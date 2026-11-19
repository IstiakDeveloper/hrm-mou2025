# Security Fund implementation

Implemented on 18 November 2026 in this workspace and its configured MySQL database.

## Business behavior

- Staff Fund now contains Security Fund Register and Interest screens.
- Create selects an existing active employee and records the deposit, receipt/reference and notes. One account per employee; retries cannot duplicate deposits.
- Only Security Fund principal earns **6% annual simple interest from 1 July 2026**. PF contribution/interest rules and Gratuity eligibility tiers are unchanged.
- **Current policy (v3): each deposit must be held for one calendar year from its original deposit date.** Before that anniversary, its payable/postable interest is zero. After qualification, eligible complete months are counted retrospectively from the first day of the month following the deposit, starting no earlier than 1 July 2026. The deposit month is always excluded, including deposits made on its first day. Top-ups have their own original dates and anniversaries.
- Only **complete calendar months** earn interest, at `principal × 6% ÷ 12 × full months`. For example, a 15 September 2026 deposit qualifies on 15 September 2027 and receives interest from 1 October 2026 through 31 August 2027 at that time. A departure on **30 December** counts through **30 November**; 31 December includes December. Leap years do not change the monthly rate. The actual departure date determines one-year eligibility separately from the last completed interest month.
- Interest never becomes interest-bearing principal. Cash held as posted or accrued interest earns no further interest.
- Register, ledger, dashboard, Financial Statement, Final Payment and Clearance show principal and interest separately. Register supports employee, status, branch, department and as-of filters.
- Interest preview/posting excludes previously posted accrual. Posting, reversals, refunds and final settlement use employee/account locks and unique request/source keys.
- Principal refunds consume the oldest deposits first. Returned portions held under one year permanently forfeit interest; remaining portions can later qualify. Returned portions must have stayed deposited for a full earning month. Refund projection, eligible interest posting and the actual refund commit atomically, including refunds on the first anniversary. Employment's final working day remains included when final payment occurs on that same date.
- A verified separation date stops interest, even if payment is later. Missing inactive-employee separation dates require review.
- Final Payment and Clearance approval settle the same component snapshot atomically, record ledger references and close the account. Duplicate payment attempts do not settle the fund again. A failure in another settlement component rolls everything back.
- Clearance retains unpaid salary, other benefits and advance adjustments. Its total is saved before settlement; it is no longer overwritten after payment. Changed fund/loan components require Accounts review.
- Principal may retain paisa. **Interest rounds to the nearest whole taka (half up), once on cumulative entitlement across deposits.** Partial interest posting credits only the difference from that rounded entitlement, preventing rounding drift. Fractional-taka interest refunds are rejected. Existing whole-taka final-payment rounding is still recorded separately.
- Historical paid records retain their original amounts; unavailable legacy Security Fund breakdowns are identified rather than inferred.

## Available screens and exports

| Location | Behavior |
| --- | --- |
| `/security-fund?section=staff-fund` | Register, Create, filters, totals and print/PDF/Excel |
| `/security-fund/{account}/ledger?section=staff-fund` | Deposits, refunds, transaction history, actor, reversal, balances and ledger exports |
| `/security-fund/interest?section=staff-fund` | Preview and post interest through a selected cutoff |
| `/security-fund/import?section=staff-fund` | Download template, upload Excel deposits, view row results and download failed rows |
| `/employee/staff-fund/security-fund?section=staff-fund` | Authenticated employee's own read-only ledger |
| Existing Final Payment / Clearance | Principal, interest, cutoff and linked settlement |
| Existing Financial Statement / Waiting List | Security Fund components in screen/print/export |
| Existing mobile Staff Fund summary | Separate Security Fund principal, interest, total and cutoff |

Existing `staff-fund.view/create/edit` permissions and organizational employee scope are enforced. PDF/Excel export requires `reports.export`. Ordinary employee self-service cannot choose another employee's ledger. Profile Create/Edit directs money changes to the fund ledger; profile/V2 requests cannot bypass that ledger by changing legacy money fields.

## Excel deposit import

The Register's **Excel Import** button opens the upload screen. Download the template, fill the first worksheet with **PIN, Name, Deposit Date, Amount**, then upload the `.xlsx` file (maximum 2,000 deposit rows / 10 MB).

- Matching uses only the employee PIN, within the user's organizational scope. Names are reference data; importing never changes employee names. Keep PIN as Excel Text to preserve leading zeros. Multiple employees sharing a PIN fail rather than selecting one arbitrarily.
- Valid rows are recorded while invalid/unmatched rows receive individual failed reasons. An empty or malformed workbook or missing required header rejects the file before deposits are written.
- A new account needs `staff-fund.create`; adding to an existing account needs `staff-fund.edit`. A matched employee can receive an Excel deposit regardless of active/inactive status or a legacy final-payment date. A generic paid PF/Gratuity record does not prove Security Fund payment. Closed accounts, actual paid Security Fund settlements and already posted periods remain protected by the ledger service.
- Inactive employees without a verified separation date can import principal. Their ledger, register and reports include that principal, mark interest as awaiting date verification, and add no unverified interest. Correcting the separation date automatically restores the normal calculation. Interest batches skip flagged accounts and post other verified accounts. Final payment cannot invent a separation date for these accounts.
- Multiple rows for one employee are processed in date order. Existing or repeated employee/date/amount deposits are **Skipped**, including repeated uploads under another filename. This four-column format cannot distinguish two separate receipts with identical employee/date/amount; record such an exceptional second receipt through the normal deposit screen with its own reference.
- Accepted dates are YYYY-MM-DD, DD/MM/YYYY (also day-first dash/dot separators), or native Excel serial dates, including 1904-calendar workbooks. Impossible/future dates, nonpositive amounts, excess decimal places and formula cells fail with a reason. Paste formula results as values first.
- The result screen provides total/imported/failed/skipped counts, physical Excel row numbers, matched employee names, ledger links, pagination and result filters. **Download Failed Rows** produces a retryable `.xlsx` file with the four original columns plus Failed Reason; successful rows are excluded.
- Results are stored privately under the uploading user's ID and a UUID. Another user cannot open or download the report. The upload itself is temporary; no new schema or database migration is required.
- Imported deposits use the existing ledger service and retain the confirmed 6% annual, one-year, full-month and whole-taka interest rules.

Import verification: **99 tests / 464 assertions** passed across Security Fund and existing PF/Gratuity/Clearance/Waiting List regression suites, including real `.xlsx` uploads, failures export, duplicate retries, date systems, strict PIN matching, authorization and report privacy.

### Import feedback fix — 19 November 2026

Upload now requests a JSON receipt directly instead of treating an Inertia redirect as proof of success. The file is cleared only after a complete receipt (counts plus row results) is received. File validation errors, missing headers (including the actual found/missing columns), permission/session failures, oversized requests, server errors, malformed responses and connection timeouts produce visible feedback. A timeout does not claim that no rows were written; users can check their last saved result before retrying.

Zero-import, all-duplicate and partial-success results have explicit summary banners. Failed rows are selected first when failures exist, and new receipts scroll into view. The latest completed import ID is retained in the user's session so refreshing the import screen restores the saved result. Saved reports remain private to their uploader. Unexpected server-side exceptions include a logged reference ID and a visible recovery message.

Updated backend regression verification: **104 tests / 506 assertions passed**. Production build passed; TypeScript comparison found no new diagnostics.

Headless Chrome verified 11 feedback scenarios: missing file, missing headers, all failed, all skipped, partial success, forbidden permission, expired session, oversized request, server failure, invalid response and lost connection. Each displayed an explicit message; partial results selected failed rows first and the All filter restored the other rows. Browser testing used simulated responses with zero financial writes and no page errors.

## Database and legacy data

New migration: `database/migrations/2026_11_18_120000_create_security_fund_tables.php`.

New account, transaction, interest-run and run-item tables retain financial history. Final Payment and Clearance receive additive principal/interest/cutoff/snapshot fields. The migration refuses a destructive rollback once ledger history exists.

Applied only this migration to the configured database. Ran legacy import in dry-run mode, inspected the results, then applied it:

- Imported **one existing deposit of ৳20,000**, retaining the original 20 May 2026 deposit date and 1 July 2026 interest start.
- With the confirmed one-year rule, as of **18 November 2026** principal is **৳20,000.00**, interest **৳0**, total **৳20,000.00**. This deposit first qualifies on **20 May 2027**. Its previous v1 day-based preview of ৳463.56 was never posted or paid and is superseded by the confirmed rules. No financial ledger entry was rewritten.
- **Four approved, paid clearances totaling ৳70,000 Staff Security** remain historical references. They created no new fund liability, principal or interest.
- SHA-256 fingerprints of all original columns and rows matched before/after for employees (1,230), collaterals (1,011), PF transactions (2,320), PF interest runs (1), Gratuity payments (2), Final Payments (50) and Clearances (5).
- No existing employee/fund/payment/clearance financial records were recalculated or rewritten during rollout. No pending payment was linked to the imported active employee; later fund settlements use the new calculation automatically.

Reconciliation evidence is in ignored local files `storage/app/security-fund-before-migration.json` and `storage/app/security-fund-after-migration.json`; these contain counts/hashes rather than copies of employee records.

For another environment:

```powershell
php artisan migrate --path=database/migrations/2026_11_18_120000_create_security_fund_tables.php --force
php artisan staff-fund:import-security-fund --dry-run
# Inspect eligible, review_required and legacy_paid before applying.
php artisan staff-fund:import-security-fund --apply
```

Import is idempotent. It quarantines missing dates, ambiguous legacy interest, duplicate sources, already paid employees and unverifiable inactive records. `--dry-run` never writes fund records; without `--apply`, the command defaults to dry-run.

Posted transactions are corrected with linked reversals in reverse order. Closed final settlements cannot be deleted through the legacy delete path. Rehiring/reopening a closed account or reconstructing unknown historical deposits requires reviewed accounting evidence; no balance or deposit is invented automatically.

## Verification

- Portrait format update: Security Fund Print and PDF now use A4 portrait, 8 mm side margins, compact 6.5–7 pt text and explicit column widths. Employee/branch names and transaction notes wrap; money stays aligned. Date-review explanations appear in full below the register, and totals appear once at the end. Browser print and mPDF exports both retained all 372 accounts and totals across 8 pages; individual-ledger exports fit on one page. PDF geometry and text-bound checks found no words outside the print margins, and Chrome found no overflowing table cells. The 58 Security Fund service tests passed (409 assertions), including A4 portrait PDF dimensions. Evidence: ignored `storage/app/security-fund-portrait-verification.json`.

- 19 November 2026 performance/PDF correction: Interest and transaction ledgers render 30 rows per page, retain whole-register totals, search all loaded rows, and preserve running balances across pages. Number/date formatters are reused. List queries load only needed fields, batch completed separation dates, omit per-deposit audit segments, and the individual ledger reuses one dated transaction query for display and calculation. No financial calculation or historical entry was changed.
- The full 372-account Dompdf export reproduced a fatal memory error with PHP limited to 128 MB (about 158 MB required without that limit). The export now uses the existing mPDF dependency with packed/simple tables and a private temp directory; the complete, visually checked 22-page report succeeds within that limit at about 78 MB peak. Landscape layout, page numbers, signature blocks, deferred-date principal and full totals were verified. Individual-ledger PDF download also passed.
- Local headless Chrome with 4x CPU slowdown, median of three runs: Interest 14,512 ms to 2,639 ms (372 accounts), transaction ledger 3,325 ms to 2,354 ms (105-entry fixture). Search across pages, pagination reset, posting confirmation totals, and page-two running balances passed with no page errors or financial writes. These are local fixture measurements, not a production latency guarantee. Evidence is in ignored `storage/app/security-fund-speed-before.json`, `security-fund-speed-after.json` and `security-fund-performance-final.jsonl`.
- Performance correction validation: **119 tests / 609 assertions passed**, production/PWA build passed, and TypeScript introduced no new diagnostics (999 baseline, 997 current; repository-wide pre-existing errors remain).

- 19 November 2026 import correction: PIN `0742` had a legacy profile final-payment date but no actual Final Payment record; PIN `1057` was inactive without a departure date. Both user-supplied deposits (BDT 20,000 each; 2 July 2023 and 11 October 2025 respectively) were imported through the normal PIN-matching service. The latter retains principal with interest deferred pending a verified departure date. Whole-table fingerprints confirmed employees, collaterals, PF transactions/runs, Gratuity payments, separations, Final Payments and Clearances were unchanged. Evidence: ignored `storage/app/security-fund-import-status-repair-verification.json`.
- The import correction passed **116 tests / 576 assertions**, the production build and a headless Chrome check of principal visibility, deferred-date messaging, eligibility labels, interest posting availability for verified accounts and the mobile register. Browser checks made no financial writes and had zero page errors.

- **84 automated tests / 366 assertions passed**, using an isolated in-memory SQLite database. Coverage includes one-year deposit anniversaries, December 30/31 departures, partial initial/final months, separate top-up maturity, early-refund forfeiture, exact-anniversary refunds, same-day month-end final settlement, whole-taka cumulative rounding, no compounding, duplicate posting/payment, stale previews, legacy import/paid protection, permissions, employee isolation, controller routes, PDF/Excel, full Clearance approval and transaction rollback after a later recovery failure.
- Existing PF interest distribution, PF correction/transfer, Gratuity, Clearance and Waiting List regression suites passed.
- Production frontend build passed, including the PWA service worker.
- Repository-wide TypeScript checking has existing errors. Comparing the original tracked sources against the changed sources found **no new diagnostics** (baseline 1,015; changed tree 997 at verification).
- Configured-data smoke checks returned successful Register/Ledger/Interest responses; Dashboard and Financial Statement matched the imported fund balance and interest.
- The original rollout's local headless Chrome check covered desktop register, Create dialog/request serialization, ledger, interest preview and mobile viewport with **zero page errors**, using read-only fixtures and simulated submission. The final v2 browser recheck could not run because automatic approval review hit a usage limit; this was a review-availability failure, not a safety rejection. V2 backend/controller tests, the production build and direct frontend date/whole-taka formatting checks passed.
- The configured account's policy metadata was updated to v2 only after confirming there were no posted Security Fund interest/payment entries. The financial ledger and all original employee/PF/Gratuity/Final Payment/Clearance records remain unchanged. Evidence: `storage/app/security-fund-policy-v2-verification.json`.
- Flutter/Dart SDK is not on this environment's PATH, so the small mobile summary rendering change was inspected but not compiled here.

Core calculation is in `app/Services/SecurityFundInterestCalculator.php`; ledger writes and settlement are in `EmployeeSecurityFundService.php`. Shared final settlement orchestration remains in `FinalPaymentSettlementService.php` and `FinalClearanceService.php`.
