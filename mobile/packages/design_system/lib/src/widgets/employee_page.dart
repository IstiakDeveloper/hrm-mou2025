import 'package:flutter/material.dart';

import '../theme/mousumi_colors.dart';
import 'app_error_panel.dart';
import 'fade_slide_in.dart';
import 'skeleton.dart';

class EmployeePage extends StatelessWidget {
  const EmployeePage({
    super.key,
    required this.title,
    required this.body,
    this.subtitle,
    this.loading = false,
    this.error,
    this.onRetry,
    this.onRefresh,
    this.actions,
    this.floatingActionButton,
  });

  final String title;
  final String? subtitle;
  final Widget body;
  final bool loading;
  final String? error;
  final VoidCallback? onRetry;
  final Future<void> Function()? onRefresh;
  final List<Widget>? actions;
  final Widget? floatingActionButton;

  @override
  Widget build(BuildContext context) {
    Widget content;
    if (loading) {
      content = const SkeletonList();
    } else if (error != null) {
      content = AppErrorPanel(message: error!, onRetry: onRetry);
    } else {
      content = FadeSlideIn(child: body);
    }

    if (onRefresh != null && !loading && error == null) {
      content = RefreshIndicator(
        color: MousumiColors.brandPrimary,
        onRefresh: onRefresh!,
        child: content,
      );
    }

    return Scaffold(
      backgroundColor: MousumiColors.canvas,
      floatingActionButton: loading ? null : floatingActionButton,
      appBar: AppBar(
        toolbarHeight: subtitle == null ? 64 : 78,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title),
            if (subtitle != null)
              Text(
                subtitle!,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
          ],
        ),
        actions: actions,
      ),
      body: content,
    );
  }
}
