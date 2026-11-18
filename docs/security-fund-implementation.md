# Security Fund implementation

Implemented on 18 November 2026 in this workspace and its configured MySQL database.

## Business behavior

- Staff Fund now contains Security Fund Register and Interest screens.
- Create selects an existing active employee and records the deposit, receipt/reference and notes. One account per employee; retries cannot duplicate deposits.
- Only Security Fund principal earns **6% annual simple interest from 1 July 2026**. PF contribution/interest rules and Gratuity eligibility tiers are unchanged.
- **Current policy (v2): each deposit must be held for one calendar year from its original deposit date.** Before that anniversary, its payable/postable interest is zero. After qualification, eligible complete months are counted retrospectively, starting no earlier than 1 July 2026. Top-ups have their own original dates and anniversaries.
- Only **complete calendar months** earn interest, at `principal × 6% ÷ 12 × full months`. A partial initial deposit month is excluded. A departure on **30 December** counts through **30 November**; 31 December includes December. Leap years do not change the monthly rate. The actual departure date determines one-year eligibility separately from the last completed interest month.
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
| `/employee/staff-fund/security-fund?section=staff-fund` | Authenticated employee's own read-only ledger |
| Existing Final Payment / Clearance | Principal, interest, cutoff and linked settlement |
| Existing Financial Statement / Waiting List | Security Fund components in screen/print/export |
| Existing mobile Staff Fund summary | Separate Security Fund principal, interest, total and cutoff |

Existing `staff-fund.view/create/edit` permissions and organizational employee scope are enforced. PDF/Excel export requires `reports.export`. Ordinary employee self-service cannot choose another employee's ledger. Profile Create/Edit directs money changes to the fund ledger; profile/V2 requests cannot bypass that ledger by changing legacy money fields.

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

- **84 automated tests / 366 assertions passed**, using an isolated in-memory SQLite database. Coverage includes one-year deposit anniversaries, December 30/31 departures, partial initial/final months, separate top-up maturity, early-refund forfeiture, exact-anniversary refunds, same-day month-end final settlement, whole-taka cumulative rounding, no compounding, duplicate posting/payment, stale previews, legacy import/paid protection, permissions, employee isolation, controller routes, PDF/Excel, full Clearance approval and transaction rollback after a later recovery failure.
- Existing PF interest distribution, PF correction/transfer, Gratuity, Clearance and Waiting List regression suites passed.
- Production frontend build passed, including the PWA service worker.
- Repository-wide TypeScript checking has existing errors. Comparing the original tracked sources against the changed sources found **no new diagnostics** (baseline 1,015; changed tree 997 at verification).
- Configured-data smoke checks returned successful Register/Ledger/Interest responses; Dashboard and Financial Statement matched the imported fund balance and interest.
- The original rollout's local headless Chrome check covered desktop register, Create dialog/request serialization, ledger, interest preview and mobile viewport with **zero page errors**, using read-only fixtures and simulated submission. The final v2 browser recheck could not run because automatic approval review hit a usage limit; this was a review-availability failure, not a safety rejection. V2 backend/controller tests, the production build and direct frontend date/whole-taka formatting checks passed.
- The configured account's policy metadata was updated to v2 only after confirming there were no posted Security Fund interest/payment entries. The financial ledger and all original employee/PF/Gratuity/Final Payment/Clearance records remain unchanged. Evidence: `storage/app/security-fund-policy-v2-verification.json`.
- Flutter/Dart SDK is not on this environment's PATH, so the small mobile summary rendering change was inspected but not compiled here.

Core calculation is in `app/Services/SecurityFundInterestCalculator.php`; ledger writes and settlement are in `EmployeeSecurityFundService.php`. Shared final settlement orchestration remains in `FinalPaymentSettlementService.php` and `FinalClearanceService.php`.
