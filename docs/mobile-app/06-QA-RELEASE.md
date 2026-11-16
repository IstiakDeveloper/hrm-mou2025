# QA, quality gates ও release

কোনো gate “পাস” বলতে measurable evidence লাগবে। Manual “ঠিক আছে” যথেষ্ট নয়।

## Test layers

| Layer | কোথায় | কী প্রমাণ করে | কখন বাধ্যতামূলক |
| --- | --- | --- | --- |
| PHP unit/feature (Pest) | `tests/` | services, permissions, payroll/PF/loan math, workflows | প্রতি API PR; staging green before prod |
| API contract | OpenAPI + snapshot/consumer tests | request/response shape, error codes | `/api/v1` change |
| Flutter unit | `mobile/` | mappers, validators, state | feature PR |
| Flutter widget/golden | design_system + screens | layout/a11y basics | shell + money screens |
| Integration | device farm / local | login → punch → leave → approve | before pilot |
| Cross-role access | scripted personas | no data leakage across organogram | before any external pilot |
| Regression web | existing Pest + smoke | mobile API changes web ভাঙেনি | every backend PR |
| Security | checklist + optional pentest | auth, storage, exports, secrets | before store submit |
| Usability | moderated sessions | completion rate, severe issues | before UI freeze |
| Store / ops | checklists | listings, crash-free, rollback | release day |

## Persona matrix (minimum)

প্রতিটি persona-এ happy path + denied path:

1. Employee (field)
2. Employee (head office)
3. Branch account (PIN)
4. Branch Manager
5. Regional / Zonal Manager
6. Department Head
7. HR Admin
8. Accounts / payroll operator
9. Loan desk
10. Asset / inventory operator
11. Super Admin
12. Custom multi-role user

Denied-path examples: other branch employee PII, unposted payslip edit without grant, self-approve where forbidden, punch outside geofence, API call with revoked token, fine-locked user hitting non-recovery endpoint.

## Module acceptance packs

প্রতিটি pack-এর জন্য: given/when/then + evidence link (screenshot/video/log) + related task IDs।

| Pack ID | Must pass before |
| --- | --- |
| ACC-AUTH | pilot |
| ACC-ATTEND | pilot |
| ACC-LEAVE | pilot |
| ACC-MOVE-PENALTY | pilot |
| ACC-TASKS | pilot |
| ACC-NOTICES | pilot |
| ACC-EMP-ORG | limited admin pilot |
| ACC-HR-APPR-EXIT | HR pilot |
| ACC-LOAN | finance pilot |
| ACC-PAYROLL | finance pilot |
| ACC-PF-GRAT | finance pilot |
| ACC-ASSET | ops pilot |
| ACC-INV | ops pilot |
| ACC-DOCS | general pilot |
| ACC-ADMIN | admin pilot |
| ACC-REPORTS | before parity claim |
| ACC-A11Y | UI freeze |
| ACC-PERF | release candidate |
| ACC-SEC | store submit |

### ACC-ATTEND sample cases

1. Eligible inside fence → check-in receipt; second check-in rejected clearly।
2. Outside fence → no write; distance shown।
3. GPS off / coarse accuracy → actionable guidance।
4. Device daily lock → explanation + recovery path।
5. Network drop after submit → reconcile; no double punch।
6. Branch account cannot create personal staff punch।

### ACC-LOAN / PAYROLL / PF sample cases

1. Preview amounts match service within documented rounding।
2. Idempotent post does not double-collect।
3. Rollback/cancel paths leave ledger consistent।
4. Export scope ≤ list scope; NID/bank masked per policy।
5. Flutter never invents interest/tax/PF formulas।

## Quality gates (measurable targets)

Proposed release targets — measured results না হওয়া পর্যন্ত claim নয়:

| Gate | Target |
| --- | --- |
| Pest suite | 100% pass on staging PHP 8.3 for release branch |
| Flutter analyze | zero errors; lints policy-clean |
| Crash-free sessions (pilot) | ≥99.5% |
| Cold start to interactive home | ≤3s on agreed mid device (Wi-Fi) |
| Attendance punch API p95 | ≤1.5s server; full UX ≤5s including GPS settle policy |
| List first page | ≤1s p95 for typical scoped queries |
| Usability | ≥90% unassisted completion attendance/leave/task review; 0 critical wrong-approve |
| Accessibility | TalkBack/VoiceOver critical flows; 200% text no clipping; contrast review signed |
| Security | no high/critical open findings on auth/storage/export; secrets scan clean |
| Coverage | every route/screen/report CSV row = verified \| deferred-with-owner \| retired-with-evidence |

## Environments

| Env | Purpose |
| --- | --- |
| Local | developer; sanitized fixtures |
| Staging | shared QA; anonymized realistic data; push sandbox |
| Pilot | production-like or production with feature flag cohort |
| Production | store builds; force-update capable |

Never copy raw production NID/bank dumps to laptops।

## Pilot plan

1. **Wave A (internal):** 10–20 users — attendance, leave, notices, own payslip read।
2. **Wave B (managers):** approvals + movement + penalty path।
3. **Wave C (HR/Accounts):** selected lifecycle + one finance module with buddy support।
4. **Wave D (broad):** remaining modules after packs green।

Feedback triage: severity S0–S3; S0/S1 block rollout expand। Daily standup during pilot; written decision log।

## Store & distribution

- Android: Play internal → closed → production staged rollout (10% → 50% → 100%)।
- iOS: TestFlight → App Store phased release।
- Optional MDM/enterprise distribution if stakeholder requires shared tablets।
- Privacy policy URL, account deletion/support contacts, data-safety answers prepared।
- Versioning: `MAJOR.MINOR.PATCH+build`; bootstrap `min_supported_version` force update。

## Monitoring & rollback

Monitor: API error rate, 401/423 spikes, punch failures, queue lag, crashlytics, slow queries।

Rollback:

1. Feature-flag disable module on bootstrap।
2. Force-update to last known good store build if client bug।
3. API route kill-switch / traffic back to web-only for affected domain।
4. DB migrate rollback only with rehearsed plan — never improvise on money tables।

## Release sign-off checklist

- [ ] P01 discovery gates complete
- [ ] P0 tasks (auth, shell, attendance, leave, movement/penalty, inbox) `[x]` with evidence
- [ ] ACC packs for pilot scope green
- [ ] Security gate signed
- [ ] Usability severe issues closed
- [ ] Store assets + legal pages live
- [ ] On-call + runbook ready
- [ ] `05-TASK-CHECKLIST.md` progress snapshot updated
- [ ] `07-DELIVERY-DECISIONS.md` go/no-go recorded
