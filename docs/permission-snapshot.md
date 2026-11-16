# Permission snapshot

Source: `C:\Users\istia\Downloads\mousumibd.org-db-2026-11-13_11-00\db\hrm_db.sql` (dump dated 2026-11-13). The dump was parsed. It was not imported, and `permissions:sync-default-roles` / `fix-permissions` were not run.

Catalog at snapshot time: 148 keys, before `documents.delete` and `trainee-evaluations.*` were added for routes that already used them.

## Roles

19 roles in the dump. 18 names match `config/default_roles.php`. Their permission JSON matches `PermissionRegistry::resolvePermissionList()` exactly (no missing keys, no extra keys).

Only in the database: **Test** (id 11). Permissions decode to `users.view`, `users.create`, `users.edit`, `users.delete`. The stored JSON is double-encoded; runtime still reads it. `blocked_sections` is null. Sync must not overwrite this role.

Only in config: none.

`blocked_sections`: Accountant is `payroll`, `store`, `recruitment`, `training`, `administration`, `human-resources`. Every other role is `[]`, including Department Head. Config comments for Department Head are not what the database has. Sync and reset must not write `blocked_sections`.

## Alias-only roles

**Branch Account** has `payroll.view` and does not have `employee-loan.view`, `staff-fund.view`, or `employees.view`. Those pages open through the privilege alias. The keys were not copied onto the role, because a direct `employee-loan.view` / `staff-fund.view` is what opens the full employee directory for non-branch users. Branch Account is already excluded from that bypass.

No other role is alias-only for those keys. Accountant has `employee-loan.*` and `staff-fund.*` directly, including `fixed-assets.delete`.

## Legacy keys

No role JSON contains `leaves.*`, `leaves_type.*`, or `attendance.self`. The leave rename alias stays until the dashboard reads `leave-applications.view` and a later pass removes it. `attendance.self` was not added to the catalog and was not granted.

## Payroll block

Users who are not Super Admin, who have an organogram line role or `department_head` / `branch_manager` / `organogram.*`, and who also hold a payroll, loan, or staff-fund key: **0**.

Line roles do not currently hold those keys, so the hard deny is not hiding a grant today. The editable `block_payroll_module` flag still defaults on for Executive Director, Director (Microfinance), Assistant Director (Microfinance), Zonal Manager, Regional Manager, Branch Manager, Department Head, and Team Leader. It stays off when the role has `employees.admin` (HR Admin, HR Manager, HR Assistant). Super Admin is exempt in `hasPermission`.

## Evaluation via designation only

108 users have a designation containing manager or director, and no role key under `promotion-evaluations.*`, `confirmation-evaluations.*`, or `probation-increment-evaluations.*`. The designation and role-name shortcut stays. Evaluation keys were not added to the Employee role.

By designation:

- 18 Junior Branch Manager
- 15 Branch Manager-3
- 14 Assistant Branch Manager
- 7 Branch Manager-2
- 6 Senior Manager (Audit)
- 4 Branch Manager
- 3 Assistant Manager (Audit)
- 3 Branch Manager-1
- 3 Area Manager
- 3 Trainee Branch Manager
- 3 Probationary Branch Manager
- 2 Asst. Manager (Audit)
- 2 Manager (Admin)
- 2 Manager (Audit)
- 2 Regional Manager-2
- 2 Acting Area Manager
- 1 Director (F&A)
- 1 Sr. Manager (Audit)
- 1 Sr. Manager (IT)
- 1 Senior Manager (Admin)
- 1 Manager (IT)
- 1 Manager IT
- 1 Senior Manager (CRM)
- 1 Project Manager
- 1 Assistant Manager (IT)
- 1 Senior Manager (Accounts)
- 1 Zonal Manager
- 1 Deputy Director (Program)
- 1 Assistant Manager (F&A)
- 1 Manager Monitoring
- 1 Agrosor Manager
- 1 Junior Regional Manager
- 1 Manager Training
- 1 Director (Audit & Monitoring)
- 1 Manager (CRM)

User ids: 16, 17, 18, 20, 21, 22, 23, 24, 25, 27, 28, 29, 33, 37, 47, 49, 56, 89, 96, 108, 113, 119, 126, 133, 135, 143, 153, 156, 157, 165, 167, 180, 186, 188, 200, 204, 214, 269, 276, 277, 278, 282, 283, 284, 289, 300, 333, 334, 342, 374, 394, 413, 422, 429, 430, 444, 485, 537, 563, 566, 618, 625, 640, 643, 644, 648, 649, 659, 661, 665, 667, 678, 697, 705, 726, 737, 749, 751, 767, 775, 783, 784, 801, 810, 821, 831, 856, 913, 919, 925, 961, 964, 966, 967, 972, 980, 982, 994, 1009, 1010, 1074, 1079, 1100, 1136, 1150, 1273, 1322, 1344.

## Grants added after the equal lists

These are not in the snapshot lists. They are added so new route middleware does not close a page that login already opens:

- `documents.view` on every default role.
- `documents.manage` on roles that manage documents today: Super Admin, HR Admin (already present), HR Manager, HR Assistant, Administrator, Department Head.
- `documents.delete` and the four `trainee-evaluations.*` route keys on Super Admin only, because that role's list is the full catalog.
- `profile.view` and `profile.edit` on Branch Account, the only default role missing them, before settings uses those keys.
