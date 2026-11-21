
import 'package:flutter/foundation.dart';

class AppConfig {
  AppConfig._();

  static const String _productionBaseUrl =
      'https://blumark.onrender.com';

  static const String _override =
  String.fromEnvironment('API_BASE_URL');

  static const bool _usePhysicalDevice =
  bool.fromEnvironment('USE_PHYSICAL_DEVICE');

  static String get apiBaseUrl {
    if (_override.isNotEmpty) {
      return _override;
    }

    if (kReleaseMode) {
      return _productionBaseUrl;
    }

    if (kIsWeb) {
      return 'http://localhost:5000';
    }

    if (_usePhysicalDevice) {
      return 'http://10.116.233.243:5000';
    }

    return 'http://10.0.2.2:5000';
  }
}
