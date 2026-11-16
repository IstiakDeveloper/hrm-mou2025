# Feature coverage ও mobile scope

এখানে **Existing** মানে source-এ implementation পাওয়া গেছে; runtime verified নয়। **Proposed** মানে mobile implementation-এ নতুন কাজ। **Placeholder** মানে নাম আছে, পূর্ণ workflow পাওয়া যায়নি। Release ভাগ শুধু delivery order; full-parity backlog থেকে কোনো existing capability বাদ দেওয়া হচ্ছে না।

## ব্যবহারকারী ও data scope

| Persona/context | Mobile কাজ | Boundary |
| --- | --- | --- |
| Employee | own profile, attendance, leave, movement, notices, own loans/PF/gratuity/payslips/assets | employee-linked data only, applicable section restrictions |
| Branch account | branch/PIN login ও অনুমোদিত branch operations | staff identity সেজে personal punch/নিজের signature নয় |
| Branch Manager | assigned branch staff, approvals, operational tasks | own/assigned branch; workflow actor eligibility |
| Regional/Zonal Manager | assigned region/zone overview, review chains | organogram branch set, current effective assignment |
| Department Head | head-office department staff ও appropriate review | existing payroll/loan/staff-fund denial rules অপরিবর্তিত characterization baseline |
| Director/Executive Director | assigned review stages ও final decisions | title দেখেই mobile অনুমতি বানাবে না; server action capability |
| HR/Admin | HR setup, employee lifecycle, document/notice operations | catalog permissions + object scope + section lock |
| Accountant/Accounts | payroll, loans, fund, asset/inventory যেটুকু existing grants | account role বা UI mode মানে universal access নয় |
| Super Admin | existing system administration ও exceptional actions | business validation, audit, fresh confirmation still apply |
| Custom/multi-role user | grants অনুযায়ী combined home/actions | single role + role pivot + explicit denials/section blocks reconcile |

Persona UI preset permission নয়। Server bootstrap ও প্রত্যেক resource-এর `allowed_actions` সিদ্ধান্ত দেবে। No employee linked, inactive user, transferred user, expired signature, blocked section, stale permission—সবগুলোর আলাদা UX থাকবে।

## Business capability register

Task ID-এর প্রথম অংশ `05-TASK-CHECKLIST.md`-এর phase নির্দেশ করে। Generated route/screen mapping-এ নির্দিষ্ট primary task ID আছে; API, QA ও UX cross-cutting dependencies-ও প্রযোজ্য।

| Scope | সম্পূর্ণ mobile capability | Evidence / task group |
| --- | --- | --- |
| Authentication | staff username/email login; branch chooser/PIN; logout/current/all-device revoke; inactive/revoked state; password update; recovery flow | `AuthController`, `routes/auth.php` load gap; P03/P04 |
| App shell | splash/bootstrap; user/context; authorized module hub; role-aware home; search; notifications; settings; account switch; app version/maintenance | core routes/layouts/dashboard; P04 |
| My profile | permitted personal/contact edits, avatar/signature upload/delete, password, language/theme, linked employee summary | both profile/settings controller variants; P05 |
| Employee directory | scoped search/multi-filter/sort/pagination, detail, status, create/edit/delete, complete forms | Employee/Lookup controllers, repeated tab normalization; P05 |
| Employee records | personal/identity, permanent/present Bangladesh address, employment/posting, education, experience/job history, nominees/guarantors, banks, salary assignment, discipline, photo/signature/docs | model + form + controller validation reconciliation; P05 |
| Employee tools | PIN suggestions, village/union additions, salary assignment preview, scoped dashboard, blank form, XLSX selectable columns, import example/preview/review/commit/errors | employees routes/export/import helpers; P05 |
| Organization | branch details/status/geofence/PIN controls, regional offices/zones, departments/designations, employee types, programs/projects, organization structure/manager reassignment/organogram | organization routes + configs; P05 |
| Attendance self | geofence eligibility/status, fresh GPS samples/accuracy, branch matched on server, check-in/out receipt and history, shared-device daily lock explanation | SelfAttendance/GeoFence/DeviceLock services; P06 |
| Attendance operations | daily/monthly, branch summary, create/edit/delete, bulk preview/store, biometric mapping, sync and sync report, device config/test/flags, branch/employee timing | attendance routes; P06 |
| Attendance rules | Friday/Saturday config, office-open exceptions, holidays, auto attendance, overnight guard shifts, multi-branch/project eligibility, multi-day movement-derived attendance | GuardShift/MultiBranch/Attendance services & tests; P06 |
| Leave | own/team applications, type/balance display, dates/day count/reasons/contact/attachments as current form, eligibility/auto-approve preview, submission, approval/rejection/cancel, official PDF | Leave controllers, approval tiers; P07 |
| Leave admin | types, balances/manual allocations, bulk default allocation/year reset, tier config, scoped report/employee leave records | leave routes; P07 |
| Movement | personal/official, from/to/place/time/reason, create/edit/delete/bulk-delete, approval/reject/cancel, actual return/complete, multi-day overlap/calendar | Movement controller/services/tests; P08 |
| Movement log book | per-trip travel/odometer/distance/rate as form supports, editable records, payment processing, recommendation/approval/reject, voucher, history/export | LogBook/payment workflow; P08 |
| Penalty | overdue penalty amount/status, access lock, transaction/reference submission, pending/rejected reason/resubmit, admin verification/sync/bulk | EnsureMovementFinePaid & penalty controller; P08 |
| HR actions | transfer single/bulk, confirmation, promotion, demotion, redesignation, separation, salary increment with active action set per resource | lifecycle routes and completion services; P09 |
| HR timing/rollback | approval vs completion, scheduled effective dates, linked employee/salary/assignment change, cancel/reject, promotion/increment rollback where implemented | ScheduledHrActivation/rollback services; P09 |
| Evaluation | promotion, confirmation, probation increment, trainee; dynamic form variants, rubrics/scores, drafts/revision, reviewer comments/signatures/visibility, print | four evaluation flows; P10 |
| Evaluation actions | forward/send-back, HR verify, ED approval, authorized quick approval, reset workflow, signature-comment correction history | existing controllers/workflow services; P10 |
| Resignation | applicant/draft/form, head-office vs field chain, per-role entry stage, forward/send-back, ED approval, comment corrections, official print | Resignation workflow; P10 |
| Final clearance | eligible inactive employee search, snapshot/account/asset/HR checks, submit/forward/send-back/approve/reject, signatures/correction, print, delete safeguards | FinalClearance/visibility/settlement; P10 |
| Own loan | summary/register/detail/ledger/installments; PF eligibility/apply; Motorcycle eligibility/preview/apply/recommendation/send-back | self-service core routes; P11 |
| Loan operations | loan policies/committees, applications/preview/edit, approval/reject/disburse/cancel, generic loan register/ledger terms/recalculate, second Motorcycle flow | loan routes + specialized services; P11 |
| Loan accounting | single/batch/advance collection, waiver/rebate preview, full-paid preview/post, transaction correction/delete, cancel/restore/rollback, branch transfer, migration preview/review/edit/recalculate/rollback | collection/rebate/migration/transfer services; P11 |
| Own payroll | posted payslip list/detail/PDF, gross/deductions/net breakdown, month/year filter | EmployeePayroll controller; P12 |
| Payroll setup | payscales/grades/steps/heads, status, manual structures, employee overrides/reset, branch bank mapping, tax config/source, fixed/probation salary | payroll routes/services; P12 |
| Payroll operations | withholding, head modifications, salary process/preview, editable processed payslips, period/run post/cancel/recall, rollback, arrear/increment links | calculation/post/rollback services; P12 |
| Bonus | types/configurations/calculation/processed runs/edit/post/cancel; bonus bank advice/report | Bonus controllers/services; P12 |
| Provident fund | own and admin ledgers, employee/employer balances, opening/manual/correction/delete, summary, branch account transfer, withdrawal, interest preview/post/rollback, equalization/reconciliation visibility | PF services/routes/tests; P13 |
| Gratuity | own entitlement/ledger, configured rules, admin eligibility/projection, payments/settlement history | EmployeeGratuity/GratuityReport; P13 |
| Final settlement | inactive lookup, generation/refresh, final-clearance relation, mark-paid, financial statement and print | FinalPaymentSettlement/SeparationPayroll; P13 |
| My assets | own assignments/detail and existing release status | EmployeeAsset controller; P14 |
| Asset setup | fiscal years/activate, vendors, categories/subcategories, custodian departments/designations/custodians/change | asset settings/custodian routes; P14 |
| Asset lifecycle | purchase create/edit/show/history, register CRUD/import preview/commit, tag/manual code/tracking, assignment/release, insurance/warranty/guarantee, not-in-use/restore | assets/services; P14 |
| Asset finance | stock by category/branch, maintenance, revaluation, depreciation schedule/calculation/post/manual/rollback | asset stock/financial services; P14 |
| Asset transfer/disposal | branch/project/custodian transfer/history, disposal reasons/request/reject/approve/dispose/batch/register | asset transfer/disposal services; P14 |
| Inventory | products incl quick add, scoped stock, stock-in/disburse, recipient search/create, movement correction/delete, stock check | stock/ledger/scope services; P15 |
| Document Center | list/category/search/pin, preview/download, allowed upload, category management, restricted edit/delete/pin | Document controller distinctions; P16 |
| Notices/inbox | received notices/read-all/detail/attachments; paged notifications/count/read; admin creation/audience/delivery | MyNotice/AdminNotice/Notification; P16 |
| Office map | public approved office locations, search/filter/hierarchy/cluster/list/details/contact/directions, denied GPS/offline states | OfficeMapLocations/map components; P16 |
| Administration | users CRUD/status/branch sync; roles CRUD/grants/section locks/default sync/line role sync; web+mobile sessions/revoke; audit filter; existing bulk-email composition/send | admin routes, role/session services; P17 |
| Reports | all configured report keys plus HR/attendance/movement/leave/transfer/administration/inventory reports; filters, totals, generated PDF/XLSX/CSV matching current supported formats | report config/support/views, `report-catalog.csv`; P18 |
| Shared integrations | ZKTeco sync/device employee push/PIN mappings, ADMS endpoints, MisLoan org/officer sync, configured SSO entry, queue/scheduler/report rendering | API routes and services remain backend responsibilities; P03/P19 |

## অপরিবর্তনীয় business rules

1. Salary, loan interest/rebate/installment, PF, tax ও gratuity-এর authoritative calculation Laravel services-এ। Flutter কেবল server preview দেখাবে; final amount client থেকে trusted হবে না। Amount decimal string/minor units policy অনুযায়ী, binary floating point নয়।
2. Source config-এ PF self-service confirmation থেকে ২ বছর ও current balance-এর ৯০% cap, Motorcycle cap ১.৫/২ লাখ, PF contribution defaults ১০%/১০%, gratuity tiers ও km rate আছে। এগুলো **code defaults**, live policy/আইনের নিশ্চয়তা নয়। Bootstrap/preview থেকে effective values আনতে হবে; Flutter-এ hardcode নয়।
3. Field ও head-office workflow-এর chain, skip rules, actor, নিজের আবেদন নিজে approve নিষেধ যেখানে আছে, signature visibility ও sent-back behavior current services থেকে নির্ধারিত হবে। একটি universal `pending → approved` chain বানানো যাবে না।
4. Section visible থাকলেই data access নয়। Full permission + account + organogram/object ownership + workflow capability প্রতিটি read/write/export-এ enforce করতে হবে। Current payroll deny rules ও custom role grant অক্ষুণ্ণ রাখতে হবে।
5. Effective date, fiscal year, shift boundary, weekend ও cutoff server Bangladesh time অনুযায়ী। UI human-readable local date দেখাবে; date-only ও timestamp আলাদা contract।
6. Attendance, approval, financial posting, collection এবং stock movement online commit ছাড়া successful দেখাবে না। Lost response হলে operation status reconcile; blind retry নয়।
7. “Mark paid” বা penalty transaction submission বর্তমান manual verification flow। bKash/Nagad/payment gateway integration পাওয়া যায়নি; payment gateway নতুন scope, existing বলে দেখানো যাবে না।
8. Export/download-এ list-এর মতোই scope এবং sensitive-field masking থাকতে হবে। Web public files বা integration hash payload mobile data model-এ কপি করা যাবে না।

## Existing বনাম নতুন প্রস্তাব

| New proposal | কারণ / boundary |
| --- | --- |
| Unified Action Inbox | Leave, movement, log-book payments, evaluations, resignation, loan recommendation, clearance-এর actionable item এক জায়গায়; server scoped aggregation |
| Native biometric app unlock | stored device session ব্যবহার; fingerprint/Face ID password বা server approval-এর বিকল্প নয় |
| Offline cache/local drafts | bounded own/allowed summaries ও forms; signed/financial/GPS actions offline নয় |
| Native FCM/APNs ও deep links | browser web-push subscription reuse করা যায় না; sensitive body optional/redacted |
| QR/barcode scan | asset identifier input-এর optional enhancement; manual search সবসময় থাকবে; existing feature ধরে নয় |
| Operational job status | bulk import/report/process-এ resumable progress UI; background server job contract লাগবে |
| Training/Store/Recruitment discovery | dedicated backend/screens না থাকায় empty menu দিয়ে complete বলা নয়; define অথবা documented future backlog |

## Coverage বন্ধ করার নিয়ম

প্রতিটি `route-task-coverage.csv` row-তে source file/line, primary task, mobile treatment ও verification note আছে। Resource declarations runtime-এ expand করে child endpoints যোগ করতে হবে। Alias/redirect/resource helper-কে আলাদা mobile screen না বানালে canonical destination লিখতে হবে।

`screen-task-coverage.csv` প্রতিটি `pages/` file-এর migration disposition রাখে। Form config/print components এবং unreachable legacy pages বাদ নয়—সংশ্লিষ্ট native component, server official document বা retirement evidence-এর সঙ্গে যুক্ত হবে। `report-catalog.csv` প্রতিটি configured report-এর title/filter/template ধারণ করে; দুই inventory report ও non-configured HR reports-ও আছে।

Coverage status প্রথমে **mapped; runtime verification pending**। Functional/mobile acceptance evidence না পাওয়া পর্যন্ত “feature parity complete” নয়। New route/screen/report যোগ হলে register update বাধ্যতামূলক।
