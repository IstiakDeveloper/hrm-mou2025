import 'package:design_system/design_system.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('brand primary matches blueprint', () {
    expect(MousumiColors.brandPrimary, const Color(0xFF087F3E));
  });
}
