class LeaveTypeOption {
  LeaveTypeOption({
    required this.id,
    required this.name,
    required this.isPaid,
    required this.requiresDocument,
    this.daysAllowed,
    this.description,
  });

  final int id;
  final String name;
  final bool isPaid;
  final bool requiresDocument;
  final dynamic daysAllowed;
  final String? description;

  factory LeaveTypeOption.fromJson(Map<String, dynamic> json) {
    return LeaveTypeOption(
      id: (json['id'] as num).toInt(),
      name: (json['name'] ?? '').toString(),
      isPaid: json['is_paid'] == true,
      requiresDocument: json['requires_document'] == true,
      daysAllowed: json['days_allowed'],
      description: json['description']?.toString(),
    );
  }
}

class LeaveBalanceItem {
  LeaveBalanceItem({
    required this.leaveTypeId,
    required this.remainingDays,
    required this.allocatedDays,
    required this.usedDays,
    this.leaveTypeName,
  });

  final int leaveTypeId;
  final String? leaveTypeName;
  final double remainingDays;
  final double allocatedDays;
  final double usedDays;

  factory LeaveBalanceItem.fromJson(Map<String, dynamic> json) {
    return LeaveBalanceItem(
      leaveTypeId: (json['leave_type_id'] as num).toInt(),
      leaveTypeName: json['leave_type_name']?.toString(),
      remainingDays: (json['remaining_days'] as num?)?.toDouble() ?? 0,
      allocatedDays: (json['allocated_days'] as num?)?.toDouble() ?? 0,
      usedDays: (json['used_days'] as num?)?.toDouble() ?? 0,
    );
  }
}

class LeaveApplicationItem {
  LeaveApplicationItem({
    required this.id,
    required this.leaveTypeId,
    required this.startDate,
    required this.endDate,
    required this.days,
    required this.status,
    required this.allowedActions,
    this.leaveTypeName,
    this.reason,
    this.employeeName,
    this.rejectionReason,
  });

  final int id;
  final int leaveTypeId;
  final String? leaveTypeName;
  final String startDate;
  final String endDate;
  final double days;
  final String status;
  final String? reason;
  final String? employeeName;
  final String? rejectionReason;
  final List<String> allowedActions;

  factory LeaveApplicationItem.fromJson(Map<String, dynamic> json) {
    return LeaveApplicationItem(
      id: (json['id'] as num).toInt(),
      leaveTypeId: (json['leave_type_id'] as num).toInt(),
      leaveTypeName: json['leave_type_name']?.toString(),
      startDate: (json['start_date'] ?? '').toString(),
      endDate: (json['end_date'] ?? '').toString(),
      days: (json['days'] as num?)?.toDouble() ?? 0,
      status: (json['status'] ?? '').toString(),
      reason: json['reason']?.toString(),
      employeeName: json['employee_name']?.toString(),
      rejectionReason: json['rejection_reason']?.toString(),
      allowedActions: (json['allowed_actions'] as List? ?? const [])
          .map((e) => e.toString())
          .toList(growable: false),
    );
  }
}
