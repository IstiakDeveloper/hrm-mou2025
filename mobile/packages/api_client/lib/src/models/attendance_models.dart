class AttendanceStatus {
  AttendanceStatus({
    required this.date,
    required this.serverTime,
    required this.isWeekend,
    required this.canCheckIn,
    required this.canCheckOut,
    required this.alreadyCheckedIn,
    required this.alreadyCheckedOut,
    required this.eligibleBranches,
    required this.allowedActions,
    this.checkIn,
    this.checkOut,
    this.status,
    this.receipt,
  });

  final String date;
  final String serverTime;
  final bool isWeekend;
  final bool canCheckIn;
  final bool canCheckOut;
  final bool alreadyCheckedIn;
  final bool alreadyCheckedOut;
  final String? checkIn;
  final String? checkOut;
  final String? status;
  final List<EligibleBranch> eligibleBranches;
  final List<String> allowedActions;
  final AttendanceReceipt? receipt;

  factory AttendanceStatus.fromJson(Map<String, dynamic> json) {
    return AttendanceStatus(
      date: (json['date'] ?? '').toString(),
      serverTime: (json['server_time'] ?? '').toString(),
      isWeekend: json['is_weekend'] == true,
      canCheckIn: json['can_check_in'] == true,
      canCheckOut: json['can_check_out'] == true,
      alreadyCheckedIn: json['already_checked_in'] == true,
      alreadyCheckedOut: json['already_checked_out'] == true,
      checkIn: json['check_in']?.toString(),
      checkOut: json['check_out']?.toString(),
      status: json['status']?.toString(),
      eligibleBranches: (json['eligible_branches'] as List? ?? const [])
          .whereType<Map>()
          .map((e) => EligibleBranch.fromJson(Map<String, dynamic>.from(e)))
          .toList(growable: false),
      allowedActions: (json['allowed_actions'] as List? ?? const [])
          .map((e) => e.toString())
          .toList(growable: false),
      receipt: json['receipt'] is Map
          ? AttendanceReceipt.fromJson(Map<String, dynamic>.from(json['receipt'] as Map))
          : null,
    );
  }
}

class EligibleBranch {
  EligibleBranch({
    required this.id,
    required this.name,
    this.branchCode,
    this.geofenceEnabled = false,
    this.geofenceRadiusMeters,
  });

  final int id;
  final String name;
  final String? branchCode;
  final bool geofenceEnabled;
  final int? geofenceRadiusMeters;

  factory EligibleBranch.fromJson(Map<String, dynamic> json) {
    return EligibleBranch(
      id: (json['id'] as num).toInt(),
      name: (json['name'] ?? '').toString(),
      branchCode: json['branch_code']?.toString(),
      geofenceEnabled: json['geofence_enabled'] == true,
      geofenceRadiusMeters: json['geofence_radius_meters'] is num
          ? (json['geofence_radius_meters'] as num).toInt()
          : null,
    );
  }
}

class AttendanceReceipt {
  AttendanceReceipt({
    required this.attendanceId,
    required this.date,
    this.checkIn,
    this.checkOut,
    this.status,
    this.branchName,
  });

  final int attendanceId;
  final String date;
  final String? checkIn;
  final String? checkOut;
  final String? status;
  final String? branchName;

  factory AttendanceReceipt.fromJson(Map<String, dynamic> json) {
    return AttendanceReceipt(
      attendanceId: (json['attendance_id'] as num).toInt(),
      date: (json['date'] ?? '').toString(),
      checkIn: json['check_in']?.toString(),
      checkOut: json['check_out']?.toString(),
      status: json['status']?.toString(),
      branchName: json['branch_name']?.toString(),
    );
  }
}

class AttendanceHistoryItem {
  AttendanceHistoryItem({
    required this.id,
    required this.date,
    this.checkIn,
    this.checkOut,
    this.status,
    this.branchName,
  });

  final int id;
  final String date;
  final String? checkIn;
  final String? checkOut;
  final String? status;
  final String? branchName;

  factory AttendanceHistoryItem.fromJson(Map<String, dynamic> json) {
    return AttendanceHistoryItem(
      id: (json['id'] as num).toInt(),
      date: (json['date'] ?? '').toString(),
      checkIn: json['check_in']?.toString(),
      checkOut: json['check_out']?.toString(),
      status: json['status']?.toString(),
      branchName: json['branch_name']?.toString(),
    );
  }
}

class PunchResult {
  PunchResult({
    required this.action,
    required this.message,
    required this.status,
    this.receipt,
  });

  final String action;
  final String message;
  final AttendanceStatus status;
  final AttendanceReceipt? receipt;

  factory PunchResult.fromJson(Map<String, dynamic> json) {
    return PunchResult(
      action: (json['action'] ?? '').toString(),
      message: (json['message'] ?? '').toString(),
      status: AttendanceStatus.fromJson(Map<String, dynamic>.from(json['status'] as Map)),
      receipt: json['receipt'] is Map
          ? AttendanceReceipt.fromJson(Map<String, dynamic>.from(json['receipt'] as Map))
          : null,
    );
  }
}
