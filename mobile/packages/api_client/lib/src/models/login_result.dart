import 'bootstrap_data.dart';

class LoginResult {
  LoginResult({
    required this.token,
    required this.tokenType,
    required this.bootstrap,
    this.expiresAt,
  });

  final String token;
  final String tokenType;
  final String? expiresAt;
  final BootstrapData bootstrap;

  factory LoginResult.fromJson(Map<String, dynamic> json) {
    return LoginResult(
      token: (json['token'] ?? '').toString(),
      tokenType: (json['token_type'] ?? 'Bearer').toString(),
      expiresAt: json['expires_at']?.toString(),
      bootstrap: BootstrapData.fromJson(
        Map<String, dynamic>.from(json['bootstrap'] as Map),
      ),
    );
  }
}

class BranchOption {
  BranchOption({
    required this.id,
    required this.name,
    this.branchCode,
    this.isHeadOffice = false,
  });

  final int id;
  final String name;
  final String? branchCode;
  final bool isHeadOffice;

  factory BranchOption.fromJson(Map<String, dynamic> json) {
    return BranchOption(
      id: (json['id'] as num).toInt(),
      name: (json['name'] ?? '').toString(),
      branchCode: json['branch_code']?.toString(),
      isHeadOffice: json['is_head_office'] == true,
    );
  }

  String get label {
    if (branchCode == null || branchCode!.isEmpty) {
      return name;
    }
    return '$branchCode — $name';
  }
}
