# বর্তমান প্রজেক্ট যাচাই

Audit baseline: 2026-11-13, Asia/Dhaka। পদ্ধতি: সব in-scope file-এর structural text scan/metadata inventory, সব non-Blade PHP source-এর syntax check, route/controller/service/model/page/test extraction এবং নির্বাচিত critical flow-এর source review। প্রতিটি line-এর manual semantic review বা live system certification দাবি করা হচ্ছে না।

## প্রযুক্তি ও গঠন

| অংশ | পাওয়া প্রমাণ | Mobile implication |
| --- | --- | --- |
| Backend | `composer.json`: Laravel `^12`, PHP `^8.2`; Composer platform 8.3; local syntax interpreter PHP 8.4 | Production PHP 8.3-এ পুনরায় validation দরকার |
| Frontend | React 19, Inertia 2, TypeScript, Tailwind 4, Vite 6 | React page সরাসরি Flutter-এ ব্যবহার করা যাবে না |
| Authentication | `AuthController`: staff username/email/password ও branch/PIN; session regeneration | দুটো account type-এর mobile token flow দরকার |
| Authorization | `User`, `Role`, `PermissionRegistry`, `SectionRegistry`, `OrganogramAccessService`, `permissions.ts` | role, scope, section lock ও workflow state একসঙ্গে enforce করতে হবে |
| Data | ১৪০ model; ১৯৩ migration file; ১৫৯ distinct `Schema::create` নাম | এটি source history, live schema নয় |
| Reporting | Blade/PDF, Dompdf/mPDF, Browsershot, XLSX/CSV helpers | server-generated official documents reuse করতে হবে |
| Jobs/integration | Redis/Horizon config, console schedule, ZKTeco/ADMS, MisLoan | API middleware-এ web-only side effect অনুপস্থিত যেন না হয় |
| PWA | manifest, service worker, VAPID web push, geofence attendance | native push ও device identity আলাদা করে করতে হবে |
| Tests | ৫৪ file; regex-এ ১৮৪ test title; payroll/PF/loan/workflow/date/scope coverage আছে | পূর্ণ test count বা test pass বলা যায় না |
| Delivery | GitHub deploy to VPS, frontend build, migration/cache/Horizon restart | mobile CI, staging gate ও store distribution যোগ করতে হবে |

## মডিউল ধরে যাচাই

| Module | Reviewed entry points / supporting evidence | যাচাইয়ের বিষয় |
| --- | --- | --- |
| Shell/self service | `routes/web/core.php`, `DashboardController`, `admin-sections.ts` | module landing, role-aware shortcuts, employee vs administrative views |
| Employees | `routes/web/employees.php`, Employee controllers/model, import/export support | full employee forms, repeated rows, nominee/guarantor, bank, documents, assignment history |
| Organization | `routes/web/organization.php`, organization models/config | branch/region/zone, head-office departments, manager links, types/programs/projects |
| HR lifecycle | `routes/web/hr-lifecycle.php`, completion/activation services | transfer, confirmation, promotion, demotion, redesignation, separation, salary increment |
| Appraisal | four evaluation controllers/workflow services, `Appraisal/*` | form variants, signatures, send-back, reset, comment corrections, scoped lists |
| Exit | resignation workflow, final-clearance service/visibility, settlement services | head-office vs field chain, final payment and paid-state eligibility |
| Attendance | `routes/web/attendance.php`, SelfAttendance, GeoFence, device-lock, GuardShift, MultiBranch services | own/eligible branch, shift, weekend/holiday, device agents, attendance reports |
| Movement | `routes/web/movement.php`, penalty middleware, LogBook payment service | movement approval/completion, multi-day, overdue fine, voucher recommendation/approval |
| Leave | `routes/web/leave.php`, application/balance/type/tier controllers | balance rules, attachments, approval/cancel, configured eligibility/auto approval |
| Loans | `routes/web/loans.php`, self-service routes, policy/calculation/collection services | PF/Motorcycle specialized workflow, register, collection/rebate/rollback/migration |
| Payroll | `routes/web/payroll.php`, calculation/post/rollback/as-of employee services | setup, processing/posting, arrears, withheld/fixed/probation salary, bonus, own payslips |
| Staff fund | `routes/web/staff-fund.php`, PF/gratuity/settlement services | two-side PF, interest, correction, transfer, withdrawal, final payment |
| Fixed assets | `routes/web/assets.php`, asset services/models/reports | purchases, assignments/custodian, maintenance, warranty/insurance/guarantee, depreciation, transfer/disposal |
| Inventory | `routes/web/inventory.php`, stock/ledger/movement/scope services | stock-in/disburse, recipients, corrections, stock check, scoped ledger |
| Documents/notices | document/notice controllers, notification classes, WebPush service | upload/view/download rights, pin permissions, read/unread, attachment ownership |
| Administration | `routes/web/admin.php`, users/roles/sessions/activity log | access changes, account status, sync, session revocation, bulk communications |
| Office map | public `/office-map`, `OfficeMapLocations`, map components | public vs private data, location hierarchy, marker cluster/search/directions |
| Integrations/ops | `routes/api.php`, `routes/iclock.php`, scheduler, deploy files | shared-secret boundaries, ADMS, MisLoan SSO/sync, report renderer, background consistency |
| Placeholder areas | `SectionRegistry`, `admin-sections.ts`, generic dashboard | Training registered but full module not found; Store registry entry lacks dedicated functional module; recruitment appears in type union only |

## নিশ্চিত mobile-readiness ঘাটতি এবং review findings

এগুলো source-based findings। “Exploit confirmed” বা live incident বোঝায় না। Existing behavior বদলানোর আগে tests ও business parity নিশ্চিত করতে হবে।

| ID | প্রমাণ ও finding | অগ্রাধিকার / করণীয় |
| --- | --- | --- |
| A01 | Sanctum installed, কিন্তু `User`-এ `HasApiTokens` নেই; `routes/api.php`-তে mobile login/bootstrap/domain API নেই | P0: token model/migration, issuance, expiry, revocation, device binding, tests |
| A02 | API-তে মোট ৮ static declarations; প্রধানত integration sync এবং `/user`; web action-এ Inertia/redirect | P0: versioned JSON resources, FormRequests, domain adapters; API shared secret Flutter-এ নয় |
| A03 | `CheckPermission` deny হলে redirect; `EnsureMovementFinePaid` web stack-এ redirect | P0: API-তে structured 401/403/423; একই fine lock এবং allowed recovery endpoints |
| A04 | role alias, account type, organogram restriction, section locks এবং stage-specific reviewer logic ছড়িয়ে আছে | P0: server-derived capabilities + object scope; current semantics characterization tests; `docs/permission-system-plan.md`-এর প্রস্তাব implemented ধরে নেওয়া যাবে না |
| A05 | `SelfAttendanceController` punch + `SelfAttendanceDeviceLockService` assertion/write আলাদা operation; client-supplied fingerprint | P0: concurrent race tests, transactional unique constraints/locking, install identity ও recovery; fingerprint spoof-proof নয় |
| A06 | PWA WebPush service ও browser subscription আছে; native FCM/APNs registration নেই | P1: native token lifecycle, preferences, deep links; database inbox source of truth |
| A07 | `.env`, dependencies, DB unavailable | P0 discovery gate: safe staging setup; production record দিয়ে local test নয় |
| A08 | duplicate `/error/{type}` GET/name; attendance `/report` GET/name দুই controller-এ declared | P1: effective route reconciliation; duplicate cleanup-এর আগে runtime evidence |
| A09 | movement dynamic `/{movement}` GET report static GET-এর আগে; employee resource-এর পরে `pin-suggestion` | P1: route binding/constraints দিয়ে static URL shadow হয় কি না পরীক্ষা; source-order concern, runtime failure confirmed নয় |
| A10 | `AuditPermissionsCommand` শুধু `routes/web.php` ও `routes/api.php` পড়ে, split routes নয় | P1: recursive/runtime permission audit; catalog বনাম routes বনাম server capability comparison |
| A11 | web login route-এ explicit throttle নেই; active `AuthController` login-এ LoginRequest rate limiter ব্যবহার দেখা যায়নি | P0: account/IP/device-aware throttling, generic auth errors; reverse-proxy safeguards live verified নয় |
| A12 | `routes/auth.php` file আছে কিন্তু inspected bootstrap/web route loading-এ require নেই | P1: reset/register/verify routes কার্যকর ধরে mock UI নয়; runtime reconcile এবং recovery API design |
| A13 | Employee documents ও Document Center `public` disk-এ store হয় | P0: NID/bank/signature/private attachments access review, private storage migration + authorized download; deployment exposure live verified নয় |
| A14 | `OrganizationSyncAPIController::branchPayload` integration payload-এ `login_pin_hash` আছে | P0: credential material mobile serialization-এ নিষিদ্ধ; existing integration consumer contract review ছাড়া field সরানো নয় |
| A15 | `ActiveSessionService` শুধু `sessions` table দেখে | P1: mobile API tokens/device sessions-কে admin list/revoke-এ অন্তর্ভুক্ত করতে হবে |
| A16 | scheduler আছে, কিছু scheduled HR activation web middleware-এও হয় | P0: native access-এ effective-date consistency; scheduler health ও request adapter verify |
| A17 | deploy workflow-এ production migration/rsync আছে, automated test stage নেই; deps `--no-dev` | P0: staging/isolated DB tests → deployment; mobile change production web-এ regression যেন না আনে |
| A18 | deploy README-তে `deploy/crontab.example` reference, file inventory-তে অনুপস্থিত | P1 ops: runbook বাস্তব file/config-এর সঙ্গে মেলাতে হবে |
| A19 | `AppServiceProvider` activity comments/handlers অনুযায়ী updates/deletes audit হয়; creates/login/logout recording নেই | P1: mobile audit event scope, sensitive-field redaction ও immutable actor context নির্ধারণ |
| A20 | section IDs/menu entries পুরোপুরি এক নয়; office-map public route কিন্তু registry-র module নয় | P1: authoritative module catalog, placeholder visibility ও public map navigation normalize |

## যাচাইয়ের ফল এবং সীমা

`evidence/php-syntax.csv`: **৮৩৮ pass, ০ syntax fail**। Interpreter PHP 8.4.14; deployed PHP 8.3 compatibility এই check প্রমাণ করে না। Blade rendering আলাদা।

`evidence/route-declarations.csv`: raw static declarations; inherited middleware/prefix resolved নয়। `route-task-coverage.csv` initial planning classification; legacy/unloaded/resource declarations-ও রাখা হয়েছে।

`evidence/backend-methods.csv`: ৩,৮৯৫ declared methods। `schema-operations.csv`: ৪৮৪ create/alter references। `test-inventory.csv`: declared test titles ও execution status। এগুলো complete call graph, database consistency report বা security audit নয়।

নিচের কাজগুলো open: runtime route list, realistic but anonymized DB fixture, full tests/build, cross-role access tests, migration rehearsal, security review, real devices, stakeholder workflow validation এবং current web-এর interactive visual review। এগুলোর আগে “পুরো প্রজেক্ট error-free” বলা যাবে না।

## পুনরায় যাচাই

```powershell
python scripts/audit_mobile_readiness.py
python scripts/build_mobile_plan.py --refresh-only
```

Runtime environment প্রস্তুত হলে শুধু isolated testing DB-তে: Composer install from lock; `npm ci`; `php artisan route:list --json`; `php artisan test`; `npm run types`; `npm run build`; ESLint-এর non-mutating invocation। `npm run lint` বর্তমানে `--fix` ব্যবহার করে, তাই read-only audit command হিসেবে সরাসরি ব্যবহার করা উচিত নয়।

Sensitive `data/` record files ও runtime storage-এর content প্রকাশ করা হয়নি; metadata/hash inventory রাখা হয়েছে। Binary XLS/XLSX/PPTX-এর business data কিংবা production logs semantic review হয়নি। এগুলো পরীক্ষা করতে sanitized fixtures ও import/report acceptance tests লাগবে।
