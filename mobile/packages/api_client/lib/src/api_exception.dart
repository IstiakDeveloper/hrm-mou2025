class ApiException implements Exception {
  ApiException({
    required this.code,
    required this.message,
    this.statusCode,
    this.details,
    this.retryable = false,
  });

  final String code;
  final String message;
  final int? statusCode;
  final Map<String, dynamic>? details;
  final bool retryable;

  factory ApiException.fromBody(int? status, dynamic body) {
    if (body is Map && body['error'] is Map) {
      final error = Map<String, dynamic>.from(body['error'] as Map);
      final details = error['details'] is Map
          ? Map<String, dynamic>.from(error['details'] as Map)
          : null;
      var message = (error['message'] ?? 'Request failed').toString();
      final fieldErrors = details?['errors'];
      if (fieldErrors is Map && fieldErrors.isNotEmpty) {
        final first = fieldErrors.values.first;
        if (first is List && first.isNotEmpty) {
          message = first.first.toString();
        } else if (first != null) {
          message = first.toString();
        }
      }
      return ApiException(
        code: (error['code'] ?? 'http_error').toString(),
        message: message,
        statusCode: status,
        details: details,
        retryable: error['retryable'] == true,
      );
    }

    return ApiException(
      code: 'http_error',
      message: 'Request failed${status != null ? ' ($status)' : ''}.',
      statusCode: status,
    );
  }

  @override
  String toString() => 'ApiException($code, $statusCode): $message';
}
