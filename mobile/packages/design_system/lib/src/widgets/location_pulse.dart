import 'package:flutter/material.dart';

import '../theme/mousumi_colors.dart';

class LocationPulse extends StatefulWidget {
  const LocationPulse({super.key, required this.label});

  final String label;

  @override
  State<LocationPulse> createState() => _LocationPulseState();
}

class _LocationPulseState extends State<LocationPulse> with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1100),
  )..repeat();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final reduce = MediaQuery.disableAnimationsOf(context);
    return Row(
      children: [
        SizedBox(
          width: 36,
          height: 36,
          child: Stack(
            alignment: Alignment.center,
            children: [
              if (!reduce)
                AnimatedBuilder(
                  animation: _controller,
                  builder: (context, _) {
                    final t = _controller.value;
                    return Container(
                      width: 16 + (t * 18),
                      height: 16 + (t * 18),
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: MousumiColors.brandPrimary.withOpacity(0.18 * (1 - t)),
                      ),
                    );
                  },
                ),
              const Icon(Icons.location_on, color: MousumiColors.brandPrimary),
            ],
          ),
        ),
        const SizedBox(width: 8),
        Expanded(child: Text(widget.label, style: Theme.of(context).textTheme.bodyMedium)),
      ],
    );
  }
}
