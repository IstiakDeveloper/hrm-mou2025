import 'package:flutter/material.dart';

import '../theme/mousumi_colors.dart';

class SectionLabel extends StatelessWidget {
  const SectionLabel({super.key, required this.title, this.action});

  final String title;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Text(
            title,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: MousumiColors.textPrimary,
                  fontWeight: FontWeight.w700,
                ),
          ),
        ),
        if (action != null) action!,
      ],
    );
  }
}
