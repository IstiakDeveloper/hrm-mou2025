# Delivery order, টিম, সময় ও সিদ্ধান্ত

এই নথি পরিকল্পনার বাস্তবায়ন ক্রম ও সিদ্ধান্ত লগ। আনুমানিক সময় ধরে নেওয়া team: **1 Flutter lead + 1–2 Flutter**, **1 Laravel API lead + 1 backend**, **1 product/design**, **1 QA** (shared)। ছোট টিমে calendar time বাড়বে; বড় টিমে integration overhead বাড়বে।

## Locked product decisions

| # | Decision | Rationale |
| --- | --- | --- |
| D1 | একই Laravel backend + DB; versioned `/api/v1` | Web parity ও single source of calculation |
| D2 | Native Flutter Android + iOS | Offline-capable UX, store distribution, geofence/push quality |
| D3 | Server-enforced permissions + capabilities bootstrap | Client hide ≠ authorize |
| D4 | Money/workflow/punch online-only commit | Prevent double post & false success |
| D5 | Official reports server-generated | Legal/print parity with web |
| D6 | bn/en localization from day one on shell | Field users |
| D7 | Training/Store/Recruitment not faked as complete | Placeholder honesty (P01.13) |
| D8 | No payment gateway in v1 unless separately scoped | Current flows are manual verification |
| D9 | Green brand primary from existing logo direction | Blueprint tokens; final brand sign-off still required |
| D10 | Checklist `05` is sole status source of truth | Avoid scattered “done” claims |

Open decisions (must close in P01):

| # | Question | Owner | Deadline |
| --- | --- | --- | --- |
| O1 | Min supported devices / shared tablet policy | Product | P01.12 |
| O2 | Private storage migration timing (A13) | Backend + Ops | P01.09 |
| O3 | Password recovery on mobile vs web-only | Product + Security | P01.05 |
| O4 | Certificate pinning yes/no | Security | before store |
| O5 | Enterprise MDM vs public stores | Ops | before pilot Wave A |
| O6 | Dark theme in v1 or later | Design | P20 |
| O7 | QR scanning in asset v1 | Product | P14 |

## Recommended delivery waves

```mermaid
gantt
  title Mousumi Flutter delivery (indicative)
  dateFormat  YYYY-MM-DD
  axisFormat  %b %d
  section Foundation
  P01 Discovery           :a1, 2026-11-16, 14d
  P02 API foundation      :a2, after a1, 14d
  P03 Auth + P04 Shell    :a3, after a2, 21d
  section Field MVP
  P06 Attendance          :b1, after a3, 21d
  P07 Leave               :b2, after a3, 14d
  P08 Movement/penalty    :b3, after b2, 14d
  P16 Inbox/push/map      :b4, after a3, 14d
  P19 Tasks aggregator    :b5, after b2, 10d
  Pilot Wave A/B          :b6, after b5, 21d
  section HR & People
  P05 Employees/org       :c1, after b1, 28d
  P09 HR lifecycle        :c2, after c1, 21d
  P10 Appraisal/exit      :c3, after c2, 28d
  section Finance
  P12 Payroll read+ops    :d1, after b6, 28d
  P11 Loans               :d2, after d1, 28d
  P13 PF/gratuity         :d3, after d2, 21d
  section Ops parity
  P14 Assets              :e1, after d1, 28d
  P15 Inventory           :e2, after e1, 14d
  P17 Admin               :e3, after c1, 14d
  P18 Reports             :e4, after d3, 21d
  section Harden
  P20 Design gates        :f1, a3, 90d
  P21 QA/release          :f2, after e4, 28d
```

Dates illustrative from plan resume date; re-baseline after P01.

### Wave definitions

| Wave | Scope | Exit criteria |
| --- | --- | --- |
| **W0 Foundation** | P01–P04 | Auth+bootstrap+shell on staging; design tokens live |
| **W1 Field MVP** | Attendance, leave, movement/penalty, notices, tasks | Pilot A/B packs green |
| **W2 People** | Employees, org, HR lifecycle | HR pilot packs green |
| **W3 Talent/Exit** | Appraisal, resignation, clearance | Workflow parity tests green |
| **W4 Finance** | Payslips → payroll ops → loans → PF/gratuity | Money packs + idempotency green |
| **W5 Ops** | Assets, inventory, admin deep, full reports | Coverage CSV verified |
| **W6 GA** | Store rollout, monitoring, remaining P2 | Sign-off in P21 |

Full-parity backlog থেকে existing capability বাদ নয় — শুধু release order। কোনো capability skip করতে হলে CSV-তে owner + target wave + কারণ।

## Effort bands (engineering days, indicative)

| Block | Backend | Flutter | Design/QA share |
| --- | --- | --- | --- |
| W0 | 15–25 | 15–25 | 10–15 |
| W1 | 25–40 | 30–45 | 15–20 |
| W2 | 20–35 | 25–40 | 10–15 |
| W3 | 25–40 | 25–40 | 10–15 |
| W4 | 40–70 | 35–60 | 15–25 |
| W5 | 30–50 | 30–50 | 15–20 |
| W6 | 10–20 | 10–20 | 15–25 |

Calendar: roughly **5–8 months** to strong field MVP + finance read paths with the team above; **full module parity** often **9–12+ months** including UAT — re-estimate after P01 runtime evidence।

## Risk register

| ID | Risk | Impact | Mitigation |
| --- | --- | --- | --- |
| R1 | Permission semantics drift web vs API | Data leak / blocked work | Characterization tests; single capability builder |
| R2 | Punch race / device spoof | Wrong attendance | DB constraints, install id, reconcile UX (A05) |
| R3 | Money double-post | Financial loss | Idempotency keys; online-only; service tests |
| R4 | Private files on public disk | Compliance | A13 migration before broad pilot |
| R5 | Scope underestimation of forms | Delay | Screen CSV disposition; wizard reuse |
| R6 | Design freeze too early | Costly rework | P20 usability gate |
| R7 | Ops scheduler/deploy gaps | Effective-date bugs | A16–A18 tasks before GA |
| R8 | Placeholder modules promised | Trust loss | D7 + P01.13 |
| R9 | Team split without API contract | Rework | OpenAPI + consumer tests |
| R10 | Store rejection / privacy | Launch slip | P21.05 early draft |

## Roles & RACI (summary)

| Work | Product | Design | Laravel | Flutter | QA | Ops |
| --- | --- | --- | --- | --- | --- | --- |
| Scope / wave exit | A | C | C | C | C | I |
| API contract | C | I | A | R | C | I |
| UI system | C | A | I | R | C | I |
| Business rules | A | I | R | C | C | I |
| Staging/data | C | I | R | I | C | A |
| Release | A | C | R | R | R | A |

A=accountable R=responsible C=consulted I=informed

## Go / No-go template

প্রতিটি wave শেষে কপি করে পূরণ করুন:

```text
Wave: ____    Date: ____    Chair: ____
Checklist phases required: ____
Open S0/S1 bugs: ____
Coverage unexplained skips: ____
Security exceptions: ____
Decision: GO / GO-WITH-WAIVERS / NO-GO
Waivers (ID, owner, expiry): ____
Sign-off: Product ____  Eng ____  QA ____  Ops ____
```

## Decision log (append-only)

| Date | Decision | By |
| --- | --- | --- |
| 2026-11-13 | Planning package resumed; docs 04–07 completed; checklist is SoT | Planning |
| 2026-11-13 | Implementation branch `feature/flutter-mobile-app` started; Flutter monorepo under `mobile/` + `/api/v1` auth/bootstrap foundation | Engineering |
| | | |

নতুন সিদ্ধান্ত এখানে যোগ করুন; পুরনো সারি মুছবেন না।
