class BootstrapData {
  BootstrapData({
    required this.serverTime,
    required this.timezone,
    required this.user,
    required this.permissions,
    required this.blockedSections,
    required this.sections,
    required this.movementFineLocked,
    this.employee,
    this.features = const {},
    this.homeMode = 'employee',
    this.pendingLeaveReviews = 0,
    this.forceUpdate = false,
    this.maintenanceEnabled = false,
    this.maintenanceMessage,
    this.minSupportedVersion = const {},
  });

  final String serverTime;
  final String timezone;
  final BootstrapUser user;
  final BootstrapEmployee? employee;
  final List<String> permissions;
  final List<String> blockedSections;
  final List<BootstrapSection> sections;
  final bool movementFineLocked;
  final Map<String, dynamic> features;
  final String homeMode;
  final int pendingLeaveReviews;
  final bool forceUpdate;
  final bool maintenanceEnabled;
  final String? maintenanceMessage;
  final Map<String, dynamic> minSupportedVersion;

  factory BootstrapData.fromJson(Map<String, dynamic> json) {
    final locks = json['locks'] is Map ? Map<String, dynamic>.from(json['locks'] as Map) : const {};
    final fine = locks['movement_fine'] is Map
        ? Map<String, dynamic>.from(locks['movement_fine'] as Map)
        : const {};
    final home = json['home'] is Map ? Map<String, dynamic>.from(json['home'] as Map) : const {};
    final maintenance =
        json['maintenance'] is Map ? Map<String, dynamic>.from(json['maintenance'] as Map) : const {};

    return BootstrapData(
      serverTime: (json['server_time'] ?? '').toString(),
      timezone: (json['timezone'] ?? 'Asia/Dhaka').toString(),
      user: BootstrapUser.fromJson(Map<String, dynamic>.from(json['user'] as Map)),
      employee: json['employee'] is Map
          ? BootstrapEmployee.fromJson(Map<String, dynamic>.from(json['employee'] as Map))
          : null,
      permissions: (json['permissions'] as List? ?? const [])
          .map((e) => e.toString())
          .toList(growable: false),
      blockedSections: (json['blocked_sections'] as List? ?? const [])
          .map((e) => e.toString())
          .toList(growable: false),
      sections: (json['sections'] as List? ?? const [])
          .whereType<Map>()
          .map((e) => BootstrapSection.fromJson(Map<String, dynamic>.from(e)))
          .toList(growable: false),
      movementFineLocked: fine['locked'] == true,
      features: json['features'] is Map
          ? Map<String, dynamic>.from(json['features'] as Map)
          : const {},
      homeMode: (home['mode'] ?? 'employee').toString(),
      pendingLeaveReviews: (home['pending_leave_reviews'] as num?)?.toInt() ?? 0,
      forceUpdate: json['force_update'] == true,
      maintenanceEnabled: maintenance['enabled'] == true,
      maintenanceMessage: maintenance['message']?.toString(),
      minSupportedVersion: json['min_supported_version'] is Map
          ? Map<String, dynamic>.from(json['min_supported_version'] as Map)
          : const {},
    );
  }

  bool get isBranchAccount => user.isBranchAccount;
  bool get isReviewerHome => homeMode == 'reviewer';
}

class BootstrapUser {
  BootstrapUser({
    required this.id,
    required this.name,
    required this.accountType,
    required this.activeStatus,
    required this.isBranchAccount,
    required this.roleNames,
    this.username,
    this.email,
    this.employeeId,
    this.branchId,
  });

  final int id;
  final String name;
  final String? username;
  final String? email;
  final String accountType;
  final bool activeStatus;
  final int? employeeId;
  final int? branchId;
  final bool isBranchAccount;
  final List<String> roleNames;

  factory BootstrapUser.fromJson(Map<String, dynamic> json) {
    return BootstrapUser(
      id: (json['id'] as num).toInt(),
      name: (json['name'] ?? '').toString(),
      username: json['username']?.toString(),
      email: json['email']?.toString(),
      accountType: (json['account_type'] ?? 'staff').toString(),
      activeStatus: json['active_status'] != false,
      employeeId: json['employee_id'] is num ? (json['employee_id'] as num).toInt() : null,
      branchId: json['branch_id'] is num ? (json['branch_id'] as num).toInt() : null,
      isBranchAccount: json['is_branch_account'] == true || json['account_type'] == 'branch',
      roleNames: (json['role_names'] as List? ?? const []).map((e) => e.toString()).toList(),
    );
  }
}

class BootstrapEmployee {
  BootstrapEmployee({
    required this.id,
    required this.name,
    this.pin,
    this.branchId,
    this.branchName,
    this.designation,
  });

  final int id;
  final String name;
  final String? pin;
  final int? branchId;
  final String? branchName;
  final String? designation;

  factory BootstrapEmployee.fromJson(Map<String, dynamic> json) {
    return BootstrapEmployee(
      id: (json['id'] as num).toInt(),
      name: (json['name'] ?? '').toString(),
      pin: json['pin']?.toString(),
      branchId: json['branch_id'] is num ? (json['branch_id'] as num).toInt() : null,
      branchName: json['branch_name']?.toString(),
      designation: json['designation']?.toString(),
    );
  }
}

class BootstrapSection {
  BootstrapSection({
    required this.id,
    required this.label,
    required this.accessible,
    required this.implemented,
    this.description,
  });

  final String id;
  final String label;
  final String? description;
  final bool accessible;
  final bool implemented;

  factory BootstrapSection.fromJson(Map<String, dynamic> json) {
    return BootstrapSection(
      id: (json['id'] ?? '').toString(),
      label: (json['label'] ?? '').toString(),
      description: json['description']?.toString(),
      accessible: json['accessible'] == true,
      implemented: json['implemented'] != false,
    );
  }
}
