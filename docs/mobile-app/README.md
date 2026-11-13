# Mousumi ERP → Flutter Mobile App: সম্পূর্ণ পরিকল্পনা

প্রস্তুতের তারিখ: **১৩ নভেম্বর ২০২৬**, Asia/Dhaka। এই প্যাকেজ বর্তমান repository দেখে তৈরি করা পরিকল্পনা; Flutter app implementation এখনো শুরু হয়নি।

লক্ষ্য: বর্তমান Mousumi ERP-এর কার্যক্রম, অনুমতি, approval chain, হিসাব এবং রিপোর্ট অক্ষুণ্ণ রেখে Android ও iOS-এর জন্য পেশাদার Flutter app। ছোট পর্দায় ব্যবহার সহজ হবে; বর্তমান web-এর প্রতিটি URL আলাদা mobile screen হওয়া প্রয়োজন নেই, কিন্তু প্রতিটি কার্যকর business capability-এর হিসাব থাকতে হবে।

## পড়ার ক্রম

| নথি | কী পাবেন |
| --- | --- |
| [01 — বর্তমান প্রজেক্ট যাচাই](01-PROJECT-AUDIT.md) | যাচাইয়ের প্রমাণ, মডিউল, সমস্যা, সীমাবদ্ধতা |
| [02 — Feature coverage](02-FEATURE-COVERAGE.md) | প্রতিটি মডিউলের mobile scope, ব্যতিক্রম ও business rules |
| [03 — Professional UI/UX](03-UI-UX-BLUEPRINT.md) | navigation, design system, screen flow, accessibility ও usability |
| [04 — Flutter ও API architecture](04-ARCHITECTURE-API.md) | app structure, API contract, authentication, offline, integration |
| [05 — Task checklist](05-TASK-CHECKLIST.md) | **একটি কাজ শেষ হলে `[ ]` → `[x]` করার মূল তালিকা** |
| [06 — QA ও release](06-QA-RELEASE.md) | test matrix, measurable quality gates, pilot ও rollout |
| [07 — Delivery ও সিদ্ধান্ত](07-DELIVERY-DECISIONS.md) | কাজের ক্রম, দল, আনুমানিক সময়, ঝুঁকি ও সিদ্ধান্ত |
| [Evidence summary](evidence/summary.json) | repository scan-এর সংখ্যাগত ফলাফল |

## কী শেষ হয়েছে, কী এখনো বাকি

### Planning package (এই ফোল্ডার) — সম্পূর্ণ

| নথি | অবস্থা |
| --- | --- |
| 01 Audit | সম্পূর্ণ |
| 02 Feature coverage | সম্পূর্ণ |
| 03 UI/UX blueprint | সম্পূর্ণ |
| 04 Architecture & API | সম্পূর্ণ (২০২৬-১১-১৩ resume) |
| 05 Task checklist (~২০৫ markable) | সম্পূর্ণ (২০২৬-১১-১৩ resume) |
| 06 QA & release | সম্পূর্ণ (২০২৬-১১-১৩ resume) |
| 07 Delivery & decisions | সম্পূর্ণ (২০২৬-১১-১৩ resume) |
| evidence/* + `scripts/build_mobile_plan.py` | সম্পূর্ণ / refreshable |

### Repository যাচাই (static) — সম্পন্ন; runtime এখনো বাকি

- Repository-wide structural inventory এবং selected source-এর গভীর review সম্পন্ন। সব inventory entry-তে inspection level লেখা আছে।
- ৮৩৮টি non-Blade PHP ফাইলের syntax check পাস। এটি business logic বা নিরাপত্তা সঠিক হওয়ার প্রমাণ নয়।
- ১,৬৬২টি ফাইল, ৩৫৪,৩৪৯টি scanned text line, ১৬৮টি controller, ১৪০টি model, ১১১টি service, ১৯৩টি migration, ২০টি route file এবং ৫৪টি test file নথিভুক্ত।
- ৯৪৪টি **static route declaration** পাওয়া গেছে; group prefix, resource expansion, duplicate ও load না হওয়া route মিলিয়ে runtime endpoint count আলাদা হবে।
- ৪২৮টি `pages/` file আছে; এগুলোর মধ্যে components, config ও legacy page-ও আছে। ৪২০টিতে `export default` পাওয়া মানেই ৪২০টি সক্রিয় screen নয়।
- `.env`, `vendor/`, `node_modules/` অনুপস্থিত। তাই runtime route list, database migration execution, Pest, frontend build এবং browser/device UAT এখনো যাচাই হয়নি।
- Production data, deployment health, stakeholder practice এবং visual usability অনুমান করে “পাস” দেওয়া হয়নি। Checklist-এর discovery ও QA gates-এ এগুলো বাধ্যতামূলক।
- **Flutter + `/api/v1` field platform live on `feature/flutter-mobile-app`**: auth, attendance, leave, movement/penalty, tasks, inbox, employees directory, payslips/loans/PF summary, documents, my assets, reports catalog, office map, admin summary.
- Deep admin/HR/finance processing (bulk import, payroll post, loan collection, asset depreciation, inventory ops, appraisal chains) still tracked as open checklist items — mobile surfaces + APIs exist for daily field use; web remains source for heavy ops until those tasks close.
- P01 runtime (`.env` / `vendor`) still required before claiming live staging certification.

**“কিছু বাদ যাবে না” যাচাইয়ের পদ্ধতি:** file inventory → route/screen/report coverage → task → API contract → acceptance test → release evidence। Traceability file-এ initial mapping আছে; implementation-এর আগে প্রতিটি mapping runtime route list দিয়ে নিশ্চিত করতে হবে। কোনো row বাদ দেওয়ার সিদ্ধান্ত হলে তার কারণ, owner ও বিকল্প লিখতে হবে।

## Tracking ব্যবহার

`05-TASK-CHECKLIST.md` হলো status-এর একমাত্র মূল নথি। Task শুরু হলে তার নিচে assignee/তারিখ লিখুন। Done condition পূরণ, প্রয়োজনীয় test এবং evidence link ছাড়া `[x]` করবেন না। একটি task শেষ হলে পরের task নিন; কোনো বাধা থাকলে কারণ ও নির্ভরতা লিখুন, কাজটি complete দেখাবেন না।

`evidence/task-register.csv`, `route-task-coverage.csv`, `screen-task-coverage.csv` ও `report-catalog.csv` spreadsheet-এ filter করা যায়। CSV-গুলো generated view; checklist edit করার পর `python scripts/build_mobile_plan.py --refresh-only` দিয়ে refresh করুন। Repository inventory আবার করতে `python scripts/audit_mobile_readiness.py`। কোনো script production database বা application state বদলায় না।

## মূল সিদ্ধান্ত

একই Laravel backend ও database রাখা হবে। Versioned mobile API তৈরি হবে; existing services-এ business calculation ও workflow চলবে। Native Flutter UI, server-enforced permission, foreground geofence attendance, বাংলা/ইংরেজি, secure storage, push, safe offline reading এবং complete module coverage পরিকল্পনার অংশ।

Training/Store-এর মতো শুধু label/placeholder থাকা অংশকে existing implemented feature বলা হয়নি। সেগুলোর জন্য discovery ও আলাদা backlog আছে। বর্তমানে কার্যকর module-এর scope কোনো early release-এ না থাকলে সেটি পরের release-এর tracked task হিসেবেই থাকবে।
