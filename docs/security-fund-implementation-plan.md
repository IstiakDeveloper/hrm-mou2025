# Staff Fund: Security Fund implementation plan

> **Current policy amendment:** প্রতিটি জমার মূল তারিখ থেকে এক বছর পূর্ণ না হলে interest 0। যোগ্য হলে 01 July 2026 বা জমার পরের প্রথম পূর্ণ calendar month থেকে পূর্ণ মাসগুলো পূর্ববর্তী সময়সহ গণনা হবে; top-up-এর anniversary আলাদা। 30 December departure-এ 30 November পর্যন্ত, 31 December-এ December-সহ গণনা। সূত্র principal × 6% ÷ 12 × পূর্ণ মাস; interest cumulative entitlement-এ nearest whole taka (half up) round হবে, compounding নয়। এই amendment নিচের পুরোনো day-based/proration/paisa প্রস্তাবগুলো প্রতিস্থাপন করে। বর্তমান implementation-এর বিবরণ `security-fund-implementation.md`-এ।

প্রস্তুতের তারিখ: ১৮ নভেম্বর ২০২৬, Asia/Dhaka।

অবস্থা: এই পরিকল্পনা অনুসারে Security Fund implementation করা হয়েছে। বাস্তবায়ন, চালু করা database migration/import এবং verification-এর বিবরণ [security-fund-implementation.md](security-fund-implementation.md)-এ আছে। নিচের initial data snapshot implementation-এর আগের read-only review থেকে নেওয়া; পরবর্তী sections মূল design plan হিসেবে সংরক্ষিত।

## 1. কী তৈরি হবে

Staff Fund-এর PF ও Gratuity-এর পাশাপাশি **Security Fund** থাকবে। অনুমতিপ্রাপ্ত ব্যবহারকারী **Create → employee select → deposit details → Save** দিয়ে employee-এর Security Fund account খুলতে পারবেন। জমার মূল টাকা এবং interest আলাদা থাকবে। Security Fund-এর বকেয়া principal ও interest Final Payment, Final Clearance এবং Financial Statement-এ আসবে।

নির্ধারিত requirement:

- Security Fund কার্যক্রমের interest effective date **01 July 2026**।
- Interest rate **6% flat**; interest-এর জন্য আলাদা column।
- Create button থেকে existing employee select করে fund account তৈরি।
- Final Payment-এর অন্তর্ভুক্তি।

User-confirmed business rule: **শুধু Security Fund-এ বছরে 6% simple interest**, principal-এর ওপর; accrued বা posted interest-এর ওপর আবার interest হবে না। User ১৮ নভেম্বর ২০২৬-এ “শুধু Security Fund-এ বছরে ৬%” নিশ্চিত করেছেন। PF-এর বর্তমান interest distribution এবং Gratuity-এর tenure rules চলবে।

## 2. বর্তমান code ও data থেকে পাওয়া তথ্য

সংখ্যাগুলো এই workspace-এ configured MySQL database থেকে সরাসরি SELECT/schema inspection করে পাওয়া snapshot; production database-এর সঙ্গে একই কি না যাচাই করা হয়নি। কোনো employee-এর নাম বা ব্যক্তিগত তথ্য এই plan-এ রাখা হয়নি।

| বিষয় | পাওয়া তথ্য | পরিকল্পনায় প্রভাব |
| --- | --- | --- |
| Employee | 1,230 জন; active 400, inactive 830 | শুধু active employee ধরে migration করলে পুরোনো হিসাব বাদ পড়বে |
| `employee_collaterals` | 1,011 row; positive Security Amount 1 জনের, মোট ৳20,000 | এই table-এ fund-সংক্রান্ত legacy source আছে; সব row fund account নয় |
| Positive deposit | active employee; deposit date 20 May 2026 | যাচাই করে import করলে interest শুরু হবে 01 July 2026 |
| `collateral_interest` | 1,011 row-তেই NULL | এখানে সংরক্ষিত পুরোনো rate/interest-এর অর্থ ধরে নিয়ে import করা যাবে না |
| Legacy deposit quality | positive row-এর date missing 0; duplicate employee 0 | বর্তমান positive deposit import সহজ; importer-এ validation তবুও লাগবে |
| `employee_pf_transactions` | 2,320 row | PF-এর ledger UI/pattern কাজে লাগবে; Security balance PF ledger-এ ঢুকবে না |
| PF interest run | 1টি: interest_year 2025, transaction date 30 June 2026 | পুরোনো PF interest history আলাদা; সেটিকে Security Fund interest হিসেবে পুনরায় গণনা করা যাবে না |
| `employee_gratuity_payments` | 2 row | Gratuity-এর paid checks অক্ষুণ্ণ রেখে integration |
| `separation_final_payments` | 50 row: paid 21, pending 29 | pending record refresh করা যাবে; paid historical amount বদলানো যাবে না |
| `final_clearances` | 5টি; সব approved | approved document-এ historical snapshot সংরক্ষণ জরুরি |
| Clearance-এর Staff Security | 4টি approved clearance-এ মোট ৳70,000; চারটিই paid final payment-এর সঙ্গে linked এবং settlements applied | এগুলো যাচাই করে historical paid entry হিসেবে reconcile করতে হবে; নতুন payable বানানো যাবে না |
| ৳70,000-এর collateral match | সংশ্লিষ্ট 4 employee-এর positive collateral deposit পাওয়া যায়নি | receipt/payment evidence ছাড়া নতুন opening deposit বা নতুন interest তৈরি করা যাবে না |

### Existing integration gap

1. Employee profile-এ `security_amount`, `collateral_interest`, `collateral_date` আছে; dedicated Security Fund account/ledger নেই।
2. `FinalPaymentSettlementService::calculate()` এখন PF + Gratuity − Loan দিয়ে net হিসাব করে; Security Fund অন্তর্ভুক্ত নয়।
3. `FinalClearanceService::snapshot()` Security Fund balance আনে না, যদিও `recomputeTotals()` manual `staff_security` যোগ করে।
4. `FinalClearanceService::approve()` আগে `markPaid()` করে settlements apply করে, পরে payment-এর `net_payable` clearance-এর total দিয়ে overwrite করে। ফলে payment total এবং settled components ভিন্ন হওয়ার পথ আছে। Security Fund যুক্ত করার আগে একই component snapshot দিয়ে এই পথ এক করতে হবে।
5. Financial Statement নিজেও PF + Gratuity দিয়ে gross entitlement তৈরি করে। শুধু final-payment formula বদলালে এই screen-এর হিসাব ঠিক হবে না।
6. Waiting List প্রথমে final payment-এর saved net amount নেয়, পরে clearance/employee amount-এ fallback করে। Security Fund যোগ হলেও এই source precedence বজায় রেখে একই snapshot ব্যবহার করতে হবে।
7. Existing final payment ও clearance-এ rounding/sign conventions ভিন্ন: settlement net শূন্যের নিচে clamp করে; clearance signed net রাখে। Security Fund-এর paisa এবং final cash rounding স্পষ্ট করতে হবে।

প্রধান reference: `routes/web/staff-fund.php`, `app/Services/FinalPaymentSettlementService.php`, `app/Services/FinalClearanceService.php`, `app/Http/Controllers/Payroll/EmployeeFinancialStatementController.php`, `app/Services/FinalPaymentWaitingListService.php`, `app/Services/PfInterestDistributionService.php`।

## 3. Interest policy: নির্দিষ্ট ও পুনরায় যাচাইযোগ্য হিসাব

নিচের day-count, cutoff, posting frequency ও rounding নতুন requirement-এর জন্য প্রস্তাবিত defaults; এগুলো existing confirmed policy নয়। একই policy UI, report, posting এবং final settlement-এ ব্যবহার করতে হবে।

| নিয়ম | প্রস্তাব |
| --- | --- |
| Effective date | 01 July 2026; এর আগের সময়ের জন্য নতুন policy-তে interest 0 |
| Annual rate | 6.0000%; সাধারণ deposit form থেকে editable নয় |
| Interest base | প্রকৃত outstanding deposit principal; interest, PF বা Gratuity এই base-এর অংশ নয় |
| Start | প্রতিটি deposit-এর জন্য `max(deposit_date, 2026-07-01)` |
| Fiscal year | 01 July থেকে পরের বছরের 30 June |
| Proration | actual eligible days / ঐ fiscal year-এর মোট দিন; 365 অথবা 366 |
| End for active employee | নির্বাচিত as-of date পর্যন্ত |
| End for separated employee | verified separation date পর্যন্ত; payment পরে হলেও বাড়তি accrual নয় |
| Missing separation date | inactive employee-এর ক্ষেত্রে review flag; silentভাবে আজকের তারিখ ধরে payable নয় |
| Interest posting | fiscal-year close-এ batch posting; আগেই final settlement হলে cutoff পর্যন্ত partial posting |
| Precision | decimal arithmetic/integer paisa; high-precision accrual, posting-এ 2 decimal rounding |
| Compounding | নেই; posted interest principal-এ merge হবে না |

### Formula

একই principal balance ও একই fiscal year-এর প্রতিটি date segment-এর জন্য:

```text
segment_interest = principal × 0.06 × eligible_days / fiscal_year_days
earned_interest  = sum(segment_interest)
interest_payable = posted_unpaid_interest + unposted_earned_interest
security_payable = outstanding_principal + interest_payable
```

`earned_interest` এবং `unposted_earned_interest` আলাদা অর্থে ব্যবহার করতে হবে: cumulative earned থেকে ইতোমধ্যে posted accrual বাদ দিয়ে unposted অংশ বের হবে। Posted interest দ্বিতীয়বার earned total-এর সঙ্গে যোগ হবে না। Interest payment/reversal/adjustment-ও পৃথকভাবে reconcile হবে।

### Date boundary ও principal পরিবর্তন

- Calculation-এর ভেতরে interval হবে `[start, end_exclusive)`। As-of/separation date অন্তর্ভুক্ত করতে `end_exclusive = cutoff_date + 1 day`।
- নতুন deposit deposit date থেকেই earning শুরু করবে। Principal refund/withdrawal effective date-এর শুরু থেকে ফেরত দেওয়া অংশে earning বন্ধ হবে। সব transaction-এর effective date এবং posting timestamp আলাদা থাকবে।
- একই দিনে একাধিক transaction হলে deterministic sequence ব্যবহার হবে; daily earning হবে ঐ দিনের effective principal balance-এর ওপর। Future transaction আগের as-of report-এ আসবে না।
- Top-up হলে তার নিজস্ব effective date; পুরোনো deposit-এর শুরুর তারিখে পুরো নতুন balance বসবে না। Partial refund হলে ফেরত দেওয়া অংশে ভবিষ্যৎ interest বন্ধ হবে।
- Fiscal-year boundary, principal change এবং settlement cutoff-এ segment ভাঙবে। Leap year-এ পূর্ণ financial year-এর earning ঠিক 6% রাখতে denominator হবে ঐ FY-এর actual days।
- Transaction date user-এর document date; সমস্ত day-boundary calculation `Asia/Dhaka` / existing `BangladeshDate` ব্যবহার করবে।
- Final Payment paid হওয়ার পরে account closed; closed interval-এ নতুন accrual বা backdated transaction সাধারণ flow-তে নিষিদ্ধ। Correction হলে linked reversal/review flow লাগবে।

### যাচাই করার উদাহরণ

| উদাহরণ | Principal | Eligible period | Interest |
| --- | ---: | --- | ---: |
| বিদ্যমান deposit date 20 May 2026; প্রথম পূর্ণ FY | ৳20,000 | 01 Jul 2026–30 Jun 2027, 365 দিন | ৳1,200.00 |
| একই deposit, 31 Dec 2026 পর্যন্ত | ৳20,000 | 184 / 365 দিন | ৳604.93 |
| নতুন deposit 01 Jan 2027 | ৳20,000 | 01 Jan–30 Jun 2027, 181 / 365 দিন | ৳595.07 |
| মূল ৳20,000-এর সঙ্গে 01 Jan 2027-এ আরও ৳10,000 | আলাদা date segment | পুরোনো অংশ পূর্ণ FY, নতুন অংশ 181 দিন | ৳1,497.53 |
| 30 Jun 2026 পর্যন্ত report | ৳20,000 | effective date-এর আগে | ৳0.00 |
| পূর্ণ leap financial year 2027–2028 | ৳20,000 | 366 / 366 দিন | ৳1,200.00 |

প্রথম FY শেষে ৳1,200 interest account-এ রেখে দিলেও পরের পূর্ণ FY-এর base ৳20,000-ই থাকবে; পরের বছরের interest আবার ৳1,200।

## 4. Employee Create ও দৈনন্দিন ব্যবহার

Staff Fund navigation-এ PF, Gratuity-এর সঙ্গে **Security Fund** group যোগ হবে।

### Register

- Actions: **Create**, employee ledger, deposit/top-up, refund, interest preview/post, reports।
- Filters: PIN/name, branch, department, employee status, fund status, as-of date।
- Columns: PIN, Employee, Branch, Deposit Date, Interest Start, **Principal Balance**, **Interest Payable**, **Total Payable**, Fund Status, Actions।
- Interest Payable-এর breakdown-এ **posted unpaid** এবং **unposted accrued** দেখা যাবে; as-of date ও cutoff reason দৃশ্যমান থাকবে।
- Summary cards: principal outstanding, posted interest outstanding, unposted accrual, total liability, account count। Filter ও as-of অনুযায়ী total মিলবে।
- বড় employee list-এর জন্য paginated server query এবং async lookup; সব employee browser-এ একসঙ্গে পাঠানো নয়।

### Create modal/page

1. **Create** চাপলে PIN/name দিয়ে searchable employee selector। নতুন HR employee বানানো নয়; existing employee select হবে।
2. Select করলে employee PIN, designation, branch, status দেখা যাবে। একই employee-এর existing fund account থাকলে নতুন account না খুলে ledger link দেখাবে।
3. Fields: Deposit Amount, Deposit Date, Receipt/Reference No., Notes। Interest Rate 6% এবং calculated Interest Start Date read-only preview।
4. Active employee default selectable; inactive legacy employee কেবল review/import permission ও unpaid evidence-এর ভিত্তিতে। PF enrollment বা confirmation date fund eligibility-এর শর্ত হবে না।
5. Save করলে account + initial deposit এক DB transaction-এ তৈরি হবে; server-side duplicate validation ও request idempotency থাকবে।
6. Amount positive, valid date, closed/paid account protection এবং reference checks server-এ enforce হবে। Historical date গ্রহণ করলে reason/evidence লাগবে; future deposit regular Save-এ গ্রহণ করা হবে না।

নতুন employee HR-এ যুক্ত হলেই fund account বা deposit স্বয়ংক্রিয়ভাবে তৈরি হবে না। Security Fund-এর Create দিয়ে প্রয়োজনমতো select করা যাবে। Payroll থেকে automatic monthly deduction এই requirement-এর অংশ নয়।

### Ledger

Date, transaction type, reference, principal credit/debit, interest credit/debit, principal balance, interest balance, total এবং actor দেখাবে। Opening/deposit, top-up, interest posting, refund, final settlement, adjustment ও reversal আলাদা transaction type হবে।

Posted financial transaction overwrite/delete না করে reason-সহ reversal এবং corrected entry দিতে হবে। এতে audit history এবং final-payment reference অক্ষুণ্ণ থাকবে। Partial standalone refund-এ principal ও interest কত যাচ্ছে তা আলাদা input/preview হবে; total balance-এর চেয়ে বেশি refund গ্রহণযোগ্য নয়।

## 5. Proposed data model

`employee_collaterals` certificate/security metadata-এর legacy source থাকবে। Financial source of truth হবে dedicated ledger। Fund-এর জন্য PF-এর employee/employer split বা `employees.pf_balance` reuse করা হবে না।

| Table | উদ্দেশ্য ও মূল fields |
| --- | --- |
| `employee_security_fund_accounts` | `id`, unique `employee_id`, `status` (open/closed), `policy_version`, `opened_on`, `closed_on`, `created_by`, timestamps |
| `employee_security_fund_transactions` | account/employee FK, type, effective `transaction_date`, separate principal credit/debit এবং interest credit/debit, optional balances-after snapshot, reference, notes, actor, `source_type/source_id`, unique idempotency key, `reversal_of_id` |
| `security_fund_interest_runs` | fiscal year, requested cutoff, rate/policy snapshot, status, actor, posting timestamp, principal/interest totals, source preview fingerprint |
| `security_fund_interest_run_items` | run/account FK, interval start/end-exclusive, actual days/FY days, rate, principal segment snapshot or calculation breakdown, calculated interest, linked ledger transaction |

Design constraints:

- Amount columns `decimal(15,2)`; annual rate `decimal(7,4)`; intermediate calculation higher precision। Float দিয়ে repeated monetary addition নয়।
- Employee FK-এ financial history থাকলে deletion restrict; existing employee deletion flow-তে dependency check লাগবে।
- এক employee-এর এক account; closed account ordinary Create দিয়ে পুনরায় খোলা নয়। Rehire হলে reviewed reopening এবং আলাদা service episode/cutoff record করতে হবে।
- Account/date/id, transaction source এবং run/account/period-এ উপযুক্ত indexes। Running balance convenience snapshot; historical as-of balance ledger থেকে date-filter করে নির্ণয়যোগ্য হবে।
- একই accrual interval দুবার post নয়। শুধু unique fiscal-year check যথেষ্ট নয়: final settlement-এ partial posting-এর পরে annual batch-এ overlap আটকাতে account lock ও covered-interval validation লাগবে।
- একই final payment-এর principal settlement ও interest settlement পুনরাবৃত্তি আটকাতে unique source/idempotency constraint।
- General audit log এবং financial ledger দুটোই ব্যবহার হবে; posted money history delete নয়।

### Existing tables-এ additions

- `separation_final_payments`: `security_fund_account_id` nullable, `security_principal` ও `security_interest` default 0, `security_interest_as_of` nullable। `breakdown.security_fund`-এ policy, rate, cutoff, posted/unposted split এবং calculation provenance।
- `settlement_refs`-এ Security Fund interest posting/refund transaction IDs।
- `final_clearances`: existing `staff_security`-কে **principal** হিসেবে স্পষ্ট label; নতুন `staff_security_interest` default 0, cutoff এবং calculation snapshot। Total-এ principal + interest একবার করে যোগ হবে। পুরোনো record-এ নতুন interest 0; historical meaning অনুমান করে বদলানো নয়।
- Historical paid record-এ zero default মানে নতুন module থেকে অর্থ পুনর্গণনা হয়েছে এমন নয়। UI-তে “Legacy record; detailed fund breakdown unavailable” দেখাতে হবে যেখানে প্রয়োজন।
- System-owned Security Fund values ordinary clearance amount edit থেকে আলাদা থাকবে; correction করতে ledger adjustment/reversal লাগবে।

## 6. Service, route ও permission পরিকল্পনা

Proposed services:

- `EmployeeSecurityFundService`: create account, deposit, refund, reversal, balance/as-of lookup; account locking এবং closed-period validation।
- `SecurityFundInterestService`: pure calculation, batch preview/post, final cutoff posting, overlap protection, deterministic rounding ও reconciliation।
- `SecurityFundImportService` এবং `staff-fund:import-security-fund --dry-run`: legacy matching, exceptions, source mapping ও rerun safety।
- `FinalPaymentSettlementService`: Security Fund snapshot ও linked settlements; approved clearance এবং direct Final Payment একই component object ব্যবহার করবে।

Proposed routes under existing Staff Fund view middleware:

| Route | কাজ | Write permission |
| --- | --- | --- |
| `GET /security-fund` | Register | — |
| `GET /security-fund/employees/lookup` | selectable employee lookup | create/edit eligibility check |
| `POST /security-fund` | Create employee fund account ও first deposit | `staff-fund.create` |
| `GET /security-fund/{account}/ledger` | Ledger | — |
| `POST /security-fund/{account}/deposits` | Top-up | `staff-fund.edit` |
| `POST /security-fund/{account}/refunds` | Refund | `staff-fund.edit` |
| `POST /security-fund/{account}/transactions/{transaction}/reverse` | Correction | `staff-fund.edit` + reason/closed-period rule |
| `GET /security-fund/interest` | Interest screen | — |
| `POST /security-fund/interest/preview` | Preview | `staff-fund.edit` |
| `POST /security-fund/interest` | Post | `staff-fund.edit` |
| `GET /security-fund/reports/{report}/{format}` | HTML/print/PDF/Excel | export-এ existing `reports.export` |

Static lookup/interest/report routes dynamic bindings-এর আগে register হবে। Web form validation-এর পাশাপাশি authorization ও employee/branch scope server-এ লাগবে। বিদ্যমান roles-এর `staff-fund.create/edit` reuse হবে; শুধু payroll permission দেখে নতুন Create button দেখানো যাবে না। Existing compatibility aliases বজায় রেখে actual permission resolution test করতে হবে।

Employee self-service-এ নিজের Security Fund summary/ledger read-only থাকবে; অন্য employee-এর ID দিয়ে access করলে 403। Dashboard summary-তেও caller-এর বিদ্যমান section/organizational scope প্রয়োগ হবে।

## 7. Final Payment ও Final Clearance integration

### Common component calculation

```text
Fund entitlement = PF payable
                 + Gratuity payable
                 + Security principal outstanding
                 + Security interest payable

Direct Final Payment net = Fund entitlement − current loan recovery

Clearance net = Fund entitlement
              + existing unpaid salary + other payable
              − existing loans − existing advances/adjustments
```

Direct flow ও Clearance flow একই Security Fund component ব্যবহার করবে। Clearance-এর অন্য existing components হারানো যাবে না। Signed net, employee receivable এবং cash payable আলাদা অর্থে রাখতে হবে; negative net হলে আগের debt policy অনুযায়ী payable/receivable দেখাবে। Security Fund যোগ করার অজুহাতে loan policy বদলানো নয়।

### Payment workflow

1. Pending preview/refresh-এ verified cutoff দিয়ে Security Fund principal ও interest snapshot আসে। UI-তে দুটি আলাদা row/column থাকবে। GET preview নতুন ledger posting করবে না।
2. Clearance approval-এর আগে component snapshot প্রস্তুত ও validate হবে। বর্তমান “আগে settle, পরে net overwrite” সরিয়ে অনুমোদিত component এবং total একসঙ্গে payment-এ পাঠাতে হবে।
3. Payment action-এ DB transaction শুরু করে final-payment row, employee/account এবং প্রয়োজনীয় ledger/loan state নির্ধারিত lock order-এ lock করতে হবে। Status ও approved snapshot stale কি না আবার যাচাই হবে। পরিবর্তন হলে নতুন preview প্রয়োজন হবে।
4. Cutoff পর্যন্ত unposted Security Fund interest কেবল অবশিষ্ট অংশ post হবে। ইতোমধ্যে posted interest আবার post হবে না। Snapshot-এর মোট interest-এর সঙ্গে posting reconcile করবে।
5. Principal এবং interest-এর settlement debit হবে; loan recovery/offset থাকলে gross entitlement consumption ও employee-কে বাস্তবে দেওয়া cash আলাদা breakdown-এ থাকবে।
6. Account balance zero ও closed হবে; reference `FP-{id}` এবং settlement_refs-এ transaction links থাকবে। Duplicate click/retry/approval race-এ একই payment দ্বিতীয়বার apply হবে না।
7. সব components সফল হলে paid status/employee date/clearance link save ও commit হবে; একটি failure হলে সব changes rollback। Partial settle রেখে paid দেখানো যাবে না।
8. Paid payment snapshot আর refresh হবে না। একই employee-এর historical paid record-এর ওপর পরের batch accrual চলবে না।

Current markPaid-এর সব entry point—controller, Clearance approval এবং existing backfill/apply-settlement commands—পর্যালোচনা করে shared service-level guard দিতে হবে। শুধু UI button disable করা যথেষ্ট নয়।

### Rounding agreement

Security ledger ও নতুন principal/interest columns দুই decimal দেখাবে। Existing `roundTaka()` whole taka করে; Security interest-এ তা সরাসরি ব্যবহার করলে paisa হারাবে। Final cash যদি existing rule অনুযায়ী whole taka হয়, সব component যোগ করার শেষে একবার round হবে এবং `rounding_adjustment` explicit থাকবে। Clearance, Final Payment এবং Statement-এ একই rounding result ব্যবহার হবে।

## 8. পুরোনো data migration ও reconciliation

1. **Dry-run inventory:** positive collateral, missing/invalid dates, duplicate employees, inactive employees, previous payment evidence এবং clearance links যাচাই; candidate/rejected/review-needed report তৈরি।
2. **বর্তমান ৳20,000:** active employee-এর receipt/date যাচাই করে original deposit date 20 May 2026-তে opening principal import; new-policy interest start 01 July 2026। Deployment date-এ নতুন deposit দেখিয়ে accrued সময় বাদ যাবে না।
3. **বর্তমান paid ৳70,000:** 4টি approved clearance/paid final payment থেকে আলাদা historical reconciliation list। Receipt/source deposit অজানা হলে “legacy paid security” reference-only archive; কোনো outstanding account, invented principal deposit বা নতুন interest তৈরি নয়। বিস্তারিত evidence পেলে linked historical ledger reconstruction, net outstanding অবশ্যই zero।
4. **Paid-history boundary:** একই employee-এর পরের অনুমোদিত deposit হলে পুরোনো paid episode আলাদা করতে হবে। Generic employee match দেখে সব security অন্ধভাবে বন্ধ বা unpaid করা যাবে না।
5. **Uncertain rows:** missing date, unknown interest value, mismatched balance, paid status ambiguity থাকলে exception list; zero date বা inferred paid amount দিয়ে auto-import নয়।
6. **Idempotent import:** source table + source row + import type unique mapping; rerun-এ একই principal/posting দ্বিতীয়বার তৈরি নয়। Dry-run কোনো account/ledger/payment mutate করবে না।
7. **Pending refresh:** 29টি pending payment-এর before/after report; শুধু যাদের verified Security Fund liability আছে তাদের amount delta হবে। Paid 21টি record-এর amount, payment date ও settled refs অক্ষুণ্ণ থাকবে।
8. **Historical interest:** পুরোনো `collateral_interest` NULL দেখে pre-July interest invent করা যাবে না। Evidence-সহ আগের earned-but-unpaid interest এলে আলাদা opening-interest entry; principal-এর অংশ নয়।
9. **Profile transition:** employee Create/Edit-এর collateral section-এ fund summary ও ledger link। Fund চালুর পরে `security_amount/date/interest`-এ সরাসরি profile write দিয়ে ledger পাশ কাটানো বন্ধ; certificate/other metadata আগের মতো। Legacy API/V2/import/export writer-ও audit করতে হবে। নতুন financial source থেকে display/export, দুইমুখী silent sync নয়।
10. **Reconciliation total:** outstanding principal + posted interest liability + unposted accrual = register liability; ledger, report এবং pending settlement cross-check। Import batch/source references থেকে review করা যাবে।

## 9. Reports, dashboard ও employee visibility

একই service calculation থেকে নিচের সব জায়গার principal/interest/net আসবে:

- Security Fund Register, individual ledger, Interest Preview/Posting, Refund History ও Migration Reconciliation report।
- Staff Fund dashboard-এ Security principal, interest ও total liability; existing employee dashboard-এ নিজের fund summary।
- Final Payment list/detail-এ Security Principal, Security Interest, updated payable এবং settlement transaction links।
- Final Clearance form/document-এ Staff Security Principal এবং Staff Security Interest আলাদা; remarks/cutoff/provenance দেখা যাবে।
- Financial Statement web/print-এ Security Fund section; eligibility query-তে **শুধু Security Fund balance আছে এমন inactive employee**-ও আসবে।
- Final Payment Waiting List-এর net total canonical saved snapshot থেকে; Security principal/interest columns web/print/PDF/Excel-এ একইভাবে যোগ হবে। পুরোনো record-এ unavailable breakdown স্পষ্ট থাকবে।
- Employee self-service web ledger; existing mobile finance API-তে additive `security_principal`, `security_interest`, `security_total`, `as_of_date` fields, authorization ও money-string convention বজায় রেখে। Mobile app rendering একই delivery-তে আলাদা ছোট integration step।
- Print/Excel-এ rate, as-of date, filters, total এবং signature conventions থাকবে। Date-filtered report-এ আজকের stored balance বসানো যাবে না।

## 10. File-level implementation map

| Area | Existing files / proposed additions |
| --- | --- |
| Schema/models | নতুন migrations, Security Fund account/transaction/run/item models; `app/Models/Employee.php`, `app/Models/SeparationFinalPayment.php`, `app/Models/FinalClearance.php` |
| Policy/services | নতুন `config/security_fund.php`, উপরে প্রস্তাবিত Security Fund services, `app/Support/BangladeshDate.php` reuse |
| Settlement | `app/Services/FinalPaymentSettlementService.php`, `app/Services/FinalClearanceService.php`, `app/Http/Controllers/Payroll/FinalPaymentController.php` |
| Backend endpoints | নতুন Security Fund controller/FormRequests; `routes/web/staff-fund.php`, self-service routes in `routes/web/core.php` |
| Navigation/layout | `resources/js/lib/staff-fund-nav.ts`, `resources/js/layouts/StaffFundLayout.tsx`, `resources/js/layouts/AdminLayout.tsx` |
| Security Fund pages | নতুন `resources/js/pages/staff-fund/security-fund/` register/create/ledger/interest/reports |
| Existing payment/statement UI | `resources/js/pages/payroll/final-payment/`, `resources/js/pages/payroll/financial-statement/index.tsx`, `resources/js/pages/final-clearances/` এবং clearance document component |
| Statement/report backend | `app/Http/Controllers/Payroll/EmployeeFinancialStatementController.php`, `app/Services/FinalPaymentWaitingListService.php`, `app/Support/FinalPaymentWaitingListXlsxExporter.php`, সংশ্লিষ্ট Blade templates |
| Dashboards/self-service | `app/Http/Controllers/DashboardController.php`, `app/Http/Controllers/Employee/EmployeeStaffFundController.php`, `resources/js/pages/sections/staff-fund/`, নতুন employee Security Fund ledger |
| Legacy profile paths | `app/Http/Controllers/Employee/EmployeeController.php`, `EmployeeV2Controller.php`, employee Create/Edit/Show, export/import mapping |
| Mobile | `app/Services/Mobile/MobileFinanceService.php`, finance API schema/types এবং mobile finance screen |
| Permissions | `config/permissions.php` label update; existing default roles/compatibility aliases/section access পর্যালোচনা |
| Import/report | নতুন dry-run import command, Security Fund report/export service ও templates |

## 11. বাস্তবায়নের ক্রম ও completion gates

| ধাপ | Deliverable | শেষ হওয়ার শর্ত |
| --- | --- | --- |
| 1 | Policy config, schema, pure interest calculator | section 3-এর উদাহরণ ও date/rounding tests pass |
| 2 | Account Create, lookup, deposit/refund ledger, authorization | employee select করে account তৈরি, duplicate/race protection, balance reconciliation |
| 3 | Interest preview/post ও reversal controls | partial final posting/annual batch-এ overlapping interest নেই |
| 4 | Common settlement snapshot, Clearance/Final Payment integration | একই component, একই total, atomic payment ও retry safety |
| 5 | Statement, Waiting List, print/PDF/Excel, dashboards, self-service/mobile | screen/report/API total ও access scope মিলবে |
| 6 | Migration dry-run, historical paid reconciliation, controlled import | active ৳20,000 যাচাইকৃত; paid ৳70,000 নতুন payable নয়; exceptions দৃশ্যমান |
| 7 | Regression, review ও rollout | নিচের acceptance checks pass; before/after financial report সংরক্ষিত |

Migration/config deploy এবং feature enable আলাদা ধাপ হবে। Production import-এর আগে backup ও dry-run reconciliation থাকবে। Imported/posting financial rows production-এ তৈরি হলে destructive down-migration দিয়ে rollback নয়; feature disable, transaction-preserving correction বা reviewed recovery করতে হবে।

## 12. প্রয়োজনীয় verification

Implementation-এর সময় dedicated test database ব্যবহার করতে হবে; configured operational database-এ destructive test/reset command নয়। এই planning task-এ application tests বা migrations চালানো হয়নি।

**Interest tests:** effective-date-এর আগে 0; 01 July boundary; deposit পরে হলে date-based proration; same-day deposit/refund; top-up; partial principal refund; leap FY; multi-year interval; no compounding; future transactions excluded; rounding split/partial posting reconciliation।

**Posting tests:** একই run retry; concurrent requests; overlapping interval rejection; mid-year final interest-এর পরে annual run; reversal-এর coverage এবং পুনরায় posting; closed account-এ backdate blocked। Rounding-এর জন্য posted + remaining accrual যেন cumulative entitlement-এর সঙ্গে paisa পর্যন্ত মেলে।

**Settlement tests:** direct final payment; approved clearance; security-only employee; existing loans/other clearance components; negative net handling; partial fund refund-এর পর final payment; paid snapshot immutable; legacy paid safeguard; duplicate mark-paid; clearance/direct approval race; middle failure-এ সম্পূর্ণ rollback।

**Migration tests:** dry-run zero writes; repeat import idempotent; missing date quarantine; paid ৳70,000 থেকে outstanding না তৈরি; verified active ৳20,000-এর সঠিক start; inactive unpaid eligibility; legacy profile writer ledger bypass করতে না পারে।

**Authorization/report tests:** view-only user Create/Post করতে পারে না; create permission respected; employee নিজের ledger-ই দেখতে পারে; branch scope; reports.export; HTML/PDF/Excel/Statement/Waiting List totals identical; পুরোনো record-এর unavailable breakdown।

শেষে existing PF interest, PF correction/transfer, Gratuity, Final Clearance ও Waiting List relevant regression tests এবং frontend TypeScript/build checks চালাতে হবে।

## 13. Policy decisions: implementation শুরুর ভিত্তি

Confirmed rule এবং বাকি প্রস্তাবিত defaults:

1. **User-confirmed:** 6% হবে **annual simple interest**, শুধু Security Fund-এ; PF/Gratuity-এর বর্তমান নিয়ম চলবে।
2. Partial period হবে actual-day ভিত্তিক, FY অনুযায়ী 365/366 denominator।
3. Separation date পর্যন্ত interest; actual payment delay-এর জন্য অতিরিক্ত interest নয়।
4. Year-end posting, সঙ্গে final settlement-এর সময় partial posting।
5. Principal ও interest 2 decimal; existing whole-taka cash policy থাকলে explicit final rounding adjustment।
6. New fund-এর paid history থেকে পুনরায় payable তৈরি নয়; historical correction আলাদা evidence-based workflow।

6% annual rate এবং শুধু Security Fund-এ প্রযোজ্য হওয়ার বিষয়টি user-confirmed। Day-count convention, separation-date cutoff, posting frequency ও rounding এখনো প্রস্তাবিত defaults; প্রতিষ্ঠানের নির্দিষ্ট policy পাওয়া গেলে সংশ্লিষ্ট defaults update করতে হবে। এই পার্থক্য documented রেখেই database structure, integration points, migration path এবং acceptance criteria নির্ধারণ করা হয়েছে।
