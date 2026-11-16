# Route permission matrix

Generated from the registered route list. A route with more than one `CheckPermission` entry requires every key (AND). A single entry that contains a comma is any one of those keys (OR).

Self-service stays login-only: own check-in, payslip, loan, PF, movement-penalty payment, login, office map, section picker, notices, and notifications. `employee/dashboard` stays a controller check. `employees/global-search` stays login-only. Resignation and final-clearance routes have no permission middleware. Administration home stays the existing OR inside the controller (`admin.access`, `roles.view`, `users.view`, or `sessions.view`), not a sole `admin.access` middleware.

Mobile `routes/api_v1.php` has no permission middleware. Those actions use the same `hasPermission` checks inside services. `documents.delete` gates document edit, pin, and delete. `trainee-evaluations.*` were already on routes and are now in the catalog. No resignation keys were added.

Movement penalty list uses `movements.view`, and the controller still requires `movements.approve` or `movements.edit`. Sync and bulk accept `movements.edit` or `movements.approve`. Employee lookup accepts `employees.view`, `attendance.view`, or `reports.view`. Location pickers on employee create/edit use `employees.view`. Leave PDF uses `leave-applications.view`. Settings profile, password, and appearance use `profile.view` / `profile.edit`. Notifications stay login-only.

## Keyed routes

### (employees.view OR attendance.view OR reports.view)

- GET|HEAD /employees/lookup — employees.lookup

### (movements.approve OR movements.edit)

- POST /movement-penalties/{id}/approve — movement-penalties.approve
- POST /movement-penalties/{id}/reject — movement-penalties.reject

### (movements.edit OR movements.approve)

- POST /movement-penalties/bulk — movement-penalties.bulk
- POST /movement-penalties/sync — movement-penalties.sync

### admin.access

- GET|HEAD /admin/activity-logs — admin.activity-logs.index
- GET|HEAD /admin/notices — admin.notices.index
- POST /admin/notices — admin.notices.store
- GET|HEAD /admin/notices/create — admin.notices.create
- GET|HEAD /admin/notices/{notice} — admin.notices.show
- DELETE /admin/notices/{notice} — admin.notices.destroy
- GET|HEAD /admin/roles/fix-permissions — admin.roles.fix-permissions
- GET|HEAD /admin/users/bulk-email/form — admin.users.bulk-email.form
- POST /admin/users/bulk-email/send — admin.users.bulk-email.send
- GET|HEAD /admin/utils/storage-link — admin.utils.storage-link
- GET|HEAD /admin/utils/storage-link-copy — admin.utils.storage-link-copy

### admin.access AND roles.view

- GET|HEAD /admin/permissions — admin.permissions.index
- GET|HEAD /admin/roles — admin.roles.index
- GET|HEAD /admin/roles/{role} — admin.roles.show

### admin.access AND roles.view AND roles.create

- POST /admin/roles — admin.roles.store
- GET|HEAD /admin/roles/create — admin.roles.create

### admin.access AND roles.view AND roles.delete

- DELETE /admin/roles/{role} — admin.roles.destroy

### admin.access AND roles.view AND roles.edit

- POST /admin/roles/reset-defaults — admin.roles.reset-defaults
- POST /admin/roles/sync-defaults — admin.roles.sync-defaults
- POST /admin/roles/sync-line-roles — admin.roles.sync-line-roles
- PUT /admin/roles/{role} — admin.roles.update
- PATCH /admin/roles/{role} — admin.roles.
- GET|HEAD /admin/roles/{role}/edit — admin.roles.edit

### admin.access AND users.view

- GET|HEAD /admin/users — admin.users.index

### admin.access AND users.view AND users.create

- POST /admin/users — admin.users.store
- GET|HEAD /admin/users/create — admin.users.create

### admin.access AND users.view AND users.delete

- DELETE /admin/users/{user} — admin.users.destroy

### admin.access AND users.view AND users.edit

- POST /admin/users/sync-branches — admin.users.sync-branches
- PUT /admin/users/{user} — admin.users.update
- PATCH /admin/users/{user} — admin.users.
- GET|HEAD /admin/users/{user}/edit — admin.users.edit
- POST /admin/users/{user}/toggle-status — admin.users.toggle-status

### attendance.admin

- GET|HEAD /zkteco — zkteco.dashboard
- POST /zkteco/sync-all — zkteco.sync-all
- POST /zkteco/sync-device/{device} — zkteco.sync-device
- POST /zkteco/test-connection/{device} — zkteco.test-connection
- POST /zkteco/upload-employees/{device} — zkteco.upload-employees

### attendance.view

- GET|HEAD /attendance — attendance.index
- GET|HEAD /attendance/bulk-preview — attendance.bulk-preview
- POST /attendance/bulk-store — attendance.bulk-store
- GET|HEAD /attendance/daily-branch-summary — attendance.daily-branch-summary
- GET|HEAD /attendance/monthly — attendance.monthly
- GET|HEAD /attendance/pdf — attendance.pdf
- GET|HEAD /attendance/report — attendance.report
- POST /attendance/report — attendance.
- GET|HEAD /attendance/report/pdf — attendance.report.pdf
- GET|HEAD /attendance/sheet-report — attendance.sheet-report
- GET|HEAD /exports/attendance/monthly — exports.attendance.monthly

### attendance.view AND attendance.admin

- GET|HEAD /attendance/devices — attendance.devices.index
- POST /attendance/devices — attendance.devices.store
- GET|HEAD /attendance/devices/biometric-ids — attendance.devices.biometric-ids
- GET|HEAD /attendance/devices/create — attendance.devices.create
- GET|HEAD /attendance/devices/sync-report — attendance.devices.sync-report
- PUT /attendance/devices/sync-settings — attendance.devices.sync-settings
- PUT /attendance/devices/{device} — attendance.devices.update
- DELETE /attendance/devices/{device} — attendance.devices.destroy
- GET|HEAD /attendance/devices/{device}/edit — attendance.devices.edit
- PATCH /attendance/devices/{device}/sync-flags — attendance.devices.sync-flags
- POST /attendance/devices/{device}/test-connection — attendance.devices.test-connection
- GET|HEAD /attendance/settings — attendance.settings.index
- POST /attendance/settings — attendance.settings.store
- GET|HEAD /attendance/settings/create — attendance.settings.create
- PUT /attendance/settings/device-log-keep — attendance.settings.device-log-keep
- POST /attendance/settings/devices/{device}/push-missing — attendance.settings.devices.push-missing
- POST /attendance/settings/employee-branches — attendance.settings.employee-branches.store
- DELETE /attendance/settings/employee-branches/{employee} — attendance.settings.employee-branches.destroy
- GET|HEAD /attendance/settings/employee-times — attendance.settings.employee-times
- PUT /attendance/settings/employee-times/{employee} — attendance.settings.employee-times.upsert
- DELETE /attendance/settings/employee-times/{employee} — attendance.settings.employee-times.destroy
- PUT /attendance/settings/guard-shift — attendance.settings.guard-shift
- POST /attendance/settings/office-open-dates — attendance.settings.office-open-dates.store
- DELETE /attendance/settings/office-open-dates/{officeOpenDate} — attendance.settings.office-open-dates.destroy
- POST /attendance/settings/project-branches — attendance.settings.project-branches.store
- DELETE /attendance/settings/project-branches/{project} — attendance.settings.project-branches.destroy
- POST /attendance/settings/toggle-bulk-attendance — attendance.settings.toggle-bulk-attendance
- POST /attendance/settings/toggle-multi-day-movement — attendance.settings.toggle-multi-day-movement
- PUT /attendance/settings/{setting} — attendance.settings.update
- DELETE /attendance/settings/{setting} — attendance.settings.destroy
- GET|HEAD /attendance/settings/{setting}/edit — attendance.settings.edit

### attendance.view AND attendance.create

- POST /attendance — attendance.store
- GET|HEAD /attendance/create — attendance.create

### attendance.view AND attendance.delete

- DELETE /attendance/{attendance} — attendance.destroy

### attendance.view AND attendance.edit

- PUT /attendance/employees/{employee}/biometric-id — attendance.employees.biometric-id
- PUT /attendance/{attendance} — attendance.update
- GET|HEAD /attendance/{attendance}/edit — attendance.edit

### attendance.view AND attendance.sync

- POST /attendance/sync-devices — attendance.sync-devices

### branches.view

- GET|HEAD /branches — branches.index
- GET|HEAD /branches/{branch} — branches.show
- GET|HEAD /organization-structure — organization-structure.index

### branches.view AND branches.create

- POST /branches — branches.store
- GET|HEAD /branches/create — branches.create

### branches.view AND branches.delete

- DELETE /branches/{branch} — branches.destroy

### branches.view AND branches.edit

- PUT /branches/{branch} — branches.update
- GET|HEAD /branches/{branch}/edit — branches.edit
- PATCH /organization-structure/branches/{branch}/regional-office — organization-structure.branches.regional-office

### branches.view AND regional-offices.edit

- PATCH /organization-structure/regional-offices/{regionalOffice}/zone — organization-structure.regional-offices.zone

### confirmation-evaluations.view

- GET|HEAD /confirmation-evaluations — confirmation.evaluations.index
- GET|HEAD /confirmation-evaluations/{evaluation} — confirmation.evaluations.show
- PUT /confirmation-evaluations/{evaluation} — confirmation.evaluations.update
- DELETE /confirmation-evaluations/{evaluation} — confirmation.evaluations.destroy
- GET|HEAD /confirmation-evaluations/{evaluation}/edit — confirmation.evaluations.edit
- POST /confirmation-evaluations/{evaluation}/forward — confirmation.evaluations.forward
- GET|HEAD /confirmation-evaluations/{evaluation}/print — confirmation.evaluations.print
- POST /confirmation-evaluations/{evaluation}/reset-workflow — confirmation.evaluations.reset-workflow
- POST /confirmation-evaluations/{evaluation}/send-back — confirmation.evaluations.sendBack
- PUT /confirmation-evaluations/{evaluation}/signatures/{signature}/comment — confirmation.evaluations.signatures.comment

### confirmation-evaluations.view AND confirmation-evaluations.approve

- POST /confirmation-evaluations/{evaluation}/ed-approve — confirmation.evaluations.edApprove

### confirmation-evaluations.view AND confirmation-evaluations.create

- POST /confirmation-evaluations — confirmation.evaluations.store
- GET|HEAD /confirmation-evaluations/create — confirmation.evaluations.create
- GET|HEAD /confirmation-evaluations/employees/lookup — confirmation.evaluations.employees.lookup

### confirmation-evaluations.view AND confirmation-evaluations.hr_verify

- POST /confirmation-evaluations/{evaluation}/hr-verify — confirmation.evaluations.hrVerify

### confirmations.view

- GET|HEAD /confirmations — confirmations.index
- GET|HEAD /confirmations/{confirmation} — confirmations.show

### confirmations.view AND confirmations.approve

- POST /confirmations/{confirmation}/approve — confirmations.approve
- POST /confirmations/{confirmation}/reject — confirmations.reject

### confirmations.view AND confirmations.create

- POST /confirmations — confirmations.store
- GET|HEAD /confirmations/create — confirmations.create

### confirmations.view AND confirmations.edit

- PUT /confirmations/{confirmation} — confirmations.update
- POST /confirmations/{confirmation}/cancel — confirmations.cancel
- POST /confirmations/{confirmation}/complete — confirmations.complete
- GET|HEAD /confirmations/{confirmation}/edit — confirmations.edit

### demotions.view

- GET|HEAD /demotions — demotions.index
- GET|HEAD /demotions/{demotion} — demotions.show

### demotions.view AND demotions.approve

- POST /demotions/{demotion}/approve — demotions.approve
- POST /demotions/{demotion}/reject — demotions.reject

### demotions.view AND demotions.create

- POST /demotions — demotions.store
- GET|HEAD /demotions/create — demotions.create

### demotions.view AND demotions.edit

- PUT /demotions/{demotion} — demotions.update
- POST /demotions/{demotion}/cancel — demotions.cancel
- POST /demotions/{demotion}/complete — demotions.complete
- GET|HEAD /demotions/{demotion}/edit — demotions.edit

### departments.view

- GET|HEAD /departments — departments.index
- GET|HEAD /departments/{department} — departments.show
- GET|HEAD /employee-types — employee-types.index
- GET|HEAD /programs — programs.index
- GET|HEAD /projects — projects.index

### departments.view AND departments.create

- POST /departments — departments.store
- GET|HEAD /departments/create — departments.create

### departments.view AND departments.delete

- DELETE /departments/{department} — departments.destroy

### departments.view AND departments.edit

- PUT /departments/{department} — departments.update
- GET|HEAD /departments/{department}/edit — departments.edit

### departments.view AND employees.create

- POST /employee-types — employee-types.store
- GET|HEAD /employee-types/create — employee-types.create
- POST /programs — programs.store
- GET|HEAD /programs/create — programs.create
- POST /projects — projects.store
- GET|HEAD /projects/create — projects.create

### departments.view AND employees.delete

- DELETE /employee-types/{employee_type} — employee-types.destroy
- DELETE /programs/{program} — programs.destroy
- DELETE /projects/{project} — projects.destroy

### departments.view AND employees.edit

- PUT /employee-types/{employee_type} — employee-types.update
- GET|HEAD /employee-types/{employee_type}/edit — employee-types.edit
- PUT /programs/{program} — programs.update
- GET|HEAD /programs/{program}/edit — programs.edit
- PUT /projects/{project} — projects.update
- GET|HEAD /projects/{project}/edit — projects.edit

### designations.view

- GET|HEAD /designations — designations.index
- GET|HEAD /designations/{designation} — designations.show

### designations.view AND designations.create

- POST /designations — designations.store
- GET|HEAD /designations/create — designations.create

### designations.view AND designations.delete

- DELETE /designations/{designation} — designations.destroy

### designations.view AND designations.edit

- PUT /designations/{designation} — designations.update
- GET|HEAD /designations/{designation}/edit — designations.edit

### documents.delete

- PUT|PATCH|POST /documents/{document} — documents.update
- DELETE /documents/{document} — documents.destroy
- POST /documents/{document}/toggle-pin — documents.toggle-pin

### documents.manage

- POST /document-categories — document-categories.store
- DELETE /document-categories/{category} — document-categories.destroy
- POST /documents — documents.store

### documents.view

- GET|HEAD /documents/{document}/download — documents.download
- GET|HEAD /documents/{document}/preview — documents.preview
- GET|HEAD /sections/documents — sections.documents

### employee-loan.view

- GET|HEAD /employee-loan/reports — employee-loan.reports.index
- GET|HEAD /employee-loan/reports/{report} — employee-loan.reports.show
- GET|HEAD /employee-loan/reports/{report}/print — employee-loan.reports.print
- GET|HEAD /employee-loans — employee-loans.index
- GET|HEAD /employee-loans/ledger-lookup — employee-loans.ledger-lookup
- GET|HEAD /employee-loans/second-motorcycle — employee-loans.second-motorcycle.create
- POST /employee-loans/second-motorcycle — employee-loans.second-motorcycle.store
- GET|HEAD /employee-loans/{employee_loan} — employee-loans.show
- GET|HEAD /employee-loans/{employee_loan}/ledger — employee-loans.ledger
- GET|HEAD /loan-applications — loan-applications.index
- POST /loan-applications/calculate-preview — loan-applications.calculate-preview
- GET|HEAD /loan-applications/employee-preview/{employee} — loan-applications.employee-preview
- GET|HEAD /loan-applications/{loan_application} — loan-applications.show
- GET|HEAD /loan-approval — loan-approval.index
- GET|HEAD /loan-collection — loan-collection.index
- GET|HEAD /loan-collection/{loan_collection} — loan-collection.show
- GET|HEAD /loan-committees — loan-committees.index
- GET|HEAD /loan-disburse — loan-disburse.index
- GET|HEAD /loan-migration — loan-migration.index
- POST /loan-migration/calculate-preview — loan-migration.calculate-preview
- GET|HEAD /loan-migration/{loan_migration} — loan-migration.show
- GET|HEAD /loan-policies — loan-policies.index
- GET|HEAD /loan-rollback — loan-rollback.index
- GET|HEAD /loan-transfer — loan-transfer.index
- GET|HEAD /loan-transfer/{loan_transfer} — loan-transfer.show

### employee-loan.view AND employee-loan.create

- POST /employee-loans — employee-loans.store
- GET|HEAD /employee-loans/create — employee-loans.create
- POST /loan-applications — loan-applications.store
- GET|HEAD /loan-applications/create — loan-applications.create
- POST /loan-committees — loan-committees.store
- GET|HEAD /loan-committees/create — loan-committees.create
- POST /loan-disburse/{loan_application} — loan-disburse.disburse
- POST /loan-migration — loan-migration.store
- GET|HEAD /loan-migration/create — loan-migration.create
- POST /loan-policies — loan-policies.store
- GET|HEAD /loan-policies/create — loan-policies.create

### employee-loan.view AND employee-loan.delete

- DELETE /employee-loans/{employee_loan} — employee-loans.destroy
- DELETE /loan-applications/{loan_application} — loan-applications.destroy
- DELETE /loan-committees/{loan_committee} — loan-committees.destroy
- DELETE /loan-policies/{loan_policy} — loan-policies.destroy

### employee-loan.view AND employee-loan.edit

- PUT /employee-loans/transactions/{transaction} — employee-loans.transactions.update
- DELETE /employee-loans/transactions/{transaction} — employee-loans.transactions.destroy
- POST /employee-loans/{employee_loan}/cancel — employee-loans.cancel
- POST /employee-loans/{employee_loan}/full-paid — employee-loans.full-paid.store
- POST /employee-loans/{employee_loan}/full-paid/preview — employee-loans.full-paid.preview
- PUT /employee-loans/{employee_loan}/ledger-terms — employee-loans.ledger-terms.update
- POST /employee-loans/{employee_loan}/ledger-terms/recalculate — employee-loans.ledger-terms.recalculate
- POST /employee-loans/{employee_loan}/restore — employee-loans.restore
- POST /employee-loans/{employee_loan}/rollback — employee-loans.rollback
- PUT /loan-applications/{loan_application} — loan-applications.update
- GET|HEAD /loan-applications/{loan_application}/edit — loan-applications.edit
- POST /loan-approval/{loan_application}/approve — loan-approval.approve
- POST /loan-approval/{loan_application}/reject — loan-approval.reject
- GET|HEAD /loan-collection/advance — loan-collection.advance.create
- POST /loan-collection/advance — loan-collection.advance.store
- GET|HEAD /loan-collection/batch — loan-collection.batch.create
- POST /loan-collection/batch — loan-collection.batch.store
- GET|HEAD /loan-collection/rebate — loan-collection.rebate.create
- POST /loan-collection/rebate — loan-collection.rebate.store
- POST /loan-collection/rebate/preview — loan-collection.rebate.preview
- GET|HEAD /loan-collection/rollback — loan-collection.rollback.index
- GET|HEAD /loan-collection/single — loan-collection.single.create
- POST /loan-collection/single — loan-collection.single.store
- GET|HEAD /loan-collection/waive — loan-collection.waive.create
- POST /loan-collection/waive — loan-collection.waive.store
- POST /loan-collection/{loan_collection}/rollback — loan-collection.rollback
- PUT /loan-committees/{loan_committee} — loan-committees.update
- GET|HEAD /loan-committees/{loan_committee}/edit — loan-committees.edit
- POST /loan-disburse/{loan_application}/cancel — loan-disburse.cancel
- PUT /loan-migration/items/{loan_migration_item} — loan-migration.items.update
- POST /loan-migration/items/{loan_migration_item}/recalculate — loan-migration.items.recalculate
- PUT /loan-migration/{loan_migration} — loan-migration.update
- PUT /loan-policies/{loan_policy} — loan-policies.update
- GET|HEAD /loan-policies/{loan_policy}/edit — loan-policies.edit
- POST /loan-rollback/loans — loan-rollback.loans
- POST /loan-rollback/migrations/{loan_migration} — loan-rollback.migrations
- POST /loan-transfer — loan-transfer.store
- GET|HEAD /loan-transfer/create — loan-transfer.create

### employee-loan.view AND reports.export

- GET|HEAD /employee-loan/reports/{report}/excel — employee-loan.reports.excel
- GET|HEAD /employee-loan/reports/{report}/pdf — employee-loan.reports.pdf

### employees.view

- GET|HEAD /employees — employees.index
- POST /employees — employees.store
- GET|HEAD /employees-blank-form — employees.blank-form
- GET|HEAD /employees/create — employees.create
- GET|HEAD /employees/export.xlsx — employees.export
- GET|HEAD /employees/import/example.xlsx — employees.import.example
- GET|HEAD /employees/locations/unions — employees.locations.unions
- GET|HEAD /employees/locations/upazilas — employees.locations.upazilas
- GET|HEAD /employees/salary-assignment-preview — employees.salary-assignment-preview
- GET|HEAD /employees/{employee} — employees.show
- PUT|PATCH /employees/{employee} — employees.update
- DELETE /employees/{employee} — employees.destroy
- GET|HEAD /employees/{employee}/documents — employees.documents.index
- GET|HEAD /employees/{employee}/documents/{document}/download — employees.documents.download
- GET|HEAD /employees/{employee}/edit — employees.edit
- GET|HEAD /employees/{employee}/leaves — employees.leaves.index
- GET|HEAD /employees/{employee}/leaves/download — employees.leaves.download
- GET|HEAD /employees/{employee}/movements — employees.movements.index
- GET|HEAD /employees/{employee}/movements/download — employees.movements.download
- GET|HEAD /organization-chart — organization.chart

### employees.view AND employees.create

- POST /employees/import/commit — employees.import.commit
- POST /employees/import/preview — employees.import.preview
- GET|HEAD /employees/import/review/{importId} — employees.import.review
- GET|HEAD /employees/pin-suggestion — employees.pin-suggestion
- POST /employees/unions — employees.unions.store
- POST /employees/villages — employees.villages.store

### employees.view AND employees.delete

- DELETE /employees/{employee}/documents/{document} — employees.documents.destroy

### employees.view AND employees.edit

- GET|HEAD /disciplinary-actions — disciplinary-actions.index
- POST /disciplinary-actions — disciplinary-actions.store
- GET|HEAD /disciplinary-actions/create — disciplinary-actions.create
- DELETE /disciplinary-actions/{disciplinary_action} — disciplinary-actions.destroy
- POST /employees/{employee}/documents — employees.documents.store
- GET|HEAD /employees/{employee}/documents/create — employees.documents.create
- PUT /employees/{employee}/documents/{document} — employees.documents.update
- GET|HEAD /employees/{employee}/documents/{document}/edit — employees.documents.edit
- PATCH /employees/{employee}/status — employees.update-status

### fixed-assets.view

- GET|HEAD /asset-assignments — asset-assignments.index
- GET|HEAD /asset-assignments/employees — asset-assignments.employees
- GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS /asset-categories
- GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS /asset-categories/create
- GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS /asset-depreciation
- GET|HEAD /asset-depreciation — asset-depreciation.index
- GET|HEAD /asset-depreciation/schedule/{fixed_asset} — asset-depreciation.schedule
- GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS /asset-disposals
- GET|HEAD /asset-disposals — asset-disposals.index
- GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS /asset-disposals/create
- GET|HEAD /asset-maintenances — asset-maintenances.index
- GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS /asset-transfers
- GET|HEAD /asset-transfers — asset-transfers.index
- GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS /asset-transfers/create
- GET|HEAD /fixed-asset/assets/guarantees — fixed-asset.assets.guarantees.index
- GET|HEAD /fixed-asset/assets/insurance — fixed-asset.assets.insurance.index
- GET|HEAD /fixed-asset/assets/not-in-use — fixed-asset.assets.not-in-use.index
- GET|HEAD /fixed-asset/assets/not-in-use/history — fixed-asset.assets.not-in-use.history
- GET|HEAD /fixed-asset/assets/tracking — fixed-asset.assets.tracking.index
- GET|HEAD /fixed-asset/assets/warranties — fixed-asset.assets.warranties.index
- GET|HEAD /fixed-asset/custodian/changes — fixed-asset.custodian.changes.index
- GET|HEAD /fixed-asset/custodian/custodians — fixed-asset.custodian.custodians.index
- GET|HEAD /fixed-asset/custodian/custodians/employees — fixed-asset.custodian.custodians.employees
- GET|HEAD /fixed-asset/custodian/departments — fixed-asset.custodian.departments.index
- GET|HEAD /fixed-asset/custodian/designations — fixed-asset.custodian.designations.index
- GET|HEAD /fixed-asset/depreciation — fixed-asset.depreciation.index
- GET|HEAD /fixed-asset/depreciation/calculation — fixed-asset.depreciation.calculation
- GET|HEAD /fixed-asset/depreciation/manual — fixed-asset.depreciation.manual
- GET|HEAD /fixed-asset/depreciation/posting — fixed-asset.depreciation.posting
- GET|HEAD /fixed-asset/depreciation/rollback — fixed-asset.depreciation.rollback
- GET|HEAD /fixed-asset/depreciation/schedule/{fixed_asset} — fixed-asset.depreciation.schedule
- GET|HEAD /fixed-asset/disposal/reasons — fixed-asset.disposal.reasons.index
- GET|HEAD /fixed-asset/disposal/requests — fixed-asset.disposal.requests.index
- GET|HEAD /fixed-asset/disposals — fixed-asset.disposals.register
- GET|HEAD /fixed-asset/purchases — fixed-asset.purchases.index
- GET|HEAD /fixed-asset/purchases/preview-codes — fixed-asset.purchases.preview-codes
- GET|HEAD /fixed-asset/purchases/sub-categories — fixed-asset.purchases.sub-categories
- GET|HEAD /fixed-asset/purchases/{purchase} — fixed-asset.purchases.show
- GET|HEAD /fixed-asset/reports — fixed-asset.reports.index
- GET|HEAD /fixed-asset/reports/{report} — fixed-asset.reports.show
- GET|HEAD /fixed-asset/reports/{report}/excel — fixed-asset.reports.excel
- GET|HEAD /fixed-asset/reports/{report}/pdf — fixed-asset.reports.pdf
- GET|HEAD /fixed-asset/reports/{report}/print — fixed-asset.reports.print
- GET|HEAD /fixed-asset/settings/categories — fixed-asset.settings.categories.index
- GET|HEAD /fixed-asset/settings/financial-years — fixed-asset.settings.financial-years.index
- GET|HEAD /fixed-asset/settings/sub-categories — fixed-asset.settings.sub-categories.index
- GET|HEAD /fixed-asset/settings/vendors — fixed-asset.settings.vendors.index
- GET|HEAD /fixed-asset/stock/branch-wise — fixed-asset.stock.branch-wise
- GET|HEAD /fixed-asset/stock/category-wise — fixed-asset.stock.category-wise
- GET|HEAD /fixed-asset/transfer/branch — fixed-asset.transfer.branch.index
- GET|HEAD /fixed-asset/transfer/history — fixed-asset.transfer.history
- GET|HEAD /fixed-assets — fixed-assets.index
- GET|HEAD /fixed-assets/{fixed_asset} — fixed-assets.show
- GET|HEAD /sections/fixed-asset — sections.fixed-asset

### fixed-assets.view AND fixed-assets.create

- POST /fixed-asset/assets/guarantees — fixed-asset.assets.guarantees.store
- GET|HEAD /fixed-asset/assets/guarantees/create — fixed-asset.assets.guarantees.create
- POST /fixed-asset/assets/insurance — fixed-asset.assets.insurance.store
- GET|HEAD /fixed-asset/assets/insurance/create — fixed-asset.assets.insurance.create
- POST /fixed-asset/assets/warranties — fixed-asset.assets.warranties.store
- GET|HEAD /fixed-asset/assets/warranties/create — fixed-asset.assets.warranties.create
- POST /fixed-asset/custodian/custodians — fixed-asset.custodian.custodians.store
- GET|HEAD /fixed-asset/custodian/custodians/create — fixed-asset.custodian.custodians.create
- POST /fixed-asset/custodian/departments — fixed-asset.custodian.departments.store
- GET|HEAD /fixed-asset/custodian/departments/create — fixed-asset.custodian.departments.create
- POST /fixed-asset/custodian/designations — fixed-asset.custodian.designations.store
- GET|HEAD /fixed-asset/custodian/designations/create — fixed-asset.custodian.designations.create
- POST /fixed-asset/disposal/reasons — fixed-asset.disposal.reasons.store
- GET|HEAD /fixed-asset/disposal/reasons/create — fixed-asset.disposal.reasons.create
- POST /fixed-asset/purchases — fixed-asset.purchases.store
- GET|HEAD /fixed-asset/purchases/create — fixed-asset.purchases.create
- POST /fixed-asset/settings/categories — fixed-asset.settings.categories.store
- GET|HEAD /fixed-asset/settings/categories/create — fixed-asset.settings.categories.create
- POST /fixed-asset/settings/financial-years — fixed-asset.settings.financial-years.store
- GET|HEAD /fixed-asset/settings/financial-years/create — fixed-asset.settings.financial-years.create
- POST /fixed-asset/settings/sub-categories — fixed-asset.settings.sub-categories.store
- GET|HEAD /fixed-asset/settings/sub-categories/create — fixed-asset.settings.sub-categories.create
- POST /fixed-asset/settings/vendors — fixed-asset.settings.vendors.store
- GET|HEAD /fixed-asset/settings/vendors/create — fixed-asset.settings.vendors.create
- POST /fixed-assets — fixed-assets.store
- GET|HEAD /fixed-assets/create — fixed-assets.create
- GET|HEAD /fixed-assets/import — fixed-assets.import.index
- POST /fixed-assets/import/commit — fixed-assets.import.commit
- POST /fixed-assets/import/preview — fixed-assets.import.preview

### fixed-assets.view AND fixed-assets.delete

- POST /asset-disposals/{asset_disposal}/approve — asset-disposals.approve
- POST /asset-disposals/{asset_disposal}/reject — asset-disposals.reject
- DELETE /asset-maintenances/{asset_maintenance} — asset-maintenances.destroy
- DELETE /fixed-asset/assets/guarantees/{guarantee} — fixed-asset.assets.guarantees.destroy
- DELETE /fixed-asset/assets/insurance/{insurance} — fixed-asset.assets.insurance.destroy
- DELETE /fixed-asset/assets/warranties/{warranty} — fixed-asset.assets.warranties.destroy
- DELETE /fixed-asset/custodian/custodians/{custodian} — fixed-asset.custodian.custodians.destroy
- DELETE /fixed-asset/custodian/departments/{department} — fixed-asset.custodian.departments.destroy
- DELETE /fixed-asset/custodian/designations/{designation} — fixed-asset.custodian.designations.destroy
- POST /fixed-asset/disposal/batch — fixed-asset.disposal.batch.store
- GET|HEAD /fixed-asset/disposal/batch/create — fixed-asset.disposal.batch.create
- POST /fixed-asset/disposal/dispose — fixed-asset.disposal.dispose.store
- GET|HEAD /fixed-asset/disposal/dispose/create — fixed-asset.disposal.dispose.create
- DELETE /fixed-asset/disposal/reasons/{reason} — fixed-asset.disposal.reasons.destroy
- POST /fixed-asset/disposal/requests/{asset_disposal}/approve — fixed-asset.disposal.approve
- POST /fixed-asset/disposal/requests/{asset_disposal}/reject — fixed-asset.disposal.reject
- DELETE /fixed-asset/purchases/{purchase} — fixed-asset.purchases.destroy
- DELETE /fixed-asset/settings/categories/{asset_category} — fixed-asset.settings.categories.destroy
- DELETE /fixed-asset/settings/financial-years/{financial_year} — fixed-asset.settings.financial-years.destroy
- DELETE /fixed-asset/settings/sub-categories/{sub_category} — fixed-asset.settings.sub-categories.destroy
- DELETE /fixed-asset/settings/vendors/{vendor} — fixed-asset.settings.vendors.destroy
- DELETE /fixed-assets/{fixed_asset} — fixed-assets.destroy

### fixed-assets.view AND fixed-assets.edit

- POST /asset-assignments — asset-assignments.store
- GET|HEAD /asset-assignments/create — asset-assignments.create
- POST /asset-assignments/{asset_assignment}/release — asset-assignments.release
- POST /asset-depreciation/run — asset-depreciation.run
- POST /asset-disposals — asset-disposals.store
- GET|HEAD /asset-disposals/create — asset-disposals.create
- POST /asset-maintenances — asset-maintenances.store
- GET|HEAD /asset-maintenances/create — asset-maintenances.create
- PUT /asset-maintenances/{asset_maintenance} — asset-maintenances.update
- GET|HEAD /asset-maintenances/{asset_maintenance}/edit — asset-maintenances.edit
- POST /asset-transfers — asset-transfers.store
- GET|HEAD /asset-transfers/create — asset-transfers.create
- PUT /fixed-asset/assets/guarantees/{guarantee} — fixed-asset.assets.guarantees.update
- GET|HEAD /fixed-asset/assets/guarantees/{guarantee}/edit — fixed-asset.assets.guarantees.edit
- PUT /fixed-asset/assets/insurance/{insurance} — fixed-asset.assets.insurance.update
- GET|HEAD /fixed-asset/assets/insurance/{insurance}/edit — fixed-asset.assets.insurance.edit
- POST /fixed-asset/assets/not-in-use — fixed-asset.assets.not-in-use.store
- POST /fixed-asset/assets/not-in-use/{fixed_asset}/restore — fixed-asset.assets.not-in-use.restore
- PUT /fixed-asset/assets/warranties/{warranty} — fixed-asset.assets.warranties.update
- GET|HEAD /fixed-asset/assets/warranties/{warranty}/edit — fixed-asset.assets.warranties.edit
- POST /fixed-asset/custodian/changes — fixed-asset.custodian.changes.store
- GET|HEAD /fixed-asset/custodian/changes/create — fixed-asset.custodian.changes.create
- PUT /fixed-asset/custodian/custodians/{custodian} — fixed-asset.custodian.custodians.update
- GET|HEAD /fixed-asset/custodian/custodians/{custodian}/edit — fixed-asset.custodian.custodians.edit
- PUT /fixed-asset/custodian/departments/{department} — fixed-asset.custodian.departments.update
- GET|HEAD /fixed-asset/custodian/departments/{department}/edit — fixed-asset.custodian.departments.edit
- PUT /fixed-asset/custodian/designations/{designation} — fixed-asset.custodian.designations.update
- GET|HEAD /fixed-asset/custodian/designations/{designation}/edit — fixed-asset.custodian.designations.edit
- POST /fixed-asset/depreciation/manual — fixed-asset.depreciation.manual.store
- POST /fixed-asset/depreciation/posting — fixed-asset.depreciation.post
- POST /fixed-asset/depreciation/rollback — fixed-asset.depreciation.rollback.run
- PUT /fixed-asset/disposal/reasons/{reason} — fixed-asset.disposal.reasons.update
- GET|HEAD /fixed-asset/disposal/reasons/{reason}/edit — fixed-asset.disposal.reasons.edit
- POST /fixed-asset/disposal/requests — fixed-asset.disposal.requests.store
- GET|HEAD /fixed-asset/disposal/requests/create — fixed-asset.disposal.requests.create
- PUT|POST /fixed-asset/purchases/{purchase} — fixed-asset.purchases.update
- GET|HEAD /fixed-asset/purchases/{purchase}/edit — fixed-asset.purchases.edit
- PUT|POST /fixed-asset/purchases/{purchase}/update — fixed-asset.purchases.post-update
- PUT /fixed-asset/settings/categories/{asset_category} — fixed-asset.settings.categories.update
- GET|HEAD /fixed-asset/settings/categories/{asset_category}/edit — fixed-asset.settings.categories.edit
- PUT /fixed-asset/settings/financial-years/{financial_year} — fixed-asset.settings.financial-years.update
- POST /fixed-asset/settings/financial-years/{financial_year}/activate — fixed-asset.settings.financial-years.activate
- GET|HEAD /fixed-asset/settings/financial-years/{financial_year}/edit — fixed-asset.settings.financial-years.edit
- PUT /fixed-asset/settings/sub-categories/{sub_category} — fixed-asset.settings.sub-categories.update
- GET|HEAD /fixed-asset/settings/sub-categories/{sub_category}/edit — fixed-asset.settings.sub-categories.edit
- PUT /fixed-asset/settings/vendors/{vendor} — fixed-asset.settings.vendors.update
- GET|HEAD /fixed-asset/settings/vendors/{vendor}/edit — fixed-asset.settings.vendors.edit
- POST /fixed-asset/transfer/branch — fixed-asset.transfer.branch.store
- GET|HEAD /fixed-asset/transfer/branch/create — fixed-asset.transfer.branch.create
- POST /fixed-asset/transfer/custodian — fixed-asset.transfer.custodian.store
- GET|HEAD /fixed-asset/transfer/custodian/create — fixed-asset.transfer.custodian.create
- POST /fixed-asset/transfer/project — fixed-asset.transfer.project.store
- GET|HEAD /fixed-asset/transfer/project/create — fixed-asset.transfer.project.create
- PUT /fixed-assets/{fixed_asset} — fixed-assets.update
- GET|HEAD /fixed-assets/{fixed_asset}/edit — fixed-assets.edit
- POST /fixed-assets/{fixed_asset}/revaluation — fixed-assets.revaluation.store

### holidays.view

- GET|HEAD /holidays — holidays.index
- GET|HEAD /holidays/calendar — holidays.calendar
- GET|HEAD /holidays/{holiday} — holidays.show

### holidays.view AND holidays.create

- POST /holidays — holidays.store
- GET|HEAD /holidays/create — holidays.create

### holidays.view AND holidays.delete

- DELETE /holidays/{holiday} — holidays.destroy

### holidays.view AND holidays.edit

- PUT /holidays/{holiday} — holidays.update
- GET|HEAD /holidays/{holiday}/edit — holidays.edit

### inventory.view

- GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS /inventory/disburse — inventory.
- GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS /inventory/disburse/create — inventory.
- GET|HEAD /inventory/operations — inventory.operations.index
- GET|HEAD /inventory/operations/recipients — inventory.operations.recipients
- GET|HEAD /inventory/operations/stock-check — inventory.operations.stock-check
- GET|HEAD /inventory/products — inventory.products.index
- GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS /inventory/products/create — inventory.products.
- GET|HEAD /inventory/products/{inventory_product}/edit — inventory.products.
- GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS /inventory/reports/current-stock — inventory.reports.
- GET|HEAD /inventory/reports/product-ledger — inventory.reports.product-ledger
- GET|HEAD /inventory/reports/product-ledger/excel — inventory.reports.product-ledger.excel
- GET|HEAD /inventory/reports/product-ledger/pdf — inventory.reports.product-ledger.pdf
- GET|HEAD /inventory/reports/product-ledger/print — inventory.reports.product-ledger.print
- GET|HEAD /inventory/reports/stock-ledger — inventory.reports.stock-ledger
- GET|HEAD /inventory/reports/stock-ledger/excel — inventory.reports.stock-ledger.excel
- GET|HEAD /inventory/reports/stock-ledger/pdf — inventory.reports.stock-ledger.pdf
- GET|HEAD /inventory/reports/stock-ledger/print — inventory.reports.stock-ledger.print
- GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS /inventory/stock-in — inventory.
- GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS /inventory/stock-in/create — inventory.
- GET|HEAD /sections/inventory — sections.inventory

### inventory.view AND inventory.create

- POST /inventory/operations/disburse — inventory.operations.disburse
- POST /inventory/operations/recipients — inventory.operations.recipients.store
- POST /inventory/operations/stock-in — inventory.operations.stock-in
- POST /inventory/products — inventory.products.store
- POST /inventory/products/quick — inventory.products.quick

### inventory.view AND inventory.delete

- DELETE /inventory/operations/movements/{movement} — inventory.operations.movements.destroy
- DELETE /inventory/products/{inventory_product} — inventory.products.destroy

### inventory.view AND inventory.edit

- PUT /inventory/operations/movements/{movement} — inventory.operations.movements.update
- PUT /inventory/products/{inventory_product} — inventory.products.update

### leave-applications.approve

- POST /leave/applications/{application}/approve — leave.applications.approve
- POST /leave/applications/{application}/reject — leave.applications.reject

### leave-applications.cancel

- POST /leave/applications/{application}/cancel — leave.applications.cancel

### leave-applications.create

- POST /leave/applications — leave.applications.store
- GET|HEAD /leave/applications/create — leave.applications.create

### leave-applications.create AND leave-applications.approve

- GET|HEAD /leave/applications/auto-approve-eligibility — leave.applications.auto-approve-eligibility

### leave-applications.view

- GET|HEAD /leave/applications — leave.applications.index
- GET|HEAD /leave/applications/{application} — leave.applications.show
- GET|HEAD /leave/applications/{application}/document/{index} — leave.applications.download-document
- GET|HEAD /leave/applications/{application}/pdf — leave.applications.pdf

### leave-balances.view

- GET|HEAD /leave/balances — leave.balances.index

### leave-balances.view AND leave-balances.admin

- GET|HEAD /leave/balances/allocate-bulk — leave.balances.allocate-bulk
- POST /leave/balances/apply-defaults — leave.balances.apply-defaults
- POST /leave/balances/reset-for-new-year — leave.balances.reset-for-new-year
- POST /leave/balances/store-bulk — leave.balances.store-bulk

### leave-balances.view AND leave-balances.create

- POST /leave/balances — leave.balances.store
- GET|HEAD /leave/balances/create — leave.balances.create

### leave-balances.view AND leave-balances.edit

- PUT /leave/balances/{leaveBalance} — leave.balances.update
- GET|HEAD /leave/balances/{leaveBalance}/edit — leave.balances.edit

### leave-types.edit

- POST /leave/settings — leave.settings.store
- GET|HEAD /leave/settings/create — leave.settings.create
- PUT /leave/settings/{leaveApprovalTier} — leave.settings.update
- DELETE /leave/settings/{leaveApprovalTier} — leave.settings.destroy
- GET|HEAD /leave/settings/{leaveApprovalTier}/edit — leave.settings.edit

### leave-types.view

- GET|HEAD /leave/settings — leave.settings.index
- GET|HEAD /leave/types — leave.types.index

### leave-types.view AND leave-types.create

- POST /leave/types — leave.types.store
- GET|HEAD /leave/types/create — leave.types.create

### leave-types.view AND leave-types.delete

- DELETE /leave/types/{leaveType} — leave.types.destroy

### leave-types.view AND leave-types.edit

- PUT /leave/types/{leaveType} — leave.types.update
- GET|HEAD /leave/types/{leaveType}/edit — leave.types.edit

### movements.approve

- POST /movements/{movement}/approve — movements.approve
- POST /movements/{movement}/reject — movements.reject

### movements.cancel

- POST /movements/{movement}/cancel — movements.cancel

### movements.complete

- POST /movements/{movement}/complete — movements.complete

### movements.create

- POST /movements — movements.store
- GET|HEAD /movements/create — movements.create

### movements.delete

- POST /movements/bulk-destroy — movements.bulk-destroy
- DELETE /movements/{movement} — movements.destroy

### movements.edit

- PUT /movements/{movement} — movements.update
- GET|HEAD /movements/{movement}/edit — movements.edit

### movements.view

- GET|HEAD /movement-log-book-payments — movement-log-book-payments.index
- POST /movement-log-book-payments/process — movement-log-book-payments.process
- GET|HEAD /movement-log-book-payments/{payment} — movement-log-book-payments.show
- DELETE /movement-log-book-payments/{payment} — movement-log-book-payments.destroy
- POST /movement-log-book-payments/{payment}/approve — movement-log-book-payments.approve
- POST /movement-log-book-payments/{payment}/recommend — movement-log-book-payments.recommend
- POST /movement-log-book-payments/{payment}/reject — movement-log-book-payments.reject
- GET|HEAD /movement-log-book-payments/{payment}/voucher — movement-log-book-payments.voucher
- GET|HEAD /movement-log-books — movement-log-books.index
- GET|HEAD /movement-log-books/export/xlsx — movement-log-books.export.xlsx
- GET|HEAD /movement-log-books/print — movement-log-books.print
- PUT /movement-log-books/{logBook} — movement-log-books.update
- DELETE /movement-log-books/{logBook} — movement-log-books.destroy
- GET|HEAD /movement-log-books/{logBook} — movement-log-books.show
- GET|HEAD /movement-log-books/{logBook}/edit — movement-log-books.edit
- GET|HEAD /movement-penalties — movement-penalties.index
- GET|HEAD /movements — movements.index
- GET|HEAD /movements/export/xlsx — movements.export.xlsx
- GET|HEAD /movements/print — movements.print
- GET|HEAD /movements/{movement} — movements.show

### payroll.view

- GET|HEAD /bonus-calculation — bonus-calculation.index
- GET|HEAD /bonus-configurations — bonus-configurations.index
- GET|HEAD /bonus-post — bonus-post.index
- GET|HEAD /bonus-post/period/{year}/{month} — bonus-post.period
- GET|HEAD /bonus-post/{payroll_run} — bonus-post.show
- GET|HEAD /bonus-types — bonus-types.index
- GET|HEAD /branch-payroll-banks — branch-payroll-banks.index
- GET|HEAD /fixed-salary — fixed-salary.index
- GET|HEAD /payroll/reports — payroll.reports.index
- GET|HEAD /payroll/reports/{report} — payroll.reports.show
- GET|HEAD /payroll/reports/{report}/print — payroll.reports.print
- GET|HEAD /payscales — payscales.index
- GET|HEAD /probation-salary — probation-salary.index
- GET|HEAD /salary-arrear — salary-arrear.index
- GET|HEAD /salary-arrear/period/{year}/{month} — salary-arrear.period
- GET|HEAD /salary-arrear/{payroll_run} — salary-arrear.show
- GET|HEAD /salary-grades — salary-grades.index
- GET|HEAD /salary-head-modifications — salary-head-modifications.index
- GET|HEAD /salary-head-modifications/create — salary-head-modifications.create
- GET|HEAD /salary-heads — salary-heads.index
- GET|HEAD /salary-post — salary-post.index
- GET|HEAD /salary-post/period/{year}/{month} — salary-post.period
- GET|HEAD /salary-post/{payroll_run} — salary-post.show
- GET|HEAD /salary-process — salary-process.index
- GET|HEAD /salary-rollback — salary-rollback.index
- GET|HEAD /salary-steps — salary-steps.index
- GET|HEAD /salary-structures — salary-structures.index
- GET|HEAD /salary-structures/manual — salary-structures.manual
- GET|HEAD /salary-withheld — salary-withheld.index

### payroll.view AND payroll.create

- POST /bonus-configurations — bonus-configurations.store
- GET|HEAD /bonus-configurations/create — bonus-configurations.create
- POST /bonus-types — bonus-types.store
- GET|HEAD /bonus-types/create — bonus-types.create
- POST /branch-payroll-banks — branch-payroll-banks.store
- GET|HEAD /branch-payroll-banks/create — branch-payroll-banks.create
- POST /payscales — payscales.store
- GET|HEAD /payscales/create — payscales.create
- POST /salary-grades — salary-grades.store
- GET|HEAD /salary-grades/create — salary-grades.create
- POST /salary-heads — salary-heads.store
- GET|HEAD /salary-heads/create — salary-heads.create
- POST /salary-steps — salary-steps.store
- GET|HEAD /salary-steps/create — salary-steps.create

### payroll.view AND payroll.delete

- DELETE /bonus-configurations/{bonus_configuration} — bonus-configurations.destroy
- DELETE /bonus-types/{bonus_type} — bonus-types.destroy
- DELETE /branch-payroll-banks/{branch_payroll_bank} — branch-payroll-banks.destroy
- DELETE /payscales/{payscale} — payscales.destroy
- DELETE /salary-grades/{salary_grade} — salary-grades.destroy
- DELETE /salary-head-modifications/employee/{employee} — salary-head-modifications.destroy
- DELETE /salary-heads/{salary_head} — salary-heads.destroy
- DELETE /salary-steps/{salary_step} — salary-steps.destroy
- DELETE /salary-structures/{salary_structure} — salary-structures.destroy
- DELETE /salary-withheld/{salary_withheld} — salary-withheld.destroy

### payroll.view AND payroll.edit

- POST /bonus-calculation — bonus-calculation.process
- PUT /bonus-configurations/{bonus_configuration} — bonus-configurations.update
- GET|HEAD /bonus-configurations/{bonus_configuration}/edit — bonus-configurations.edit
- POST /bonus-post/period/{year}/{month}/cancel — bonus-post.period.cancel
- POST /bonus-post/period/{year}/{month}/finalize — bonus-post.period.finalize
- POST /bonus-post/{payroll_run} — bonus-post.post
- POST /bonus-post/{payroll_run}/cancel — bonus-post.cancel
- PUT /bonus-post/{payroll_run}/payslips — bonus-post.update-payslips
- PUT /bonus-types/{bonus_type} — bonus-types.update
- GET|HEAD /bonus-types/{bonus_type}/edit — bonus-types.edit
- PUT /branch-payroll-banks/{branch_payroll_bank} — branch-payroll-banks.update
- GET|HEAD /branch-payroll-banks/{branch_payroll_bank}/edit — branch-payroll-banks.edit
- POST /fixed-salary/employee — fixed-salary.employee.store
- PUT /payscales/{payscale} — payscales.update
- GET|HEAD /payscales/{payscale}/edit — payscales.edit
- PATCH /payscales/{payscale}/status — payscales.update-status
- POST /probation-salary/employee — probation-salary.employee.store
- POST /probation-salary/rules — probation-salary.rules.store
- POST /salary-arrear/apply — salary-arrear.apply
- PUT /salary-grades/{salary_grade} — salary-grades.update
- GET|HEAD /salary-grades/{salary_grade}/edit — salary-grades.edit
- POST /salary-head-modifications — salary-head-modifications.store
- POST /salary-heads/custom-overrides/reset-all — salary-heads.custom-overrides.reset-all
- POST /salary-heads/custom-overrides/reset-selected — salary-heads.custom-overrides.reset-selected
- POST /salary-heads/custom-overrides/{employee}/reset — salary-heads.custom-overrides.reset
- PUT /salary-heads/{salary_head} — salary-heads.update
- GET|HEAD /salary-heads/{salary_head}/edit — salary-heads.edit
- POST /salary-post/period/{year}/{month}/cancel — salary-post.period.cancel
- POST /salary-post/period/{year}/{month}/finalize — salary-post.period.finalize
- POST /salary-post/{payroll_run} — salary-post.post
- POST /salary-post/{payroll_run}/arrear — salary-post.arrear
- POST /salary-post/{payroll_run}/cancel — salary-post.cancel
- PUT /salary-post/{payroll_run}/payslips — salary-post.update-payslips
- POST /salary-post/{payroll_run}/recall — salary-post.recall
- POST /salary-process — salary-process.process
- POST /salary-rollback — salary-rollback.rollback
- PUT /salary-steps/{salary_step} — salary-steps.update
- GET|HEAD /salary-steps/{salary_step}/edit — salary-steps.edit
- POST /salary-structures/manual — salary-structures.manual.save
- POST /salary-withheld — salary-withheld.store

### payroll.view AND reports.export

- GET|HEAD /payroll/reports/{report}/excel — payroll.reports.excel
- GET|HEAD /payroll/reports/{report}/pdf — payroll.reports.pdf

### probation-increment-evaluations.view

- GET|HEAD /probation-increment-evaluations — probation-increment-evaluations.index
- GET|HEAD /probation-increment-evaluations/{evaluation} — probation-increment-evaluations.show
- PUT /probation-increment-evaluations/{evaluation} — probation-increment-evaluations.update
- DELETE /probation-increment-evaluations/{evaluation} — probation-increment-evaluations.destroy
- GET|HEAD /probation-increment-evaluations/{evaluation}/edit — probation-increment-evaluations.edit
- POST /probation-increment-evaluations/{evaluation}/forward — probation-increment-evaluations.forward
- GET|HEAD /probation-increment-evaluations/{evaluation}/print — probation-increment-evaluations.print
- POST /probation-increment-evaluations/{evaluation}/quick-approve — probation-increment-evaluations.quickApprove
- POST /probation-increment-evaluations/{evaluation}/reset-workflow — probation-increment-evaluations.reset-workflow
- POST /probation-increment-evaluations/{evaluation}/send-back — probation-increment-evaluations.sendBack
- PUT /probation-increment-evaluations/{evaluation}/signatures/{signature}/comment — probation-increment-evaluations.signatures.comment

### probation-increment-evaluations.view AND probation-increment-evaluations.approve

- POST /probation-increment-evaluations/{evaluation}/ed-approve — probation-increment-evaluations.edApprove

### probation-increment-evaluations.view AND probation-increment-evaluations.create

- POST /probation-increment-evaluations — probation-increment-evaluations.store
- GET|HEAD /probation-increment-evaluations/create — probation-increment-evaluations.create
- GET|HEAD /probation-increment-evaluations/employees/lookup — probation-increment-evaluations.employees.lookup

### probation-increment-evaluations.view AND probation-increment-evaluations.hr_verify

- POST /probation-increment-evaluations/{evaluation}/hr-verify — probation-increment-evaluations.hrVerify

### profile.edit

- PUT /settings/password — settings.password.update
- PATCH /settings/profile — settings.profile.update
- POST /settings/profile/signature — settings.profile.signature
- DELETE /settings/profile/signature — settings.profile.signature.destroy

### profile.view

- GET|HEAD /profile — profile.edit
- GET|HEAD /settings/appearance — settings.appearance
- GET|HEAD /settings/password — settings.password.edit
- GET|HEAD /settings/profile — settings.profile.edit

### profile.view AND profile.edit

- PATCH /profile — profile.update
- PATCH /profile/password — profile.password.update
- POST /profile/signature — profile.signature
- DELETE /profile/signature — profile.signature.destroy

### promotion-evaluations.view

- GET|HEAD /promotion-evaluations — promotions.evaluations.index
- GET|HEAD /promotion-evaluations/templates — promotions.evaluations.templates.index
- PUT /promotion-evaluations/templates/criteria/{criterion} — promotions.evaluations.templates.criteria.update
- DELETE /promotion-evaluations/templates/criteria/{criterion} — promotions.evaluations.templates.criteria.destroy
- PUT /promotion-evaluations/templates/sections/{section} — promotions.evaluations.templates.sections.update
- DELETE /promotion-evaluations/templates/sections/{section} — promotions.evaluations.templates.sections.destroy
- POST /promotion-evaluations/templates/sections/{section}/criteria — promotions.evaluations.templates.criteria.store
- PUT /promotion-evaluations/templates/{template} — promotions.evaluations.templates.update
- POST /promotion-evaluations/templates/{template}/sections — promotions.evaluations.templates.sections.store
- GET|HEAD /promotion-evaluations/{evaluation} — promotions.evaluations.show
- PUT /promotion-evaluations/{evaluation} — promotions.evaluations.update
- DELETE /promotion-evaluations/{evaluation} — promotions.evaluations.destroy
- GET|HEAD /promotion-evaluations/{evaluation}/edit — promotions.evaluations.edit
- POST /promotion-evaluations/{evaluation}/forward — promotions.evaluations.forward
- GET|HEAD /promotion-evaluations/{evaluation}/print — promotions.evaluations.print
- POST /promotion-evaluations/{evaluation}/reset-workflow — promotions.evaluations.reset-workflow
- POST /promotion-evaluations/{evaluation}/send-back — promotions.evaluations.sendBack
- PUT /promotion-evaluations/{evaluation}/signatures/{signature}/comment — promotions.evaluations.signatures.comment

### promotion-evaluations.view AND promotion-evaluations.approve

- POST /promotion-evaluations/{evaluation}/ed-approve — promotions.evaluations.edApprove

### promotion-evaluations.view AND promotion-evaluations.create

- POST /promotion-evaluations — promotions.evaluations.store
- GET|HEAD /promotion-evaluations/create — promotions.evaluations.create
- GET|HEAD /promotion-evaluations/employees/lookup — promotions.evaluations.employees.lookup

### promotion-evaluations.view AND promotion-evaluations.hr_verify

- POST /promotion-evaluations/{evaluation}/hr-verify — promotions.evaluations.hrVerify

### promotions.view

- GET|HEAD /promotions — promotions.index
- GET|HEAD /promotions/{promotion} — promotions.show

### promotions.view AND promotions.approve

- POST /promotions/{promotion}/approve — promotions.approve
- POST /promotions/{promotion}/reject — promotions.reject

### promotions.view AND promotions.create

- POST /promotions — promotions.store
- GET|HEAD /promotions/create — promotions.create

### promotions.view AND promotions.edit

- PUT /promotions/{promotion} — promotions.update
- POST /promotions/{promotion}/cancel — promotions.cancel
- POST /promotions/{promotion}/complete — promotions.complete
- GET|HEAD /promotions/{promotion}/edit — promotions.edit
- POST /promotions/{promotion}/rollback — promotions.rollback

### redesignations.view

- GET|HEAD /redesignations — redesignations.index
- GET|HEAD /redesignations/{redesignation} — redesignations.show

### redesignations.view AND redesignations.create

- POST /redesignations — redesignations.store
- GET|HEAD /redesignations/create — redesignations.create

### redesignations.view AND redesignations.edit

- PUT /redesignations/{redesignation} — redesignations.update
- GET|HEAD /redesignations/{redesignation}/edit — redesignations.edit

### regional-offices.view

- GET|HEAD /regional-offices — regional-offices.index

### regional-offices.view AND regional-offices.create

- POST /regional-offices — regional-offices.store
- GET|HEAD /regional-offices/create — regional-offices.create

### regional-offices.view AND regional-offices.delete

- DELETE /regional-offices/{regionalOffice} — regional-offices.destroy

### regional-offices.view AND regional-offices.edit

- PUT /regional-offices/{regionalOffice} — regional-offices.update
- GET|HEAD /regional-offices/{regionalOffice}/edit — regional-offices.edit

### reports.view

- GET|HEAD /leave/applications/report — leave.applications.report
- GET|HEAD /movements/report — movements.report
- GET|HEAD /movements/report/download — movements.report.download
- GET|HEAD /reports — reports.index
- GET|HEAD /reports/administration — reports.administration
- GET|HEAD /reports/attendance — reports.attendance
- GET|HEAD /reports/employee — reports.employee
- GET|HEAD /reports/leave — reports.leave
- GET|HEAD /reports/movement — reports.movement
- GET|HEAD /reports/transfer — reports.transfer

### reports.view AND reports.export

- POST /reports/export-excel — reports.export-excel
- POST /reports/export-pdf — reports.export-pdf
- GET|HEAD /reports/leave/excel — reports.leave.excel
- GET|HEAD /reports/leave/pdf — reports.leave.pdf

### roles.view

- GET|HEAD /admin/roles/permissions-api — admin.roles.permissions-api

### salary-increments.view

- GET|HEAD /salary-increments — salary-increments.index
- GET|HEAD /salary-increments/{salaryIncrement} — salary-increments.show
- POST /salary-increments/{salaryIncrement}/rollback — salary-increments.rollback

### salary-increments.view AND salary-increments.create

- POST /salary-increments — salary-increments.store
- GET|HEAD /salary-increments/create — salary-increments.create

### salary-increments.view AND salary-increments.edit

- POST /salary-increments/employees/{employee}/release-stop — salary-increments.release-stop

### separations.view

- GET|HEAD /separations — separations.index
- GET|HEAD /separations/{separation} — separations.show
- DELETE /separations/{separation} — separations.destroy

### separations.view AND separations.approve

- POST /separations/{separation}/approve — separations.approve
- POST /separations/{separation}/reject — separations.reject

### separations.view AND separations.create

- POST /separations — separations.store
- GET|HEAD /separations/create — separations.create

### separations.view AND separations.edit

- PUT /separations/{separation} — separations.update
- POST /separations/{separation}/cancel — separations.cancel
- POST /separations/{separation}/complete — separations.complete
- GET|HEAD /separations/{separation}/edit — separations.edit

### staff-fund.view

- GET|HEAD /employee-financial-statement — employee-financial-statement.index
- GET|HEAD /employee-financial-statement/lookup — employee-financial-statement.lookup
- GET|HEAD /employee-financial-statement/print — employee-financial-statement.print
- GET|HEAD /final-payments — final-payments.index
- GET|HEAD /final-payments/employees/lookup — final-payments.employees.lookup
- GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS /final-payments/statement
- GET|HEAD /final-payments/{final_payment} — final-payments.show
- GET|HEAD /gratuity — gratuity.index
- GET|HEAD /gratuity/payments — gratuity.payments
- GET|HEAD /gratuity/reports — gratuity.reports.index
- GET|HEAD /gratuity/reports/{report} — gratuity.reports.show
- GET|HEAD /gratuity/reports/{report}/print — gratuity.reports.print
- GET|HEAD /gratuity/rules — gratuity.rules
- GET|HEAD /gratuity/{employee} — gratuity.show
- GET|HEAD /provident-fund — provident-fund.index
- GET|HEAD /provident-fund/interest — provident-fund.interest.index
- GET|HEAD /provident-fund/reports — provident-fund.reports.index
- GET|HEAD /provident-fund/reports/{report} — provident-fund.reports.show
- GET|HEAD /provident-fund/reports/{report}/print — provident-fund.reports.print
- GET|HEAD /provident-fund/summary — provident-fund.summary
- GET|HEAD /provident-fund/transfer — provident-fund.transfer.index
- GET|HEAD /provident-fund/withdrawals — provident-fund.withdrawals.index
- GET|HEAD /provident-fund/{employee}/ledger — provident-fund.ledger

### staff-fund.view AND reports.export

- GET|HEAD /gratuity/reports/{report}/excel — gratuity.reports.excel
- GET|HEAD /gratuity/reports/{report}/pdf — gratuity.reports.pdf
- GET|HEAD /provident-fund/reports/{report}/excel — provident-fund.reports.excel
- GET|HEAD /provident-fund/reports/{report}/pdf — provident-fund.reports.pdf

### staff-fund.view AND staff-fund.edit

- POST /final-payments/generate — final-payments.generate
- POST /final-payments/{final_payment}/mark-paid — final-payments.mark-paid
- POST /final-payments/{final_payment}/refresh — final-payments.refresh
- POST /gratuity/{employee}/payments — gratuity.payments.store
- POST /provident-fund/interest — provident-fund.interest.store
- POST /provident-fund/interest/preview — provident-fund.interest.preview
- POST /provident-fund/interest/{interest_run}/rollback — provident-fund.interest.rollback
- POST /provident-fund/manual — provident-fund.manual.store
- POST /provident-fund/opening-balance — provident-fund.opening.store
- PUT /provident-fund/transactions/{transaction} — provident-fund.transactions.update
- DELETE /provident-fund/transactions/{transaction} — provident-fund.transactions.destroy
- POST /provident-fund/transfer — provident-fund.transfer.store
- POST /provident-fund/withdrawals — provident-fund.withdrawals.store

### trainee-evaluations.view

- GET|HEAD /trainee-evaluations — trainee-evaluations.index
- GET|HEAD /trainee-evaluations/{evaluation} — trainee-evaluations.show
- PUT /trainee-evaluations/{evaluation} — trainee-evaluations.update
- DELETE /trainee-evaluations/{evaluation} — trainee-evaluations.destroy
- GET|HEAD /trainee-evaluations/{evaluation}/edit — trainee-evaluations.edit
- POST /trainee-evaluations/{evaluation}/forward — trainee-evaluations.forward
- GET|HEAD /trainee-evaluations/{evaluation}/print — trainee-evaluations.print
- POST /trainee-evaluations/{evaluation}/quick-approve — trainee-evaluations.quickApprove
- POST /trainee-evaluations/{evaluation}/reset-workflow — trainee-evaluations.reset-workflow
- POST /trainee-evaluations/{evaluation}/send-back — trainee-evaluations.sendBack
- PUT /trainee-evaluations/{evaluation}/signatures/{signature}/comment — trainee-evaluations.signatures.comment

### trainee-evaluations.view AND trainee-evaluations.approve

- POST /trainee-evaluations/{evaluation}/ed-approve — trainee-evaluations.edApprove

### trainee-evaluations.view AND trainee-evaluations.create

- POST /trainee-evaluations — trainee-evaluations.store
- GET|HEAD /trainee-evaluations/create — trainee-evaluations.create
- GET|HEAD /trainee-evaluations/employees/lookup — trainee-evaluations.employees.lookup

### trainee-evaluations.view AND trainee-evaluations.hr_verify

- POST /trainee-evaluations/{evaluation}/hr-verify — trainee-evaluations.hrVerify

### transfers.view

- GET|HEAD /transfers — transfers.index
- GET|HEAD /transfers/{transfer} — transfers.show

### transfers.view AND transfers.approve

- POST /transfers/{transfer}/approve — transfers.approve
- POST /transfers/{transfer}/reject — transfers.reject

### transfers.view AND transfers.create

- POST /transfers — transfers.store
- GET|HEAD /transfers/bulk — transfers.bulk.create
- POST /transfers/bulk — transfers.bulk.store
- GET|HEAD /transfers/create — transfers.create

### transfers.view AND transfers.edit

- PUT /transfers/{transfer} — transfers.update
- POST /transfers/{transfer}/cancel — transfers.cancel
- POST /transfers/{transfer}/complete — transfers.complete
- GET|HEAD /transfers/{transfer}/edit — transfers.edit

### users.view

- GET|HEAD /admin/sessions — admin.sessions.index

### users.view AND admin.access

- DELETE /admin/sessions/user/{user} — admin.sessions.destroy-user
- DELETE /admin/sessions/{sessionId} — admin.sessions.destroy

### zones.view

- GET|HEAD /zones — zones.index

### zones.view AND zones.create

- POST /zones — zones.store
- GET|HEAD /zones/create — zones.create

### zones.view AND zones.delete

- DELETE /zones/{zone} — zones.destroy

### zones.view AND zones.edit

- PUT /zones/{zone} — zones.update
- GET|HEAD /zones/{zone}/edit — zones.edit

## Authenticated or public routes without a permission key

These stay as they are. Adding a key here would close a page someone can open today, or they are auth, errors, or public pages.

- GET|HEAD //
- GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS /branch — branch.portal
- GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS /branch/attendance — branch.portal.attendance
- GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS /branch/inventory — branch.portal.inventory
- GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS /branch/leave — branch.portal.leave
- GET|HEAD /dashboard — dashboard
- POST /employee/attendance/check-in — employee.attendance.check-in
- POST /employee/attendance/check-out — employee.attendance.check-out
- GET|HEAD /employee/dashboard — employee.dashboard
- GET|HEAD /employee/dashboard/attendance/pdf — employee.dashboard.attendance.pdf
- GET|HEAD /employee/dashboard/leave/pdf — employee.dashboard.leave.pdf
- GET|HEAD /employee/dashboard/movement/pdf — employee.dashboard.movement.pdf
- GET|HEAD /employee/dashboard/pdf — employee.dashboard.pdf
- GET|HEAD /employee/leave/pdf — employee.leave.pdf
- GET|HEAD /employee/loan — employee.loan.index
- GET|HEAD /employee/loan/applications — employee.loan.applications.index
- POST /employee/loan/applications — employee.loan.applications.store
- GET|HEAD /employee/loan/applications/create — employee.loan.applications.create
- POST /employee/loan/applications/motorcycle — employee.loan.applications.motorcycle.store
- GET|HEAD /employee/loan/applications/motorcycle/create — employee.loan.applications.motorcycle.create
- POST /employee/loan/applications/motorcycle/preview — employee.loan.applications.motorcycle.preview
- POST /employee/loan/applications/preview — employee.loan.applications.preview
- GET|HEAD /employee/loan/applications/{loan_application} — employee.loan.applications.show
- POST /employee/loan/applications/{loan_application}/forward — employee.loan.applications.forward
- POST /employee/loan/applications/{loan_application}/send-back — employee.loan.applications.send-back
- GET|HEAD /employee/loan/recommendations — employee.loan.recommendations.index
- GET|HEAD /employee/loan/recommendations/{loan_application} — employee.loan.recommendations.show
- POST /employee/loan/recommendations/{loan_application}/forward — employee.loan.recommendations.forward
- POST /employee/loan/recommendations/{loan_application}/send-back — employee.loan.recommendations.send-back
- GET|HEAD /employee/loan/{employee_loan} — employee.loan.show
- GET|HEAD /employee/loan/{employee_loan}/ledger — employee.loan.ledger
- GET|HEAD /employee/payroll/payslips — employee.payroll.payslips.index
- GET|HEAD /employee/payroll/payslips/{payslip} — employee.payroll.payslips.show
- GET|HEAD /employee/staff-fund/gratuity — employee.staff-fund.gratuity
- GET|HEAD /employee/staff-fund/pf-ledger — employee.staff-fund.pf-ledger
- GET|HEAD /employees/global-search — employees.global-search
- GET|HEAD /error/403 — error.403
- GET|HEAD /error/404 — error.404
- GET|HEAD /error/{type} — error.show
- GET|HEAD /final-clearances — final-clearances.index
- POST /final-clearances — final-clearances.store
- GET|HEAD /final-clearances/create — final-clearances.create
- GET|HEAD /final-clearances/employees/lookup — final-clearances.lookup
- GET|HEAD /final-clearances/{finalClearance} — final-clearances.show
- PUT /final-clearances/{finalClearance} — final-clearances.update
- DELETE /final-clearances/{finalClearance} — final-clearances.destroy
- POST /final-clearances/{finalClearance}/approve — final-clearances.approve
- POST /final-clearances/{finalClearance}/forward — final-clearances.forward
- GET|HEAD /final-clearances/{finalClearance}/print — final-clearances.print
- POST /final-clearances/{finalClearance}/reject — final-clearances.reject
- POST /final-clearances/{finalClearance}/send-back — final-clearances.send-back
- PUT /final-clearances/{finalClearance}/signatures/{signature}/comment — final-clearances.signatures.comment
- POST /final-clearances/{finalClearance}/submit — final-clearances.submit
- GET|POST|HEAD /iclock/cdata — iclock.cdata
- GET|POST|HEAD /iclock/devicecmd — iclock.devicecmd
- GET|POST|HEAD /iclock/getrequest — iclock.getrequest
- GET|HEAD /iclock/ping — iclock.ping
- GET|HEAD /login — login
- POST /login — login.attempt
- POST /logout — logout
- GET|HEAD /movement/penalty-payment — movement.penalty.payment
- GET|HEAD /movement/penalty-status — movement.penalty.status
- POST /movement/penalty-submit — movement.penalty.submit
- GET|HEAD /movements/{movement}/details — movements.details
- GET|HEAD /my-assets — my-assets.index
- GET|HEAD /my-notices — my-notices.index
- POST /my-notices/mark-all-read — my-notices.mark-all-read
- GET|HEAD /my-notices/{id} — my-notices.show
- GET|HEAD /notifications — notifications.index
- GET|HEAD /notifications/latest — notifications.latest
- POST /notifications/mark-all-as-read — notifications.mark-all-as-read
- GET|HEAD /notifications/unread-count — notifications.unread-count
- POST /notifications/{id}/mark-as-read — notifications.mark-as-read
- GET|HEAD /office-map — office-map.index
- GET|HEAD /resignation-applications — resignation-applications.index
- POST /resignation-applications — resignation-applications.store
- GET|HEAD /resignation-applications/create — resignation-applications.create
- GET|HEAD /resignation-applications/{resignationApplication} — resignation-applications.show
- PUT /resignation-applications/{resignationApplication} — resignation-applications.update
- DELETE /resignation-applications/{resignationApplication} — resignation-applications.destroy
- POST /resignation-applications/{resignationApplication}/ed-approve — resignation-applications.edApprove
- GET|HEAD /resignation-applications/{resignationApplication}/edit — resignation-applications.edit
- POST /resignation-applications/{resignationApplication}/forward — resignation-applications.forward
- GET|HEAD /resignation-applications/{resignationApplication}/print — resignation-applications.print
- POST /resignation-applications/{resignationApplication}/send-back — resignation-applications.sendBack
- PUT /resignation-applications/{resignationApplication}/signatures/{signature}/comment — resignation-applications.signatures.comment
- GET|HEAD /sections — sections.index
- GET|HEAD /sections/administration — sections.administration
- GET|HEAD /sections/attendance-movement — sections.attendance-movement
- GET|HEAD /sections/employee-loan — sections.employee-loan
- GET|HEAD /sections/human-resources — sections.human-resources
- GET|HEAD /sections/leave — sections.leave
- GET|HEAD /sections/payroll — sections.payroll
- GET|HEAD /sections/staff-fund — sections.staff-fund
- GET|HEAD /sections/{section} — sections.dashboard
- GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS /settings
- GET|HEAD /settings/notifications — settings.notifications
- POST /settings/notifications — settings.notifications.store
- DELETE /settings/notifications — settings.notifications.destroy
- POST /settings/notifications/test — settings.notifications.test
- GET|HEAD /storage/{path} — storage.local
- GET|HEAD /up

## API routes without CheckPermission

Checked in services with the same permission keys, or they are login and device endpoints.

- GET|HEAD /api/branch/{branchId}/employees
- POST /api/device/push-employees
- GET|HEAD /api/device/{deviceId}/employees
- POST /api/employees/sync
- GET|HEAD /api/sync/field-officers
- GET|HEAD /api/sync/organization-structure
- GET|HEAD /api/user
- GET|HEAD /api/v1/admin/summary — api.v1.admin.summary
- POST /api/v1/approvals/appraisal — api.v1.approvals.appraisal
- POST /api/v1/approvals/loans/{loanApplication} — api.v1.approvals.loans
- POST /api/v1/approvals/log-book/{payment} — api.v1.approvals.log-book
- GET|HEAD /api/v1/assets/mine — api.v1.assets.mine
- POST /api/v1/attendance/self/check-in — api.v1.attendance.self.check-in
- POST /api/v1/attendance/self/check-out — api.v1.attendance.self.check-out
- GET|HEAD /api/v1/attendance/self/history — api.v1.attendance.self.history
- GET|HEAD /api/v1/attendance/self/status — api.v1.attendance.self.status
- POST /api/v1/auth/branch/login — api.v1.auth.branch.login
- GET|HEAD /api/v1/auth/branches — api.v1.auth.branches
- POST /api/v1/auth/logout — api.v1.auth.logout
- POST /api/v1/auth/logout-all — api.v1.auth.logout-all
- POST /api/v1/auth/password — api.v1.auth.password
- POST /api/v1/auth/staff/login — api.v1.auth.staff.login
- GET|HEAD /api/v1/bootstrap — api.v1.bootstrap
- GET|HEAD /api/v1/documents — api.v1.documents
- GET|HEAD /api/v1/employees — api.v1.employees.index
- GET|HEAD /api/v1/employees/me — api.v1.employees.me
- GET|HEAD /api/v1/employees/organization — api.v1.employees.organization
- GET|HEAD /api/v1/employees/{employee} — api.v1.employees.show
- GET|HEAD /api/v1/finance/loans — api.v1.finance.loans
- GET|HEAD /api/v1/finance/payslips — api.v1.finance.payslips
- GET|HEAD /api/v1/finance/payslips/{payslip} — api.v1.finance.payslips.show
- GET|HEAD /api/v1/finance/staff-fund — api.v1.finance.staff-fund
- GET|HEAD /api/v1/inbox/notices — api.v1.inbox.notices
- POST /api/v1/inbox/notices/read-all — api.v1.inbox.notices.read-all
- GET|HEAD /api/v1/inbox/notices/{notice} — api.v1.inbox.notices.show
- GET|HEAD /api/v1/inbox/notifications — api.v1.inbox.notifications
- POST /api/v1/inbox/notifications/read-all — api.v1.inbox.notifications.read-all
- POST /api/v1/inbox/notifications/{notification}/read — api.v1.inbox.notifications.read
- GET|HEAD /api/v1/inventory/products — api.v1.inventory.products
- POST /api/v1/leave/applications — api.v1.leave.applications.store
- GET|HEAD /api/v1/leave/applications/mine — api.v1.leave.applications.mine
- GET|HEAD /api/v1/leave/applications/pending — api.v1.leave.applications.pending
- GET|HEAD /api/v1/leave/applications/{leaveApplication} — api.v1.leave.applications.show
- POST /api/v1/leave/applications/{leaveApplication}/approve — api.v1.leave.applications.approve
- POST /api/v1/leave/applications/{leaveApplication}/cancel — api.v1.leave.applications.cancel
- POST /api/v1/leave/applications/{leaveApplication}/reject — api.v1.leave.applications.reject
- GET|HEAD /api/v1/leave/balances — api.v1.leave.balances
- GET|HEAD /api/v1/leave/types — api.v1.leave.types
- GET|HEAD /api/v1/log-book/mine — api.v1.log-book.mine
- POST /api/v1/movements — api.v1.movements.store
- GET|HEAD /api/v1/movements/mine — api.v1.movements.mine
- GET|HEAD /api/v1/movements/penalty/status — api.v1.movements.penalty.status
- POST /api/v1/movements/penalty/submit — api.v1.movements.penalty.submit
- GET|HEAD /api/v1/movements/team — api.v1.movements.team
- GET|HEAD /api/v1/movements/{movement} — api.v1.movements.show
- POST /api/v1/movements/{movement}/cancel — api.v1.movements.cancel
- POST /api/v1/movements/{movement}/complete — api.v1.movements.complete
- GET|HEAD /api/v1/office-map — api.v1.office-map
- GET|HEAD /api/v1/reports/catalog — api.v1.reports.catalog
- GET|HEAD /api/v1/tasks — api.v1.tasks
- POST /api/zkteco/device-pin-mappings
- POST /api/zkteco/sync
