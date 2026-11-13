import 'package:app_core/app_core.dart';
import 'package:flutter/material.dart';

import '../attendance/attendance_screen.dart';
import '../common/simple_list_screen.dart';
import '../leave/leave_list_screen.dart';
import '../movement/movement_list_screen.dart';
import '../finance/payslip_list_screen.dart';

void openEmployeeService(BuildContext context, String sectionId) {
  openModule(context, sectionId);
}

void openModule(BuildContext context, String sectionIdOrLabel) {
  final key = sectionIdOrLabel.toLowerCase();

  const blocked = ['admin', 'report', 'inventory', 'human', 'employee', 'organization', 'store', 'training'];
  if (blocked.any(key.contains) && !key.contains('my')) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('এই অ্যাপে শুধু কর্মীর নিজের কাজ ও pending অনুমোদন।')),
    );
    return;
  }

  if (key.contains('attendance')) {
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => const AttendanceScreen()));
    return;
  }
  if (key.contains('leave')) {
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => const LeaveListScreen()));
    return;
  }
  if (key.contains('movement')) {
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => const MovementListScreen()));
    return;
  }
  if (key.contains('payroll') || key.contains('payslip')) {
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => const PayslipListScreen()));
    return;
  }
  if (key.contains('loan')) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => SimpleListScreen(
          title: 'My Loans',
          loader: () => ServiceLocator.api.loans(),
          titleOf: (row) => '${row['loan_type'] ?? 'Loan'} · ${row['loan_number'] ?? row['id']}',
          subtitleOf: (row) => 'Outstanding ${row['outstanding_balance'] ?? '—'} · ${row['status'] ?? ''}',
        ),
      ),
    );
    return;
  }
  if (key.contains('staff') || key.contains('fund') || key.contains('provident') || key.contains('gratuity')) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => SimpleListScreen(
          title: 'Staff Fund',
          loader: () async {
            final summary = await ServiceLocator.api.staffFund();
            return [
              {
                'title': 'PF balance',
                'subtitle': '${summary['pf_balance'] ?? '—'}',
              },
              {
                'title': 'Note',
                'subtitle': '${summary['note'] ?? ''}',
              },
            ];
          },
          titleOf: (row) => '${row['title']}',
          subtitleOf: (row) => '${row['subtitle']}',
        ),
      ),
    );
    return;
  }
  if (key.contains('document')) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => SimpleListScreen(
          title: 'Documents',
          loader: () => ServiceLocator.api.documents(),
          titleOf: (row) => '${row['title']}',
          subtitleOf: (row) => '${row['category'] ?? ''}',
        ),
      ),
    );
    return;
  }
  if (key.contains('fixed') || key.contains('asset')) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => SimpleListScreen(
          title: 'My Assets',
          loader: () => ServiceLocator.api.myAssets(),
          titleOf: (row) => '${row['name']}',
          subtitleOf: (row) => '${row['tag'] ?? ''} · ${row['status'] ?? ''}',
        ),
      ),
    );
    return;
  }
  if (key.contains('human') || key.contains('employee') || key.contains('organization')) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => SimpleListScreen(
          title: 'Employees',
          loader: () => ServiceLocator.api.employees(),
          titleOf: (row) => '${row['name']}',
          subtitleOf: (row) => '${row['pin'] ?? ''} · ${row['branch_name'] ?? ''} · ${row['designation_name'] ?? ''}',
        ),
      ),
    );
    return;
  }
  if (key.contains('admin')) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => SimpleListScreen(
          title: 'Administration',
          loader: () async {
            final summary = await ServiceLocator.api.adminSummary();
            return [
              {'title': 'Users', 'subtitle': '${summary['users_count'] ?? '—'}'},
              {'title': 'Note', 'subtitle': '${summary['mobile_tokens_note'] ?? ''}'},
            ];
          },
          titleOf: (row) => '${row['title']}',
          subtitleOf: (row) => '${row['subtitle']}',
        ),
      ),
    );
    return;
  }
  if (key.contains('report')) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => SimpleListScreen(
          title: 'Reports',
          loader: () => ServiceLocator.api.reportsCatalog(),
          titleOf: (row) => '${row['title']}',
          subtitleOf: (row) => '${row['family']} / ${row['slug']}',
        ),
      ),
    );
    return;
  }
  if (key.contains('inventory')) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => SimpleListScreen(
          title: 'Inventory products',
          loader: () => ServiceLocator.api.inventoryProducts(),
          titleOf: (row) => '${row['name']}',
          subtitleOf: (row) => '${row['sku'] ?? ''} · ${row['unit'] ?? ''}',
        ),
      ),
    );
    return;
  }
  if (key.contains('store') || key.contains('training')) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('এই মডিউল discovery/backlog — empty complete দেখানো হয়নি।')),
    );
    return;
  }

  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(content: Text('$sectionIdOrLabel শীঘ্রই সম্পূর্ণ হবে')),
  );
}
