import 'package:flutter/foundation.dart';

/// Override with `--dart-define=API_BASE_URL=http://192.168.x.x:5000` for a
/// physical device. Browser development defaults to localhost; Android
/// emulators use their special host alias.
class AppConfig {
  AppConfig._();

  static const _override = String.fromEnvironment('API_BASE_URL');

  static String get apiBaseUrl {
    if (_override.isNotEmpty) return _override;
    if (kIsWeb) return 'http://localhost:5000';
    return 'http://10.0.2.2:5000';
  }
}
