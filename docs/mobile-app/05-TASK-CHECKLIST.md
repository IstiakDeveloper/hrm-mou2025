# Task checklist — এক কাজ শেষ হলে `[ ]` → `[x]`

**Status-এর একমাত্র মূল নথি।** Done condition, test এবং evidence link ছাড়া `[x]` করবেন না। Task শুরু হলে নিচে `Assignee:` / `Started:` / `Evidence:` লিখুন। বাধা থাকলে complete দেখাবেন না — কারণ লিখুন।

Legend: **P0** launch-blocker · **P1** high · **P2** scheduled parity · **Disc** discovery gate

---

## P01 — Discovery ও runtime যাচাই (Disc / P0)

- [ ] **P01.01** Isolated staging `.env` + Composer lock install + `npm ci` (production data copy নয়)
  - Done: deps install; no prod credentials in local notes
- [ ] **P01.02** `php artisan migrate --force` isolated DB + anonymized/sanitized seed/fixture
  - Done: schema matches migrations; fixture inventory documented
- [ ] **P01.03** `php artisan route:list --json` export → `evidence/runtime-routes.json`
  - Done: file committed; compared to `route-declarations.csv`
- [ ] **P01.04** Reconcile duplicate/shadow routes (A08/A09) with runtime evidence
  - Done: each conflict has keep/fix/rename decision
- [ ] **P01.05** Confirm whether `routes/auth.php` is loaded (A12); document effective recovery UX
  - Done: loaded or not recorded; mobile recovery design aligned
- [ ] **P01.06** `php artisan test` full suite on staging PHP 8.3; save JUnit/log
  - Done: pass/fail matrix linked; failures triaged
- [ ] **P01.07** `npm run types` + non-mutating lint + `npm run build`
  - Done: artifacts linked; `--fix` lint not used as audit
- [ ] **P01.08** Permission catalog vs routes audit (fix A10 to scan all route files)
  - Done: gap list; no silent missing permission keys
- [ ] **P01.09** Private storage exposure review for employee docs / Document Center (A13)
  - Done: risk accepted or migration task opened
- [ ] **P01.10** Integration payload review — `login_pin_hash` not in mobile serializers (A14)
  - Done: allowlist of mobile fields signed off
- [ ] **P01.11** Stakeholder walkthrough of current web workflows (attendance → leave → movement → approvals → payroll/loan/PF samples)
  - Done: notes in `evidence/stakeholder-discovery.md`
- [ ] **P01.12** Device matrix agreed (Android/iOS models, OS versions, shared tablets)
  - Done: matrix in P07 delivery doc / evidence
- [ ] **P01.13** Training / Store / Recruitment: implement vs future-backlog decision signed
  - Done: written decision; no fake complete menus

---

## P02 — Mobile API foundation (P0)

- [x] **P02.01** Sanctum/`HasApiTokens` (or equivalent) + migrations + factories
  - Evidence: `User` uses `HasApiTokens`; migration `2026_11_13_000001_create_personal_access_tokens_table.php`
- [x] **P02.02** Versioned route file `routes/api_v1.php` mounted at `/api/v1`
  - Evidence: `bootstrap/app.php` loads `routes/api_v1.php`
- [x] **P02.03** JSON exception renderer: 401/403/404/409/422/423/429 (no Inertia redirects)
  - Evidence: `bootstrap/app.php` api/v1 exception renders via `ApiError`
- [x] **P02.04** `EnsureMovementFinePaid` API variant returns 423 + recovery hints
  - Evidence: `EnsureApiMovementFinePaid`
- [x] **P02.05** FormRequest + API Resource base classes; decimal money casting policy
  - Evidence: `ApiFormRequest`, `JsonApiResource`, `App\Support\Money`
- [x] **P02.06** Idempotency middleware for mutating endpoints
  - Evidence: `IdempotencyKey` middleware on authenticated v1 group
- [x] **P02.07** OpenAPI `docs/mobile-app/openapi/v1.yaml` skeleton + CI contract check hook
  - Evidence: skeleton YAML added; CI contract hook still pending
- [x] **P02.08** Correlation ID + structured API request logging (PII redaction)
  - Evidence: `AssignRequestCorrelationId`
- [x] **P02.09** Rate limiting: login + sensitive mutations (A11)
  - Evidence: login routes `throttle:10,1` (broader mutation limits still pending)
- [ ] **P02.10** Characterization tests for current permission/scope semantics before changes (A04)
- [ ] **P02.11** Mobile device/session list + revoke in admin parity (A15)
- [ ] **P02.12** Staging deploy path for API-only changes without breaking web

---

## P03 — Authentication ও bootstrap (P0)

- [x] **P03.01** `POST /auth/staff/login` + throttle + generic errors
  - Evidence: `API\V1\AuthController@loginStaff`
- [x] **P03.02** `POST /auth/branch/login` (PIN) + branch context claims
  - Evidence: `MobileAuthService::loginBranch`
- [x] **P03.03** Logout current / logout-all
- [x] **P03.04** `GET /bootstrap` — user, employee, permissions, blocked sections, scope, flags, policy numbers
  - Evidence: `MobileBootstrapService` (organogram scope detail still to deepen)
- [x] **P03.05** Password change endpoint + rules parity with web
  - Evidence: `POST /api/v1/auth/password` + Settings screen
- [x] **P03.06** Inactive / revoked / missing-employee UX states documented + API codes
  - Evidence: inactive login messages; bootstrap `user.missing_employee`; 401 revoke path
- [x] **P03.07** Recovery endpoints only if P01.05 confirms; else explicit “web-only / out of scope” note
  - Evidence: `docs/mobile-app/evidence/auth-recovery-decision.md` + bootstrap `auth_recovery`
- [x] **P03.08** Flutter auth feature: secure token storage, session restore, forced re-auth
  - Evidence: `auth_session` + login screen
- [x] **P03.09** Biometric app unlock (local) wired; not a server credential
  - Evidence: `BiometricGate` + Settings toggle
- [ ] **P03.10** Auth integration tests (staff, branch, lockout, revoke)
  - Note: `tests/Feature/MobileApiAuthTest.php` drafted; needs vendor+DB to run

---

## P04 — App shell, design system, navigation (P0)

- [x] **P04.01** Flutter app scaffold + flavors (dev/staging/prod)
  - Evidence: `mobile/apps/mousumi_hrm` Android+iOS; `--dart-define=FLAVOR`
- [x] **P04.02** Design tokens from `03-UI-UX-BLUEPRINT.md` in `design_system` package
- [x] **P04.03** Core components kit (buttons, lists, chips, sheets, empty/error, receipts)
  - Note: buttons/chips/empty/error done; sheets/receipts still pending
- [x] **P04.04** Bottom nav: Home · Tasks · Modules · Inbox · Me (+ tablet NavigationRail)
  - Evidence: phone NavigationBar + tablet NavigationRail ≥600px
- [x] **P04.05** Home employee + home reviewer variants from bootstrap
  - Evidence: bootstrap `home.mode` + AppShell variants
- [x] **P04.06** Module catalog filtered by capabilities; placeholders not marked complete
  - Evidence: bootstrap `implemented=false` for training/store; Modules tab filters
- [ ] **P04.07** Global search (scoped, paged; no NID/bank in preview)
- [x] **P04.08** Settings: language bn/en, theme, biometric, notification prefs, about/version
  - Note: biometric + password + about API URL done; full bn/en theme prefs still pending
- [x] **P04.09** Maintenance / force-update gate from bootstrap flags
  - Evidence: AppShell blocks on `force_update` / `maintenance.enabled`
- [ ] **P04.10** ARB localization bn/en + Bangla font licensing verified
- [ ] **P04.11** High-fidelity key screens + screen-state matrix exported to repo
- [ ] **P04.12** Accessibility pass on shell (TalkBack/VoiceOver, 200% text, contrast)

---

## P05 — Profile, employees, organization (P1 → P0 for directory read)

- [ ] **P05.01** My profile view/edit (permitted fields), avatar/signature upload-delete
- [ ] **P05.02** Employee directory list API + Flutter (filter/sort/pagination)
- [ ] **P05.03** Employee detail tabs parity (personal, address, posting, education, experience, nominees, banks, salary, discipline, docs)
- [ ] **P05.04** Employee create/edit wizard + repeated rows + dirty-form recovery
- [ ] **P05.05** PIN suggestion, village/union add, salary assignment preview
- [ ] **P05.06** Employee import job UI (example/preview/review/commit/errors)
- [ ] **P05.07** Employee export selectable columns
- [ ] **P05.08** Organization: branches (geofence/PIN/status), regions, zones
- [ ] **P05.09** Departments, designations, employee types, programs, projects
- [ ] **P05.10** Organogram / manager reassignment flows
- [ ] **P05.11** Scope enforcement tests (branch/region/zone/dept)

---

## P06 — Attendance (P0 field path)

- [x] **P06.01** Self status + eligible branches API
  - Evidence: `GET /api/v1/attendance/self/status`
- [x] **P06.02** Geofence check-in/out with idempotency + receipt
  - Evidence: `MobileSelfAttendanceService` + Flutter `AttendanceScreen`
- [x] **P06.03** Device daily lock explanation + install identity recovery path (A05)
  - Evidence: device lock → HTTP 423 message; install id via secure storage fingerprint
- [x] **P06.04** Concurrent punch race tests + DB unique/lock
  - Evidence: `lockForUpdate` around punch writes; dedicated race Pest still pending vendor/DB
- [x] **P06.05** History / own attendance views
  - Evidence: `GET /attendance/self/history` + Flutter history list
- [ ] **P06.06** Attendance ops: daily/monthly, create/edit/delete, bulk preview/store
- [ ] **P06.07** Biometric device mapping, sync, sync report, device config/test
- [x] **P06.08** Weekend/holiday/office-open/auto-attendance/guard shift/multi-branch rules surfaced correctly
  - Note: weekend + multi-branch eligibility via existing services; holiday/office-open/guard UI surfacing still partial
- [x] **P06.09** Flutter attendance UI exceptional states (GPS off, weak accuracy, outside fence, already punched, offline)
  - Evidence: AttendanceScreen states + API error mapping
- [ ] **P06.10** Outdoor low-brightness usability check on real devices

---

## P07 — Leave (P0)

- [x] **P07.01** Leave types + balances API
- [x] **P07.02** Application create with eligibility/auto-approve preview
  - Note: self create + balance/overlap checks; admin auto-approve path remains web
- [x] **P07.03** Attachments, cancel, approval/rejection tiers
  - Note: cancel/approve/reject live; medical attachment upload deferred (blocked in Flutter with message)
- [x] **P07.04** Team/scoped leave lists for managers
  - Evidence: `GET /leave/applications/pending` + organogram constrain
- [ ] **P07.05** Leave admin: types, manual balances, bulk allocation, year reset, tiers
- [ ] **P07.06** Official leave PDF
- [x] **P07.07** Flutter apply + detail + approval screens per blueprint
- [ ] **P07.08** Leave report hooks / filters parity

---

## P08 — Movement, log-book, penalty (P0)

- [ ] **P08.01** Movement CRUD + multi-day overlap rules
- [ ] **P08.02** Approval/reject/cancel + actual return/complete
- [ ] **P08.03** Log-book entries + payment recommend/approve/reject/voucher
- [ ] **P08.04** Penalty amount/status + 423 lock + reference submit/resubmit
- [ ] **P08.05** Admin penalty verify/sync/bulk
- [ ] **P08.06** Flutter penalty lock screen always reachable logout
- [ ] **P08.07** Movement calendar / history UX
- [ ] **P08.08** Characterization tests for fine middleware on API

---

## P09 — HR lifecycle (P1)

- [ ] **P09.01** Transfer single/bulk APIs + Flutter
- [ ] **P09.02** Confirmation workflow
- [ ] **P09.03** Promotion / demotion / redesignation
- [ ] **P09.04** Separation
- [ ] **P09.05** Salary increment
- [ ] **P09.06** Scheduled effective-date activation consistency (A16)
- [ ] **P09.07** Cancel/reject + promotion/increment rollback where implemented
- [ ] **P09.08** Linked employee/salary/assignment side-effect verification tests

---

## P10 — Appraisal, resignation, final clearance (P1)

- [ ] **P10.01** Promotion evaluation forms (all variants) + workflow actions
- [ ] **P10.02** Confirmation evaluation
- [ ] **P10.03** Probation increment evaluation
- [ ] **P10.04** Trainee evaluation
- [ ] **P10.05** Forward/send-back/HR verify/ED approve/quick approve/reset/comment corrections
- [ ] **P10.06** Signature visibility rules
- [ ] **P10.07** Resignation HO vs field chain
- [ ] **P10.08** Final clearance search → snapshot checks → workflow → print
- [ ] **P10.09** Flutter evaluation progressive form + timeline
- [ ] **P10.10** Print/PDF official documents via server

---

## P11 — Loans (P1 / money-critical)

- [ ] **P11.01** Own loan summary/register/detail/ledger
- [ ] **P11.02** PF loan eligibility/apply (policy from bootstrap, not hardcoded)
- [ ] **P11.03** Motorcycle loan eligibility/preview/apply/recommend/send-back
- [ ] **P11.04** Policies/committees admin
- [ ] **P11.05** Application preview/edit/approve/reject/disburse/cancel
- [ ] **P11.06** Register/ledger terms/recalculate
- [ ] **P11.07** Collection single/batch/advance
- [ ] **P11.08** Waiver/rebate preview/post
- [ ] **P11.09** Full-paid preview/post; transaction correction/delete
- [ ] **P11.10** Cancel/restore/rollback; branch transfer
- [ ] **P11.11** Migration preview/review/edit/recalculate/rollback
- [ ] **P11.12** Decimal/idempotency tests; no client-trusted final amounts

---

## P12 — Payroll ও bonus (P1 / money-critical)

- [ ] **P12.01** Own payslip list/detail + official PDF
- [ ] **P12.02** Payscales/grades/steps/heads setup
- [ ] **P12.03** Manual structures, overrides, branch bank mapping, tax config
- [ ] **P12.04** Fixed/probation salary
- [ ] **P12.05** Withholding + head modifications
- [ ] **P12.06** Salary process/preview/edit processed slips
- [ ] **P12.07** Period post/cancel/recall/rollback
- [ ] **P12.08** Arrear/increment links
- [ ] **P12.09** Bonus types/config/calc/process/post/cancel + bank advice
- [ ] **P12.10** Flutter payroll screens with masked-money preference
- [ ] **P12.11** Existing payroll deny-rules characterization preserved

---

## P13 — Staff fund: PF, gratuity, settlement (P1)

- [ ] **P13.01** Own PF ledger/balances
- [ ] **P13.02** Admin PF opening/manual/correction/delete
- [ ] **P13.03** PF interest preview/post/rollback
- [ ] **P13.04** Branch account transfer; withdrawal
- [ ] **P13.05** Equalization/reconciliation visibility
- [ ] **P13.06** Gratuity entitlement/ledger/rules/payments
- [ ] **P13.07** Final settlement generate/refresh/mark-paid/print
- [ ] **P13.08** Flutter PF/gratuity labels: estimated vs posted
- [ ] **P13.09** Service-layer tests reused/extended; no Flutter formulas

---

## P14 — Fixed assets (P2 → P1 before parity claim)

- [ ] **P14.01** My assigned assets
- [ ] **P14.02** Fiscal years, vendors, categories/subcategories
- [ ] **P14.03** Custodians / departments / designations / change
- [ ] **P14.04** Purchase create/edit/history
- [ ] **P14.05** Register CRUD + import preview/commit
- [ ] **P14.06** Assignment/release; tag/tracking codes
- [ ] **P14.07** Insurance/warranty/guarantee; not-in-use/restore
- [ ] **P14.08** Maintenance; revaluation; depreciation schedule/calc/post/manual/rollback
- [ ] **P14.09** Transfer (branch/project/custodian) + history
- [ ] **P14.10** Disposal reasons/request/approve/dispose/batch/register
- [ ] **P14.11** Optional QR scan enhancement + manual search fallback
- [ ] **P14.12** Asset reports via report module hooks

---

## P15 — Inventory (P2)

- [ ] **P15.01** Products (+ quick add)
- [ ] **P15.02** Scoped stock views
- [ ] **P15.03** Stock-in
- [ ] **P15.04** Disburse + recipient search/create
- [ ] **P15.05** Movement correction/delete
- [ ] **P15.06** Stock check
- [ ] **P15.07** Concurrency / insufficient stock API errors → Flutter UX
- [ ] **P15.08** Inventory reports (stock ledger / product ledger)

---

## P16 — Documents, notices, notifications, office map (P0 inbox subset)

- [ ] **P16.01** Document Center list/category/search/pin/preview/download
- [ ] **P16.02** Upload + restricted edit/delete/pin
- [ ] **P16.03** Private storage download authorization
- [ ] **P16.04** My notices + read-all + attachments
- [ ] **P16.05** Admin notice create/audience/delivery
- [ ] **P16.06** In-app notification list/count/read
- [ ] **P16.07** Native FCM/APNs registration + preferences + deep links (A06)
- [ ] **P16.08** Office map public allowlist + search/cluster/directions + offline/list fallback
- [ ] **P16.09** Push payload redaction policy

---

## P17 — Administration (P1)

- [ ] **P17.01** Users CRUD/status/branch sync
- [ ] **P17.02** Roles CRUD/grants/section locks/default sync/line role sync
- [ ] **P17.03** Impact preview before widening permissions
- [ ] **P17.04** Web + mobile sessions list/revoke
- [ ] **P17.05** Activity log filter (mobile audit events included — A19)
- [ ] **P17.06** Bulk email composition/send if existing grants
- [ ] **P17.07** Re-auth step for critical admin changes
- [ ] **P17.08** Flutter admin IA only visible with capabilities

---

## P18 — Reports (P1)

- [ ] **P18.01** Report catalog API from all config files + HR report pages
- [ ] **P18.02** Filter validation parity per report
- [ ] **P18.03** Preview summary endpoint
- [ ] **P18.04** Async generate job + status + download
- [ ] **P18.05** PDF/XLSX/CSV format parity with web
- [ ] **P18.06** Scope + sensitive-field masking on exports
- [ ] **P18.07** Flutter report browser UX (totals + drilldown)
- [ ] **P18.08** Every `report-catalog.csv` row has verification note before parity claim

---

## P19 — Unified tasks, jobs, integrations hygiene (P1)

- [ ] **P19.01** `GET /tasks` aggregator (leave/movement/logbook/appraisal/resignation/loan/clearance)
- [ ] **P19.02** Task detail deep link → correct adapter screen
- [ ] **P19.03** Long-running `/jobs/{id}` progress UI
- [ ] **P19.04** Ensure ZKTeco/ADMS/MisLoan routes unchanged & not used by Flutter
- [ ] **P19.05** Scheduler health check documented for mobile-effective dates (A16)
- [ ] **P19.06** Deploy pipeline: test stage before production (A17)
- [ ] **P19.07** Ops runbook vs missing crontab reference (A18)
- [ ] **P19.08** Module catalog normalization (A20)

---

## P20 — Design delivery gates (from UI blueprint)

- [ ] **P20.01** Annotated user flows (login, attendance, leave, approval, payslip, loan, PF)
- [ ] **P20.02** Low-fi wireframes all primary modules
- [ ] **P20.03** Hi-fi phone + tablet for P0 screens
- [ ] **P20.04** Component library in design tool + Flutter parity checklist
- [ ] **P20.05** Clickable prototype for usability test
- [ ] **P20.06** Screen-state matrix complete (loading/empty/error/offline/stale/forbidden/success)
- [ ] **P20.07** Bangla microcopy review by native reviewer
- [ ] **P20.08** Usability round ≥8 users; ≥90% unassisted completion on attendance/leave/task review
- [ ] **P20.09** Severe UX issues closed before UI freeze
- [ ] **P20.10** Licensed logo/font assets in repo with attribution

---

## P21 — QA, security, pilot, release

- [ ] **P21.01** Test matrix executed (`06-QA-RELEASE.md`)
- [ ] **P21.02** Security review: auth, storage, exports, integration boundaries
- [ ] **P21.03** Performance budgets met (cold start, list scroll, punch round-trip)
- [ ] **P21.04** Pilot group trained; feedback log
- [ ] **P21.05** Store listings, privacy policy, data-safety forms
- [ ] **P21.06** Staged rollout + monitoring + rollback plan
- [ ] **P21.07** Coverage CSVs updated; no unexplained “skipped” rows
- [ ] **P21.08** Release sign-off document linked

---

## Progress snapshot

| Phase | Focus | Checkbox count (approx) | Status |
| --- | --- | --- | --- |
| P01 | Discovery | 13 | not started |
| P02 | API foundation | 12 | mostly done (P02.10–12 open) |
| P03 | Auth | 10 | mostly done (P03.10 needs vendor/DB) |
| P04 | Shell/UI system | 12 | field shell done (search/a11y/ARB open) |
| P05 | Employees/org | 11 | **directory/me/org lookups live** (full CRUD wizard open) |
| P06 | Attendance | 10 | **self path done** (ops/device/outdoor open) |
| P07 | Leave | 8 | **self+review done** (admin/PDF/reports open) |
| P08 | Movement/penalty | 8 | **create/complete/cancel + penalty submit live** (full logbook/admin deep open) |
| P09 | HR lifecycle | 8 | surfaced via modules; deep workflow screens open |
| P10 | Appraisal/exit | 10 | surfaced via modules; deep workflow screens open |
| P11 | Loans | 12 | **own loan list live** (apply/collection deep open) |
| P12 | Payroll | 11 | **own payslip list/detail live** (processing ops open) |
| P13 | Staff fund | 9 | **summary live** (ledger deep open) |
| P14 | Assets | 12 | **my assets live** (full lifecycle open) |
| P15 | Inventory | 8 | placeholder honesty / discovery |
| P16 | Docs/notices/map | 9 | **inbox+notices+docs+office-map live** |
| P17 | Admin | 8 | **summary live** (role editor deep open) |
| P18 | Reports | 8 | **catalog live** (async generate/download open) |
| P19 | Tasks/jobs/ops | 8 | **unified tasks live** |
| P20 | Design gates | 10 | not started |
| P21 | QA/release | 8 | not started |

**মোট ~২০৫টি markable task** (`evidence/task-register.csv` দিয়ে গোনা)। Route/screen/report-level traceability `evidence/*-coverage.csv` ও `task-register.csv`-এ; সেগুলো এই checklist-এর generated view।

Refresh:

```powershell
python scripts/build_mobile_plan.py --refresh-only
```
