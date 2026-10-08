# Role permission plan

এই ফাইলটাই ইমপ্লিমেন্টেশনের উৎস। পরে অংশ ধরে কাজ করতে এই ক্রম অনুসরণ করতে হবে। এক অংশ শেষ না হওয়া পর্যন্ত পরের অংশ শুরু নয়।

তারিখ: 2026-10-08। মাপ: 861 route, ক্যাটালগে 137 key, `config/default_roles.php`-এ 18 role।

## যা এই প্ল্যান ঠিক করে

Role-এ যে key লেখা আছে, সার্ভার আর ব্রাউজার দুই জায়গায় সেই key-ই অ্যাক্সেস দেবে। আজ যে পেজ যে role-এর জন্য খোলে, সেটা খোলা থাকবে। লুকানো alias আর designation দিয়ে permission দেওয়া বন্ধ হবে, তবে নিচের সিদ্ধান্ত অনুযায়ী, একসাথে নয়।

## যা এই প্ল্যান করে না

এগুলো পরে আলাদা কাজ। এই প্ল্যানের মাঝে এগুলো বদলানো যাবে না।

- কোন ব্রাঞ্চ, জোন বা বিভাগের কর্মচারী দেখা যাবে। সেটা `app/Services/OrganogramAccessService.php`-এর scope। Permission key নয়।
- Evaluation-এ পরের স্বাক্ষরকারী কে হবে। সেটা workflow সার্ভিসে role নাম দিয়ে বাঁধা: `PromotionEvaluationWorkflowService`, `ConfirmationEvaluationWorkflowService`, `ProbationIncrementWorkflowService`। এগুলো permission তালিকা নয়।
- `blocked_sections`। সেকশন মেনু লুকানোর সুইচ। Permission থেকে মুছে ফেলা হবে না, আর এই প্ল্যানে URL-এ নতুন করে লাগানো হবে না। আজ অনেক মডিউল URL permission দিয়ে খোলে, সেকশন লক শুধু মেনুতে।
- Training, Store, Recruitment। কোনো route নেই। নতুন key বানানো হবে না।
- Office map। পাবলিক।
- নিজের check-in, নিজের payslip, নিজের loan, নিজের PF। লগইন করা কর্মচারীর নিজের রেকর্ড। Role key দিয়ে আটকানো হবে না।
- প্রতিটি বাটনের জন্য নতুন permission। Payroll, loan, asset, inventory-এ view/create/edit/delete যেমন আছে তেমন থাকবে।

## লক করা সিদ্ধান্ত

1. **Super Admin** একমাত্র ব্যতিক্রম। `isSuperAdmin()` সত্য হলে ক্যাটালগের যেকোনো key পাস। Sync-এ role-এ পুরো key তালিকাও লেখা থাকবে, যাতে রোল স্ক্রিনে সব টিক দেখা যায়। এই শর্টকাট সরানো হবে না। নতুন key যোগ হলে Super Admin আগে থেকেই পায়।
2. **Payroll নিষেধ থাকবে**, এক জায়গায়, নাম দিয়ে। ইউজার Department Head হলে, অথবা organogram line marker থাকলে, `payroll.*`, `employee-loan.*`, `staff-fund.*` অস্বীকার। দুই role একসাথে থাকলেও (যেমন Branch Manager + Accountant) আজ যেমন বন্ধ, তেমন বন্ধ থাকবে। এই নিয়ম সার্ভার আর ব্রাউজারে একই ফাংশন ধারণ অনুসরণ করবে। সরানো এই প্ল্যানের অংশ নয়।
3. **Alias কপি করে role-এ বসানো যাবে না** যেখানে সেটা `hasDirectPermission` বদলায়। `employee-loan.view` বা `staff-fund.view` শুধু তাই role-এ লেখা হবে, যে role-এ আজ সত্যিই সেই key আছে। `payroll.view` থাকলেই loan/fund/employee key যোগ নয়। কারণ `OrganogramAccessService::userBypassesOrganogramEmployeeScope()` সরাসরি `employee-loan.view` আর `staff-fund.view` দেখে পুরো কর্মচারী তালিকা খুলে দেয়।
4. **Designation দিয়ে evaluation permission বন্ধ** হবে অংশ ২-এর শেষে, স্ন্যাপশটের মানুষদের role ঠিক করার পর। এরপর নতুন manager পেতে হলে role দিতে হবে। Designation আর নিজে থেকে key দেবে না।
5. **কাস্টম role** `config/default_roles.php` সিঙ্ক দিয়ে ওভাররাইট হবে না। স্ন্যাপশটে নাম থাকবে। তাদের তালিকা হাতে মেলাতে হবে, সিঙ্ক দিয়ে নয়।
6. **`permissions:sync-default-roles` আর `fix-permissions`** অংশ ০-এর রিপোর্ট সেভ হওয়ার আগে চালানো যাবে না। `fix-permissions` ক্যাটালগের বাইরের key কেটে দেয়।

## এক অংশ শেষের শর্ত

- সার্ভার `User::hasPermission` আর ব্রাউজার `hasAppPermission` (`resources/js/lib/permissions.ts`) একই উত্তর দেয়। আজকে দেয় না: PHP-তে Assistant Director (HR) আছে, ব্রাউজারে Administrator আছে।
- আজ যে role পেজ খোলে, চেকের পরও খোলে। আজ যে role পায় না, সে পাবে না। ব্যতিক্রম শুধু নিচের অংশ ১-এর লেখা alias তালিকা, যেখানে আলাদা করে বলা আছে।
- ওই অংশের route middleware, কন্ট্রোলার চেক, আর মেনু একই key।
- Organogram scope ফাইল এই অংশে বদলায় না।

## অংশ ০ — স্ন্যাপশট

কোনো permission কোড বদল নয়। ডাটাবেস থেকে রিপোর্ট বের করে `docs/permission-snapshot.md` এ সেভ করতে হবে। এই ফাইল না থাকলে অংশ ১ শুরু নয়।

বের করতে হবে:

- `roles` টেবিলের প্রতিটি নাম, permission JSON, `blocked_sections`। `config/default_roles.php`-এর 18 নামের সাথে তুলনা: শুধু কনফিগে আছে, শুধু ডাটাবেসে আছে, দুই জায়গায় key আলাদা।
- কাস্টম role-এর পুরো নাম আর key।
- যেসব ইউজারের একসাথে organogram line role এবং payroll/loan/staff-fund key আছে। এদের payroll আজ বন্ধ থাকে। সংখ্যা আর ইউজার আইডি লিখতে হবে।
- যেসব ইউজার evaluation পায় শুধু designation দিয়ে (`manager`, `director`, `ব্যবস্থাপক`, `পরিচালক`), অথচ role-এ `promotion-evaluations.*`, `confirmation-evaluations.*`, `probation-increment-evaluations.*` নেই।
- কোনো role JSON-এ `attendance.self` বা `leaves.view` আছে কি না।
- Branch Account role-এ শুধু alias দিয়ে `employees.view`, `employee-loan.view`, `staff-fund.view` পায় কি না। কনফিগে তাদের সরাসরি key শুধু `payroll.view`।

## অংশ ১ — ফাউন্ডেশন

ফাইল:

- `config/default_roles.php`
- `config/permissions.php`
- `app/Support/PermissionRegistry.php`
- `app/Models/User.php`
- `resources/js/lib/permissions.ts`

কাজ:

- Super Admin-এর `*` সিঙ্কে যেমন সব key হয়, ফাইলে সেই পূর্ণ তালিকা লেখা। রানটাইমে Super Admin শর্টকাট থাকবে।
- HR Admin-এর `*-no-delete-no-admin` যে key আজ দেয় (delete বাদ, `users.*` `roles.*` `sessions.*` বাদ, `organogram.*` ও `branch_manager` `department_head` বাদ), সেগুলো একে একে লেখা।
- Accountant-এর `sections:...` যে key আজ দেয়, সেগুলো একে একে লেখা। `fixed-assets.delete` সহ, কারণ সেকশন রুল আর `isAccountant()` দুই জায়গায় আজ delete দেয়।
- বাকি role-এর লেখা তালিকা এই অংশে না কমানো।
- `User.php` আর `permissions.ts`-এ evaluation বাইপাস, payroll নিষেধ, আর alias একই ক্রমে রাখা। তালিকার পার্থক্য মেলানো: দুই জায়গায় একই role নাম। Administrator শুধু তখন evaluation পাবে, যদি স্ন্যাপশটে তার role-এ key থাকে অথবা PHP আজ তাকে দেয়। PHP আজ Administrator-কে নাম দিয়ে দেয় না। ব্রাউজার থেকে Administrator-এর অতিরিক্ত evaluation শর্টকাট সরাতে হবে, যাতে বাটন খুলে পেজ বন্ধ না হয়।
- Leave alias (`leaves.view` = `leave-applications.view`, `leaves_type.*` = `leave-types.*`) থাকবে যতক্ষণ না ড্যাশবোর্ড `leaves.view` ছেড়ে `leave-applications.view` পড়ে। ফাইল: `app/Http/Controllers/DashboardController.php`, `resources/js/pages/dashboard.tsx`।

Alias সরানোর নিয়ম, এই অংশেই, আলাদা করে:

- `payroll.view` থেকে `employee-loan.*` / `staff-fund.*` / `employees.view` কপি করা যাবে না।
- সরাসরি key যে role-এ আজ কনফিগে আছে, শুধু সেটা থাকবে।
- Branch Account আজ alias দিয়ে loan, fund, employee দেখতে পারে। Alias সরলে সেই তিনটি বন্ধ হবে। এটা ইচ্ছাকৃত। তাদের কনফিগে এই key নেই। স্ন্যাপশটে এই পার্থক্য লিখে তারপর alias সরাতে হবে।
- Accountant-এর `employee-loan.*` আর `staff-fund.*` কনফিগের সেকশন থেকে আসে, alias থেকে নয়। সেগুলো তালিকায় থাকবে। `employees.view` তাদের কনফিগে নেই। Alias সরলে employee মেনু বন্ধ হবে। Human Resources সেকশন তাদের `blocked_sections`-এ আগে থেকেই বন্ধ। Employee পিকার loan স্ক্রিনে `employee-loan.view` দিয়ে চলতে হবে, `employees.view` দিয়ে নয়। সরানোর আগে loan/payroll/staff-fund কন্ট্রোলারে `employees.view` চেক খুঁজে বের করতে হবে। যেখানে পিকার ভাঙবে, সেখানে চেক `employee-loan.view` বা `staff-fund.view` বা `payroll.view` করতে হবে, Accountant-এ `employees.view` যোগ করে নয়।

এই অংশে সিঙ্ক তখনই, যখন নতুন explicit তালিকা আজকের `PermissionRegistry::resolvePermissionList()` আউটপুটের সমান, আর উপরের alias পার্থক্য ডকে লেখা আছে।

## অংশ ২ — Human Resources

প্রায় 197 route। Employee, সংগঠন, ছুটির দিন, transfer, promotion, demotion, confirmation, separation-এ view/create/edit/approve আগে থেকেই আলাদা। সেই key বদলানো যাবে না।

বদলাবে শুধু এগুলো:

- `employees/locations/unions`, `employees/locations/upazilas`, `employees/lookup` এখন permission ছাড়া। এগুলোতে `employees.view` বসবে। যে রোল আজ lookup ডাকে কিন্তু `employees.view` নেই, স্ন্যাপশট থেকে আগে key দিতে হবে, নইলে পিকার বন্ধ হবে।
- Disciplinary action আজ `employees.edit`। একই থাকবে।
- Employee dashboard (`employee/dashboard`) route-এ middleware নেই। কন্ট্রোলার চেকই থাকবে। সবাইকে `employees.view` দেওয়া যাবে না।
- তিনটি evaluation-এ list, edit, delete, forward, send-back, print আজ শুধু `.view`। `.review` ক্যাটালগে আছে, route-এ নেই। create, hr_verify, approve আলাদা।
- কাজের ক্রম: অংশ ০-এর designation তালিকার ইউজারদের সঠিক role দিতে হবে (Branch Manager, Regional Manager, Zonal Manager, Director, HR)। তারপর যাদের আজ edit/forward হয়, তাদের role-এ `.review` লিখতে হবে যদি সেই কাজ তাদের। তারপর route-এ edit/update/delete/forward/send-back `.review` চাইবে। create/hr_verify/approve যেমন আছে তেমন।
- তারপর `User::hasPermission` আর `hasAppPermission` থেকে evaluation-এর designation ও role-নাম শর্টকাট সরাতে হবে। Workflow সার্ভিসের স্বাক্ষর চেইন সরানো যাবে না।
- `transfers.delete`, `leave-applications.delete` ক্যাটালগে আছে, route-এ লাগে না। এই অংশে বাধ্যতামূলক করা যাবে না।

Types, programs, projects আজ `departments.*` ব্যবহার করে। নতুন key বানানো যাবে না।

## অংশ ৩ — Attendance ও Movement

- Attendance record: `attendance.view/create/edit/delete/sync` যেমন আছে।
- Device, settings, ZKTeco: `attendance.admin`।
- Movement ও log book: নিজ নিজ view/create/edit/delete/cancel/complete/approve। রিপোর্ট `reports.view`।
- `movement-penalties` route-এ middleware নেই। Approve/reject কন্ট্রোলারে `movements.approve` অথবা `movements.edit` চায়। লিস্টে `movements.view` বসবে। Approve-এ `movements.approve`। Sync ও bulk-এ `movements.edit`। আগে এই key যারা পায় তাদের তালিকায় থাকতে হবে।
- `movement/penalty-payment`, `penalty-status`, `penalty-submit` নিজের penalty। Role key বসবে না।
- `attendance.self` ক্যাটালগে নেই। `AttendanceController::canManageEmployeeAttendance` নিজের সারি এডিটের শেষ শাখায় এটা চায়। স্ন্যাপশটে কোনো role-এ এই স্ট্রিং না থাকলে কাউকে দেওয়া হবে না, শুধু ক্যাটালগে key যোগ হবে। স্ট্রিং থাকলে সেই role-এ রাখতে হবে, `fix-permissions` যেন না কাটে।
- নিজের check-in/check-out (`employee/attendance`) আগের মতোই নিজের রেকর্ড। `attendance.self` দিয়ে আটকানো যাবে না।

## অংশ ৪ — Leave

Types, balances, applications-এ key আগে থেকেই আলাদা। নতুন ভাগ নয়।

- `leave/applications/{application}/pdf` এখন permission ছাড়া। `leave-applications.view` বসবে।
- ড্যাশবোর্ড `leaves.view` ছাড়বে। তারপর `User.php` ও `permissions.ts` থেকে leave alias সরবে। `config/permissions.php`-এর `legacy_aliases` ততক্ষণ থাকবে যতক্ষণ ডাটাবেসে পুরনো key থাকে। স্ন্যাপশটে পুরনো key না থাকলে alias সরানো যাবে।

## অংশ ৫ — Employee Loan

74 route। view, create, edit, delete, `reports.export` আগে থেকেই আলাদা। নতুন key নয়।

অংশ ১-এ alias সরার পর এই সেকশন শুধু যাচাই: Accountant ও যাদের সরাসরি `employee-loan.*` আছে তারা আগের পেজ খুলতে পারে। Branch Account আর খুলতে পারবে না, যদি না স্ন্যাপশটে সরাসরি key থাকে।

## অংশ ৬ — Staff Fund

view, edit, `reports.export` route-এ আছে। `staff-fund.create` ও `staff-fund.delete` ক্যাটালগে আছে, route-এ নেই। বাধ্যতামূলক করা যাবে না।

`routes/web/staff-fund.php`-এ একদল final-payment `payroll.view` দিয়ে খোলে। সেগুলো `staff-fund.view` হবে। যে role আজ সেই URL খোলে শুধু `payroll.view` দিয়ে, তাদের আগে `staff-fund.view` দিতে হবে। Organogram line role-কে দেওয়া যাবে না, কারণ payroll নিষেধ তাদের fund-ও বন্ধ রাখে।

## অংশ ৭ — Payroll

view, create, edit, delete, `reports.export` আগে থেকেই আলাদা। মেনু `payroll.view`-এ থাকবে। সেভ, পোস্ট, রোলব্যাক আগের create/edit/delete-এ থাকবে।

Payroll নিষেধ এই অংশেও সরানো যাবে না। শুধু সার্ভার ও ব্রাউজার একই নিয়ম অনুসরণ করে কি না দেখতে হবে। ব্রাউজারে নিষেধ আজ `PAYROLL_MODULE_PERMISSIONS` আর `hasOrganogramLineRole`। সার্ভারে আগে `isDepartmentHead()`, তারপর organogram line। দুই জায়গায় একই শর্ত করতে হবে, নিষেধ না সরিয়ে।

## অংশ ৮ — Fixed Asset

161 route ইতিমধ্যে `fixed-assets.view/create/edit/delete`।

- Accountant বাইপাস (`User::hasPermission`-এ `isAccountant()` হলে সব `fixed-assets.*`) সরবে তখন, যখন Accountant-এর explicit তালিকায় চারটি key, delete সহ, লেখা আছে।
- `my-assets` নিজের অ্যাসাইনমেন্ট। Role key বসবে না।
- Branch Manager-এর আজকের view/create/edit থাকবে। তাদের `fixed-assets.delete` নেই। দেওয়া যাবে না।

## অংশ ৯ — Inventory

view, create, edit, delete আগে থেকেই route-এ আছে। Branch Manager-এর `inventory.delete` কনফিগে আছে। রাখতে হবে। নতুন ভাগ নয়।

## অংশ ১০ — Documents

আজ route-এ permission middleware নেই। নিয়ম কন্ট্রোলারে, আর সেটা ক্যাটালগের সাথে মিলে না।

| কাজ | আজ কে পারে | পরে কোন key |
| --- | --- | --- |
| তালিকা, ডাউনলোড, প্রিভিউ | যেকোনো লগইন ইউজার | middleware বসার আগে প্রতিটি বিদ্যমান role-এ `documents.view` |
| আপলোড, ক্যাটাগরি তৈরি | Super Admin, `admin.access`, `employees.admin`, `documents.manage`, role নাম Admin / HR Admin / Administrator, Department Head | `documents.manage` শুধু এই দলের role-এ |
| এডিট, ডিলিট, পিন | শুধু Super Admin। `documents.manage` থাকলেও এডিট হয় না | নতুন key `documents.delete` শুধু Super Admin। `documents.manage` দিয়ে এডিট খোলা যাবে না |

`DocumentController::canUserManage` ও `canUserEditOrDelete` role নামের বদলে এই key পড়বে। Department Head আজ ম্যানেজ করতে পারে। তাদের role-এ `documents.manage` লিখে তারপর নামের শর্টকাট সরাতে হবে।

## অংশ ১১ — Administration

Users ও roles আগে থেকেই view/create/edit/delete। Notices, sessions, activity log `admin.access`।

`sessions.view` ও `sessions.revoke` ক্যাটালগে আছে, route-এ লাগে না। বাধ্যতামূলক নয়।

`sections/administration` আজ permission ছাড়া খোলে। ভেতরের মেনু key দেখে। এই হোমে `admin.access` বসবে। স্ন্যাপশটে অন্য role এই হোম ব্যবহার করলে আগে তাদের `admin.access` দিতে হবে। না দিয়ে middleware বসানো যাবে না।

## অংশ ১২ — Profile, settings, shell

- `/profile` আজ `profile.view` ও `profile.edit`। একই থাকবে।
- `/settings` প্রোফাইল ও পাসওয়ার্ডে middleware নেই। একই `profile.view` / `profile.edit` বসবে। স্ন্যাপশটে যে role-এ এই দুই key নেই, আগে দিতে হবে, নইলে সেটিংস বন্ধ হবে।
- সেকশন পিকার, নোটিশ, নোটিফিকেশন লগইন থাকলেই। নতুন key নয়।

## ইমপ্লিমেন্টের সময় ছোঁয়া যাবে না

- `OrganogramAccessService::constrainVisibleEmployees` ও `userBypassesOrganogramEmployeeScope`।
- তিনটি evaluation workflow-এর পরের স্ট্যাটাস ও স্বাক্ষরকারী।
- `blocked_sections` কলাম ও রোল স্ক্রিনের সেকশন লক।
- কাস্টম role-এ সিঙ্ক।

## শেষ যাচাই

সব অংশ শেষে:

- `php artisan permissions:audit` সব `routes/web/*.php` ফাইল দেখে। আজকের কমান্ড শুধু `routes/web.php` ও `routes/api.php` দেখে, তাই কমান্ডটা আগে ঠিক করতে হবে, অংশ ১-এ।
- একই ইউজার দিয়ে সার্ভার `hasPermission` ও ব্রাউজার `hasAppPermission` মিলবে।
- Branch Account loan/fund/employee alias হারাবে, বাকি সরাসরি key থাকবে।
- Organogram ইউজার payroll, loan, fund পাবে না, অন্য role-এ key থাকলেও।
- Designation-এ manager লিখলেই evaluation এডিট খুলবে না।
- Super Admin সব ক্যাটালগ key পাবে।
