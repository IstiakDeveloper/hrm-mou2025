# Mousumi ERP — Sales Presentation (English, Slide-by-Slide)

Companion to `sales-presentation-slides.md` (Bengali speaker notes).  
Use this deck when the audience prefers English. Keep the Bengali file for how you *explain*.

**Timing:** core 30–40 min + demo 20 min. Appendix only if asked.

**Legend:** **LIVE** = demo today · **CONFIG** = client branding/rules · **ROADMAP** = do not promise

---

## Slide 1 — Cover

- **Mousumi ERP**
- Human Resource + Payroll + Operations Platform
- People, time, pay and assets — one system
- *Confidential | Sales Presentation*

**Say:** This is one login, one database, one workflow — not separate Excel files and separate apps.

---

## Slide 2 — Agenda

1. The problem
2. The solution at a glance
3. Ten live modules
4. Who sees what — roles
5. Reports and compliance
6. Technology, mobile, security
7. Implementation and next steps

---

## Slide 3 — Pain

- Employee data scattered in Excel / paper files
- Biometric device, payroll and leave are disconnected
- Branch / zone / regional visibility is informal
- Salary sheet, bank advice, PF, gratuity are manual
- Field movement, km and vouchers take days to reconcile
- Audit week means assembling reports overnight

---

## Slide 4 — Solution in one line

> **One login. Many modules. Single source of truth.**

- Start from the employee master
- Attendance and movement post to that employee
- Leave, loans, PF and gratuity share the same ledgers
- Payroll deducts from those ledgers and prints payslips
- Reports in PDF / Excel / print in one click

---

## Slide 5 — Why this product

1. **Bangladesh-native** — grade–step pay, tax slabs, PF, gratuity, July–June FY
2. **Multi-branch organogram** — ED → Director → ZM → RM → BM → Department Head
3. **Biometric + mobile geofence** together
4. **Field movement + logbook + payment + penalty** for NGO/MFI field ops
5. **Loan ↔ payroll ↔ PF** in one engine
6. **PWA** — field staff use it like an app on the phone

---

## Slide 6 — Live reference

- Product: **Mousumi ERP / HRM Application**
- Reference org: **MOUSUMI**, Ukilpara, Naogaon
- Access: web + mobile (PWA)
- Entry: **Control Center** — all sections on one screen

**Say:** This is production software. We put *your* name, logo, address and branch tree on it.

---

## Slide 7 — Who it is for

| Fit | Example |
|-----|---------|
| NGO / development | Multi-project, multi-branch |
| Microfinance | Zone–region–branch line |
| Multi-location corporate | HO + factory/branches |
| Education / hospital networks | Central HR + local attendance |

Best fit: many branches, field movement, grade pay, staff loans and PF.

---

## Slide 8 — Scale (from the product)

- **10 live ERP sections** + office map
- **100+ business models**
- **300+ screens**
- Payroll reports **17** · PF **10** · Gratuity **9** · Loan **10** · Fixed asset **11**
- **15+ built-in roles**
- Export: PDF, Excel, print, bank advice

---

## Slide 9 — Control Center

| Live module | One-line job |
|-------------|--------------|
| Human Resources | People, org, transfer/promotion, exit |
| Attendance & Movement | Time + field movement |
| Leave | Apply, balance, approve |
| Employee Loan | Policy → approve → installment |
| Staff Fund | PF, gratuity, final pay |
| Payroll | Structure → process → post → payslip |
| Fixed Asset | Purchase through disposal |
| Inventory | Stock in and issue |
| Administration | Users, roles, notices |
| Office Map | Branch / zone map |

**Roadmap tiles (not full modules):** Recruitment, Training, Store

Roles lock entire modules. Accountant does not see HR masters. BM sees own branch. Employee sees self-service only.

---

## Slide 10 — Employee lifecycle

```
Join → profile/documents → probation → confirmation
    → attendance / leave / movement
    → promotion / transfer / discipline
    → salary / bonus / loan / PF
    → separation → final settlement
```

Recruitment ATS is roadmap. Join-to-exit is **live**. Final pay = PF refund + gratuity − loan recovery.

---

## Slide 11 — HR: organization

- Zone → Regional office → Branch
- HO departments and designations
- Employee types, programs, projects
- Organization chart
- Branch geofence (for mobile punch)

Each branch can have its own weekend, attendance rules and payroll bank account.

---

## Slide 12 — HR: 360° employee file

Personal data, photo, NID, mobile · address (upazila–union–village) · education, experience, training records · nominees, guarantors, guarantor cheques · bank account · collateral · salary assignment · biometric / device IDs · documents · status

Bank account feeds bank advice. Nominees serve PF/gratuity. Guarantors/collateral serve staff loans.

---

## Slide 13 — HR: import, export, blank form

- Excel **export**
- Excel **import wizard** — preview → review → commit
- Printable **blank HR form**

---

## Slide 14 — HR: career events

| Event | What happens |
|-------|----------------|
| Confirmation | Probation → permanent; can link pay/promotion |
| Promotion / Demotion | Request → approve → complete; history kept |
| Transfer | Single + **bulk** |
| Disciplinary action | Register |
| Separation | Exit workflow → final payment |

Each has approve / reject / history.

---

## Slide 15 — Holiday calendar

CRUD + calendar view · branch-applicable holidays · monthly attendance marks **Holiday** automatically. Weekend is separate and per-branch.

---

## Slide 16 — Attendance: three capture paths

1. **ZKTeco** biometric (finger/face)
2. **iClock ADMS** — device pushes to server
3. **Mobile self-punch** — GPS geofence + one-device-per-day lock

Plus HR manual entry and Super Admin bulk attendance.

---

## Slide 17 — Attendance: devices and settings

Device registry, connection test, sync · push employees, biometric ID mapping · work start/end, late threshold, half-day hours · **weekend per branch** · **per-employee times**

**Roadmap:** rotating shift roster (not in this release). Work-time settings cover most offices.

---

## Slide 18 — Attendance: daily and monthly

Daily portal and branch summary · **monthly grid** · sheet report + PDF · overtime hours on the report

Statuses: Present · Absent · Late · Half Day · Leave · On Duty · Weekend · Holiday

**Priority:** holiday → leave → movement (on duty) → weekend → punch-derived status

---

## Slide 19 — Movement (field operations)

`Apply → approve → active → complete/close`

Places, km, meter readings · printable form · **logbook** (print/Excel) · **logbook payment** (voucher, recommend, approve/reject) · **penalty** — unpaid movement can lock the account until payment is verified

---

## Slide 20 — Leave

Configurable types · **multi-tier approval** · balances, bulk allocate, year reset · apply with attachments, cancel, PDF · auto-approve eligibility check · email on leave events · branch and employee dashboards · PDF/Excel reports · unpaid leave type is enforced for payroll

---

## Slide 21 — Payroll: structure

```
Payscale → Grade → Step → Salary heads → Employee structure
```

Earning and deduction heads (PF, tax, loan flags) · head modifications · probation rules · fixed-salary override · **salary withheld** · branch payroll banks

---

## Slide 22 — Payroll: monthly run

```
Process (draft) → review payslips → Post (final) → Bank advice
                         ↘ Rollback if needed
```

On post: PF, income tax (slabs), loan installments.  
**Bonus** is a separate type → config → calculate → post → rollback.  
Employees view/download **payslips**.

---

## Slide 23 — Payroll: 17 reports

Grade Step · Salary Sheet posted/unposted · Employee-wise · Date range · Branch topsheet · Month-wise · Designation-wise · Bank Advice (salary & bonus) · Addition / Deduction registers · Advance salary · Bonus register · Final payment · Salary certificate

Filters: year, month, branch, department, designation, organogram, program, project

---

## Slide 24 — Employee loan lifecycle

```
Policy → committee → apply → approve
 → disburse → payroll installment / manual collection
 → waive / rebate / full pay → close
```

Also: legacy **migration**, rollback, loan transfer between employees, single/batch/advance collection

---

## Slide 25 — Employee loan: 10 reports

Ledger · Disburse register · Recoverable · Collection register · Loan & PF balance · Full paid · Rebate · Statements (employee / component / branch)

---

## Slide 26 — Provident fund

Opening + manual entries · payroll contributions · **yearly interest** (50% employee / 50% org as configured) · withdrawals · employee self-service ledger

**10 PF reports:** ledger, contribution & loan deduction, deduction, interest, refund, balance, balance details, branch-wise, department-wise, transaction register

---

## Slide 27 — Gratuity and final settlement

Tenure × basic × configurable tiers · payment records · projected liability by branch/department · unpaid liability · eligible list

**Final payment:** `PF refund + gratuity − loan recovery = net payable`  
**Employee financial statement:** PF + gratuity + loans, printable

**9 gratuity reports:** ledger, entitlements, eligible, projected liability, dept liability, unpaid, settlement history, payment summary, rules & tiers

---

## Slide 28 — Fixed asset lifecycle

Settings: category, sub-category, vendor, FY (Jul–Jun), custodian

Purchase · register · stock summary · assignment, maintenance, insurance, warranty, guarantee · **depreciation** calculate/post/rollback/manual · transfer (branch/project/custodian) · disposal · revaluation · status log · **My Assets** for staff

---

## Slide 29 — Fixed asset: 11 reports

Asset tracking · purchase lists (branch / category / month) · disposal list · category & branch schedules (detail, summary, **audit**)

---

## Slide 30 — Inventory

Product master · stock in · issue to employees · stock ledger · product ledger (print/PDF/Excel)

Fixed asset = capital items. Inventory = consumables. Store module is roadmap; daily issue already runs here.

---

## Slide 31 — Administration

User CRUD, status · sync branch accounts from posting · bulk email · role CRUD · sync default/line roles · **module locks** per role · active **session revoke** · admin notices + attachments + **Web Push** · profile, password, theme, push prefs

---

## Slide 32 — Office Map

Leaflet map of HO, zones, branches — useful in a sales meeting to show network footprint.

---

## Slide 33 — Notifications

| Channel | Status |
|---------|--------|
| In-app | LIVE |
| Admin notices + read tracking | LIVE |
| Web Push (PWA) | LIVE |
| Email (welcome, reset, leave, bulk) | LIVE |
| SMS | **Not built** (roadmap) |

---

## Slide 34 — Role map

Super Admin · HR Admin · Accountant · Administrator (read-only) · HR Manager / Assistant · Leave Manager · Attendance Manager · Executive Director · Director / AD (Microfinance) · Zonal / Regional / Branch Manager · Department Head · Team Leader · **Branch Account (PIN terminal)** · Employee

Permissions = *what you can do*. Organogram = *whose data you see*. Deletes stay with Super Admin.

---

## Slide 35 — Branch Account

Shared branch terminal · PIN login · attendance, inventory, asset entry, payroll sheets, leave balances — enabled step by step. Full HO ERP is not opened on the branch PC.

---

## Slide 36 — Employee self-service

Geofenced punch · leave apply/cancel · movement apply/complete · payslips · PF/gratuity ledger · own loan ledger · My Assets · profile, password, notices · holiday calendar

---

## Slide 37 — Security

80+ permission keys · module locks · multi-role · session revoke · password reset · geofence + device lock · movement penalty lock · per-module history tables

**Limit:** no single central “audit log of everything” UI; history is module-based.

---

## Slide 38 — Technology (for IT)

Laravel 12 / PHP 8.2+ · React 19 / TypeScript / Inertia / Tailwind · session auth + Sanctum API · DomPDF, mPDF, Chrome/Browsershot · Excel via SimpleXLSXGen · PWA · Leaflet · Web Push · database queue, Redis-ready

---

## Slide 39 — Integrations

ZKTeco sync + employee push · iClock ADMS endpoints · branch/device employee APIs · organization sync API · **MisLoan** field-officer sync · other brands / GL posting = scoped integration

---

## Slide 40 — Multi-branch, single org

Multi-branch / zone / region: **yes**. Multi-company SaaS: **not in this release**. One legal entity + many branches is the sweet spot.

---

## Slide 41 — Report hub

Administration, attendance, leave, movement, transfer register, employee reports, employee full-pack PDF — plus each module’s own gallery. Formats: print, PDF, Excel, CSV. Gated by `reports.export`.

---

## Slide 42 — Bangladesh compliance fit

Tax slabs (seed from XLSX) · PF contribution and interest · gratuity tiers · Jul–Jun asset FY · Fri–Sat weekend default · Taka formatting · signature blocks Prepared / Verified / Approved

---

## Slide 43 — Live vs roadmap (honesty slide)

**Live today:** full HR lifecycle · attendance (device + mobile) · movement · leave · payroll & bonus · staff loan · PF/gratuity/final pay · fixed asset · inventory · admin · map · PWA/Push

| Item | Status |
|------|--------|
| Recruitment / ATS | Tile only |
| Training LMS | Profile records only |
| Store module | Use Inventory |
| Shift roster | Work-time settings only |
| SMS | No |
| Multi-company | No |
| Central audit-log UI | No |

---

## Slide 44 — Implementation phases

0 Discovery · 1 Masters & import · 2 Attendance + leave · 3 Payroll parallel month · 4 Loan + PF opening · 5 Assets & inventory · 6 Training and go-live

Do not go-live every module on day one.

---

## Slide 45 — What we configure for you

Name, address, logo, headers · org tree · leave types & tiers · attendance hours & weekends · payscale, grades, heads, tax · loan policies · gratuity tiers · asset categories & FY · roles and section locks · report signatories

---

## Slide 46 — 20-minute demo script

1. Control Center (1)  
2. Employee profile tabs (2)  
3. Monthly attendance + a device screen (3)  
4. Leave approval (2)  
5. Movement and logbook (2)  
6. Payroll gallery + payslip (3)  
7. Loan ledger / PF balance (2)  
8. Final payment concept (1)  
9. Asset register (2)  
10. Map + PWA (2)

Use three logins: Super Admin, Branch Manager, Employee.

---

## Slide 47 — Business outcomes

Payroll in hours not days · fewer bank-advice copy errors · monthly attendance without a reconciliation meeting · cleaner exit bills · audit pack ready (salary, PF, gratuity, asset schedules) · branch and HO see the same truth · transparent field punch and movement

---

## Slide 48 — Next steps

1. **Discovery workshop** — your policies and branch map  
2. **Sandbox** — your logo  
3. **Pilot** — HO + 1–2 branches  
4. **Commercial proposal** — licence, implementation, support, hosting  

Pilot success: one month’s salary sheet from the system.

---

## Slide 49 — Thank you / Q&A

**Mousumi ERP** — HR · Time · Pay · Fund · Assets  
Questions?  
*Name · title · phone · email*

---

# Appendix

## A1 — Salary heads

Earnings and deductions are configurable flags (tax, PF, loan). New allowance = new head + structure line. No code change.

## A2 — Attendance rules

Holiday → leave → on-duty movement → weekend → else punch (present / late / half day / absent). Late/half-day from branch or personal times.

## A3 — Organogram chain

Staff → Team Leader / BM → RM → ZM → AD → Director → ED. HO: staff → Dept Head → director. ZM does not see another zone.

## A4 — APIs (IT)

`POST /api/zkteco/sync` · device PIN mapping · employees by branch · iClock cdata/getrequest/devicecmd/ping · Sanctum. Firewall: devices must reach the server (ADMS outbound).

## A5 — Hosting discussion

Cloud vs on-prem · SSL, backup, staging · queue worker · Chrome for payroll PDF · device network · admin vs end-user training. Product fee and hosting can be separate line items.

## A6 — Employee full report

One person: profile, leave PDF, attendance, movement; plus payslip, loan, PF from other modules.

## A7 — Notices

Admin notice + file · in-app unread count · Web Push subscribe/test · leave emails. Official channel instead of WhatsApp groups.

## A8 — Asset vs inventory vs store

| | Fixed Asset | Inventory | Store (roadmap) |
|--|-------------|-----------|-----------------|
| Example | Laptop, bike | Pens, forms | Full indent/requisition |
| Depreciation | Yes | No | — |
| Now | Live | Live | Tile only |

## A9 — Migration checklist

Employee master · bank accounts · payscale map · leave openings · loan openings · PF openings · asset register · biometric IDs · user ↔ employee link. Migration is ~50% of project risk.

## A10 — FAQ

**Multi-company?** Separate install per legal entity.  
**Play Store app?** PWA; native store app is extra scope.  
**Offline punch?** Geofence is online; full offline queue is a separate discussion.  
**Other biometric brands?** ZKTeco/iClock ready; others are integration.  
**Tally/QuickBooks?** GL post is extra integration.  
**Bangla UI?** Operational UI is mostly English; Bangla UI is extra scope.  
**Recruitment?** Roadmap; enter staff after offer.  
**Custom roles?** Yes — Admin → Roles.

---

**Short meeting (15 min):** 1, 4, 5, 9, 10, 16, 22, 27, 34, 43, 48  
**Full sales:** 1–49 + demo  
**IT deep dive:** 38, 39, A4, A5
