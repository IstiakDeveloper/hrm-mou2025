import 'package:flutter/material.dart';

import '../theme/mousumi_colors.dart';

class Shimmer extends StatefulWidget {
  const Shimmer({super.key, required this.child});

  final Widget child;

  @override
  State<Shimmer> createState() => _ShimmerState();
}

class _ShimmerState extends State<Shimmer> with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1200),
  )..repeat();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final reduce = MediaQuery.disableAnimationsOf(context);
    if (reduce) return widget.child;

    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return ShaderMask(
          blendMode: BlendMode.srcATop,
          shaderCallback: (bounds) {
            final dx = -1.2 + (_controller.value * 2.4);
            return LinearGradient(
              begin: Alignment(dx, 0),
              end: Alignment(dx + 0.8, 0),
              colors: const [
                Color(0xFFE6EEE8),
                Color(0xFFF7FBF8),
                Color(0xFFE6EEE8),
              ],
            ).createShader(bounds);
          },
          child: child,
        );
      },
      child: widget.child,
    );
  }
}

class SkeletonBox extends StatelessWidget {
  const SkeletonBox({
    super.key,
    this.width,
    this.height = 14,
    this.radius = 8,
  });

  final double? width;
  final double height;
  final double radius;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: const Color(0xFFE6EEE8),
        borderRadius: BorderRadius.circular(radius),
      ),
    );
  }
}

class SkeletonList extends StatelessWidget {
  const SkeletonList({super.key, this.count = 5});

  final int count;

  @override
  Widget build(BuildContext context) {
    return Shimmer(
      child: ListView.separated(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
        itemCount: count,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (_, __) => Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: MousumiColors.surface,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: MousumiColors.border),
          ),
          child: const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SkeletonBox(width: 160, height: 16),
              SizedBox(height: 10),
              SkeletonBox(width: 220, height: 12),
              SizedBox(height: 8),
              SkeletonBox(width: 96, height: 12),
            ],
          ),
        ),
      ),
    );
  }
}

class SkeletonHome extends StatelessWidget {
  const SkeletonHome({super.key});

  @override
  Widget build(BuildContext context) {
    return const Shimmer(
      child: Padding(
        padding: EdgeInsets.fromLTRB(16, 16, 16, 24),
        child: Column(
          children: [
            SkeletonBox(height: 148, radius: 20),
            SizedBox(height: 14),
            Row(
              children: [
                Expanded(child: SkeletonBox(height: 92, radius: 20)),
                SizedBox(width: 10),
                Expanded(child: SkeletonBox(height: 92, radius: 20)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
