import 'package:dio/dio.dart';
import 'package:uuid/uuid.dart';

import 'api_config.dart';
import 'api_exception.dart';
import 'models/attendance_models.dart';
import 'models/bootstrap_data.dart';
import 'models/leave_models.dart';
import 'models/login_result.dart';

typedef TokenReader = Future<String?> Function();
typedef DeviceHeaders = Future<Map<String, String>> Function();

class MousumiApiClient {
  MousumiApiClient({
    required ApiConfig config,
    required TokenReader tokenReader,
    required DeviceHeaders deviceHeaders,
    Dio? dio,
  }) : _tokenReader = tokenReader {
    _dio = dio ??
        Dio(
          BaseOptions(
            baseUrl: config.baseUrl.endsWith('/')
                ? config.baseUrl
                : '${config.baseUrl}/',
            connectTimeout: config.connectTimeout,
            receiveTimeout: config.receiveTimeout,
            headers: const {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
          ),
        );

    // QueuedInterceptorsWrapper is required for async onRequest; plain
    // InterceptorsWrapper can hang forever on Android release builds.
    _dio.interceptors.add(
      QueuedInterceptorsWrapper(
        onRequest: (options, handler) async {
          try {
            final headers = await deviceHeaders();
            options.headers.addAll(headers);
            final token = await _tokenReader();
            if (token != null && token.isNotEmpty) {
              options.headers['Authorization'] = 'Bearer $token';
            }
            if (_mutating(options.method) &&
                options.headers['Idempotency-Key'] == null) {
              options.headers['Idempotency-Key'] = const Uuid().v4();
            }
            handler.next(options);
          } catch (error) {
            handler.reject(
              DioException(
                requestOptions: options,
                type: DioExceptionType.unknown,
                error: ApiException(
                  code: 'client_error',
                  message: 'অ্যাপ সেটআপে সমস্যা হয়েছে। আবার চেষ্টা করুন।',
                  retryable: true,
                ),
              ),
            );
          }
        },
        onError: (error, handler) {
          final response = error.response;
          if (response != null) {
            handler.reject(
              DioException(
                requestOptions: error.requestOptions,
                response: response,
                type: error.type,
                error: ApiException.fromBody(response.statusCode, response.data),
              ),
            );
            return;
          }
          handler.reject(
            DioException(
              requestOptions: error.requestOptions,
              type: error.type,
              error: ApiException(
                code: 'network_error',
                message: 'নেটওয়ার্কে সমস্যা হয়েছে। পরে আবার চেষ্টা করুন।',
                retryable: true,
              ),
            ),
          );
        },
      ),
    );
  }

  late final Dio _dio;
  final TokenReader _tokenReader;

  Dio get raw => _dio;

  Future<LoginResult> loginStaff({
    required String login,
    required String password,
    String? deviceName,
  }) async {
    final response = await _dio.post<Map<String, dynamic>>(
      'auth/staff/login',
      data: {
        'login': login,
        'password': password,
        if (deviceName != null) 'device_name': deviceName,
      },
    );
    return LoginResult.fromJson(response.data!);
  }

  Future<LoginResult> loginBranch({
    required int branchId,
    required String pin,
    String? deviceName,
  }) async {
    final response = await _dio.post<Map<String, dynamic>>(
      'auth/branch/login',
      data: {
        'branch_id': branchId,
        'pin': pin,
        if (deviceName != null) 'device_name': deviceName,
      },
    );
    return LoginResult.fromJson(response.data!);
  }

  Future<List<BranchOption>> listLoginBranches() async {
    final response = await _dio.get<Map<String, dynamic>>('auth/branches');
    final data = response.data?['data'] as List? ?? const [];
    return data
        .whereType<Map>()
        .map((e) => BranchOption.fromJson(Map<String, dynamic>.from(e)))
        .toList(growable: false);
  }

  Future<BootstrapData> bootstrap() async {
    final response = await _dio.get<Map<String, dynamic>>('bootstrap');
    return BootstrapData.fromJson(
      Map<String, dynamic>.from(response.data!['bootstrap'] as Map),
    );
  }

  Future<void> logout() async {
    await _dio.post<void>('auth/logout');
  }

  Future<void> logoutAll() async {
    await _dio.post<void>('auth/logout-all');
  }

  Future<void> changePassword({
    required String currentPassword,
    required String password,
    required String passwordConfirmation,
  }) async {
    await _dio.post<void>('auth/password', data: {
      'current_password': currentPassword,
      'password': password,
      'password_confirmation': passwordConfirmation,
    });
  }

  Future<AttendanceStatus> attendanceStatus() async {
    final response = await _dio.get<Map<String, dynamic>>('attendance/self/status');
    return AttendanceStatus.fromJson(response.data!);
  }

  Future<List<AttendanceHistoryItem>> attendanceHistory({
    String? from,
    String? to,
  }) async {
    final response = await _dio.get<Map<String, dynamic>>(
      'attendance/self/history',
      queryParameters: {
        if (from != null) 'from': from,
        if (to != null) 'to': to,
      },
    );
    final data = response.data?['data'] as List? ?? const [];
    return data
        .whereType<Map>()
        .map((e) => AttendanceHistoryItem.fromJson(Map<String, dynamic>.from(e)))
        .toList(growable: false);
  }

  Future<PunchResult> checkIn({
    required double lat,
    required double lng,
    double? accuracy,
    required String deviceFingerprint,
    List<Map<String, dynamic>>? samples,
  }) async {
    final response = await _dio.post<Map<String, dynamic>>(
      'attendance/self/check-in',
      data: {
        'lat': lat,
        'lng': lng,
        'accuracy': accuracy,
        'device_fingerprint': deviceFingerprint,
        if (samples != null) 'samples': samples,
      },
    );
    return PunchResult.fromJson(response.data!);
  }

  Future<PunchResult> checkOut({
    required double lat,
    required double lng,
    double? accuracy,
    required String deviceFingerprint,
    List<Map<String, dynamic>>? samples,
  }) async {
    final response = await _dio.post<Map<String, dynamic>>(
      'attendance/self/check-out',
      data: {
        'lat': lat,
        'lng': lng,
        'accuracy': accuracy,
        'device_fingerprint': deviceFingerprint,
        if (samples != null) 'samples': samples,
      },
    );
    return PunchResult.fromJson(response.data!);
  }

  Future<List<LeaveTypeOption>> leaveTypes() async {
    final response = await _dio.get<Map<String, dynamic>>('leave/types');
    final data = response.data?['data'] as List? ?? const [];
    return data
        .whereType<Map>()
        .map((e) => LeaveTypeOption.fromJson(Map<String, dynamic>.from(e)))
        .toList(growable: false);
  }

  Future<List<LeaveBalanceItem>> leaveBalances() async {
    final response = await _dio.get<Map<String, dynamic>>('leave/balances');
    final data = response.data?['data'] as List? ?? const [];
    return data
        .whereType<Map>()
        .map((e) => LeaveBalanceItem.fromJson(Map<String, dynamic>.from(e)))
        .toList(growable: false);
  }

  Future<List<LeaveApplicationItem>> myLeaveApplications({String? status}) async {
    final response = await _dio.get<Map<String, dynamic>>(
      'leave/applications/mine',
      queryParameters: {
        if (status != null) 'status': status,
      },
    );
    final data = response.data?['data'] as List? ?? const [];
    return data
        .whereType<Map>()
        .map((e) => LeaveApplicationItem.fromJson(Map<String, dynamic>.from(e)))
        .toList(growable: false);
  }

  Future<List<LeaveApplicationItem>> pendingLeaveApplications() async {
    final response = await _dio.get<Map<String, dynamic>>('leave/applications/pending');
    final data = response.data?['data'] as List? ?? const [];
    return data
        .whereType<Map>()
        .map((e) => LeaveApplicationItem.fromJson(Map<String, dynamic>.from(e)))
        .toList(growable: false);
  }

  Future<LeaveApplicationItem> createLeaveApplication({
    required int leaveTypeId,
    required String startDate,
    required String endDate,
    required String reason,
    String? contact,
  }) async {
    final response = await _dio.post<Map<String, dynamic>>(
      'leave/applications',
      data: {
        'leave_type_id': leaveTypeId,
        'start_date': startDate,
        'end_date': endDate,
        'reason': reason,
        if (contact != null && contact.isNotEmpty) 'contact': contact,
      },
    );
    return LeaveApplicationItem.fromJson(
      Map<String, dynamic>.from(response.data!['application'] as Map),
    );
  }

  Future<LeaveApplicationItem> cancelLeave(int id) async {
    final response = await _dio.post<Map<String, dynamic>>('leave/applications/$id/cancel');
    return LeaveApplicationItem.fromJson(
      Map<String, dynamic>.from(response.data!['application'] as Map),
    );
  }

  Future<LeaveApplicationItem> approveLeave(int id, {String? comments}) async {
    final response = await _dio.post<Map<String, dynamic>>(
      'leave/applications/$id/approve',
      data: {
        if (comments != null) 'comments': comments,
      },
    );
    return LeaveApplicationItem.fromJson(
      Map<String, dynamic>.from(response.data!['application'] as Map),
    );
  }

  Future<LeaveApplicationItem> rejectLeave(int id, {required String reason}) async {
    final response = await _dio.post<Map<String, dynamic>>(
      'leave/applications/$id/reject',
      data: {'rejection_reason': reason},
    );
    return LeaveApplicationItem.fromJson(
      Map<String, dynamic>.from(response.data!['application'] as Map),
    );
  }

  Future<Map<String, dynamic>> tasks() async {
    final response = await _dio.get<Map<String, dynamic>>('tasks');
    return response.data ?? {};
  }

  Future<void> actAppraisal({
    required String kind,
    required int id,
    required String comments,
    String recommendationStatus = 'recommended',
    bool approved = true,
  }) async {
    await _dio.post<void>('approvals/appraisal', data: {
      'kind': kind,
      'id': id,
      'comments': comments,
      'recommendation_status': recommendationStatus,
      'approved': approved,
    });
  }

  Future<void> actLogBook({
    required int id,
    required String action,
    String? remarks,
  }) async {
    await _dio.post<void>('approvals/log-book/$id', data: {
      'action': action,
      'remarks': remarks,
    });
  }

  Future<void> actLoan({
    required int id,
    required String action,
    String? reason,
  }) async {
    await _dio.post<void>('approvals/loans/$id', data: {
      'action': action,
      'reason': reason,
    });
  }

  Future<List<Map<String, dynamic>>> movementsMine({String? status}) async {
    final response = await _dio.get<Map<String, dynamic>>(
      'movements/mine',
      queryParameters: {if (status != null) 'status': status},
    );
    return (response.data?['data'] as List? ?? const [])
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList(growable: false);
  }

  Future<Map<String, dynamic>> createMovement(Map<String, dynamic> body) async {
    final response = await _dio.post<Map<String, dynamic>>('movements', data: body);
    return Map<String, dynamic>.from(response.data?['movement'] as Map);
  }

  Future<Map<String, dynamic>> completeMovement(int id, {required String workResult}) async {
    final response = await _dio.post<Map<String, dynamic>>(
      'movements/$id/complete',
      data: {'work_result': workResult},
    );
    return Map<String, dynamic>.from(response.data?['movement'] as Map);
  }

  Future<Map<String, dynamic>> cancelMovement(int id) async {
    final response = await _dio.post<Map<String, dynamic>>('movements/$id/cancel');
    return Map<String, dynamic>.from(response.data?['movement'] as Map);
  }

  Future<Map<String, dynamic>> penaltyStatus() async {
    final response = await _dio.get<Map<String, dynamic>>('movements/penalty/status');
    return response.data ?? {};
  }

  Future<Map<String, dynamic>> submitPenalty(Map<String, dynamic> body) async {
    final response = await _dio.post<Map<String, dynamic>>('movements/penalty/submit', data: body);
    return response.data ?? {};
  }

  Future<List<Map<String, dynamic>>> notifications() async {
    final response = await _dio.get<Map<String, dynamic>>('inbox/notifications');
    return (response.data?['data'] as List? ?? const [])
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList(growable: false);
  }

  Future<List<Map<String, dynamic>>> notices() async {
    final response = await _dio.get<Map<String, dynamic>>('inbox/notices');
    return (response.data?['data'] as List? ?? const [])
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList(growable: false);
  }

  Future<void> markAllNotificationsRead() async {
    await _dio.post<void>('inbox/notifications/read-all');
  }

  Future<List<Map<String, dynamic>>> employees({String? q}) async {
    final response = await _dio.get<Map<String, dynamic>>(
      'employees',
      queryParameters: {if (q != null && q.isNotEmpty) 'q': q},
    );
    return (response.data?['data'] as List? ?? const [])
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList(growable: false);
  }

  Future<List<Map<String, dynamic>>> myLogBook() async {
    final response = await _dio.get<Map<String, dynamic>>('log-book/mine');
    return (response.data?['data'] as List? ?? const [])
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList(growable: false);
  }

  Future<Map<String, dynamic>> employeeMe() async {
    final response = await _dio.get<Map<String, dynamic>>('employees/me');
    return Map<String, dynamic>.from(response.data?['employee'] as Map? ?? {});
  }

  Future<List<Map<String, dynamic>>> payslips() async {
    final response = await _dio.get<Map<String, dynamic>>('finance/payslips');
    return (response.data?['data'] as List? ?? const [])
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList(growable: false);
  }

  Future<Map<String, dynamic>> payslipShow(int id) async {
    final response = await _dio.get<Map<String, dynamic>>('finance/payslips/$id');
    return Map<String, dynamic>.from(response.data?['payslip'] as Map? ?? {});
  }

  Future<List<Map<String, dynamic>>> loans() async {
    final response = await _dio.get<Map<String, dynamic>>('finance/loans');
    return (response.data?['data'] as List? ?? const [])
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList(growable: false);
  }

  Future<Map<String, dynamic>> staffFund() async {
    final response = await _dio.get<Map<String, dynamic>>('finance/staff-fund');
    return response.data ?? {};
  }

  Future<List<Map<String, dynamic>>> documents() async {
    final response = await _dio.get<Map<String, dynamic>>('documents');
    return (response.data?['data'] as List? ?? const [])
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList(growable: false);
  }

  Future<List<Map<String, dynamic>>> myAssets() async {
    final response = await _dio.get<Map<String, dynamic>>('assets/mine');
    return (response.data?['data'] as List? ?? const [])
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList(growable: false);
  }

  Future<List<Map<String, dynamic>>> inventoryProducts() async {
    final response = await _dio.get<Map<String, dynamic>>('inventory/products');
    return (response.data?['data'] as List? ?? const [])
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList(growable: false);
  }

  Future<Map<String, dynamic>> officeMap() async {
    final response = await _dio.get<Map<String, dynamic>>('office-map');
    return response.data ?? {};
  }

  Future<List<Map<String, dynamic>>> reportsCatalog() async {
    final response = await _dio.get<Map<String, dynamic>>('reports/catalog');
    return (response.data?['data'] as List? ?? const [])
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList(growable: false);
  }

  Future<Map<String, dynamic>> adminSummary() async {
    final response = await _dio.get<Map<String, dynamic>>('admin/summary');
    return response.data ?? {};
  }

  static bool _mutating(String method) {
    final m = method.toUpperCase();
    return m == 'POST' || m == 'PUT' || m == 'PATCH' || m == 'DELETE';
  }
}

ApiException mapDioError(Object error) {
  if (error is DioException && error.error is ApiException) {
    return error.error! as ApiException;
  }
  if (error is ApiException) {
    return error;
  }
  if (error is DioException &&
      (error.type == DioExceptionType.connectionTimeout ||
          error.type == DioExceptionType.receiveTimeout ||
          error.type == DioExceptionType.sendTimeout)) {
    return ApiException(
      code: 'timeout',
      message: 'সার্ভার থেকে উত্তর আসতে দেরি হচ্ছে। আবার চেষ্টা করুন।',
      retryable: true,
    );
  }
  final text = error.toString();
  if (text.contains('TimeoutException')) {
    return ApiException(
      code: 'timeout',
      message: 'সার্ভার থেকে উত্তর আসতে দেরি হচ্ছে। আবার চেষ্টা করুন।',
      retryable: true,
    );
  }
  return ApiException(
    code: 'unknown',
    message: 'Unexpected error.',
    retryable: true,
  );
}
