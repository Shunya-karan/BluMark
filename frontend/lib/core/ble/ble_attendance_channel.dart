import 'dart:async';
import 'dart:developer' as developer;

import 'package:flutter/services.dart';

class BleAttendanceEvent {
  const BleAttendanceEvent(this.type, this.data);

  final String type;
  final Map<String, dynamic> data;

  int? get rssi => data['rssi'] is num ? (data['rssi'] as num).toInt() : null;
  bool get lowSignal => data['lowSignal'] == true;
}

class BleAttendanceChannel {
  BleAttendanceChannel._();

  static final instance = BleAttendanceChannel._();
  static const _methods = MethodChannel('blumark/ble/methods');
  static const _events = EventChannel('blumark/ble/events');
  static const _eventLogInterval = Duration(seconds: 10);
  static final Map<String, DateTime> _lastEventLogs = {};

  static void log(String role, String message) {
    developer.log('[$role] $message', name: 'BluMarkBLE');
  }

  Stream<BleAttendanceEvent> get events => _events
      .receiveBroadcastStream()
      .map((event) {
        final map = Map<String, dynamic>.from(event as Map);
        final parsed = BleAttendanceEvent(
          map['type'] as String? ?? 'status',
          map,
        );
        _logEvent(parsed);
        return parsed;
      })
      .handleError((Object error, StackTrace stackTrace) {
        log('CHANNEL', 'EventChannel stream error: $error');
        Error.throwWithStackTrace(error, stackTrace);
      });

  Future<bool> requestPermissions({String role = 'CHANNEL'}) async =>
      await _invoke<bool>(
        role,
        'requestPermissions',
        arguments: {'role': role},
      ) ??
      false;

  Future<Map<String, dynamic>> getDeviceStatus() async =>
      Map<String, dynamic>.from(
        await _invoke<Map>('CHANNEL', 'getDeviceStatus') ?? {},
      );

  Future<void> openBluetoothSettings() async {
    await _invoke<void>('CHANNEL', 'openBluetoothSettings');
  }

  Future<void> openLocationSettings() async {
    await _invoke<void>('CHANNEL', 'openLocationSettings');
  }

  Future<void> startTeacherSession(String sessionCode) async {
    log(
      'TEACHER',
      'Flutter BLE service startTeacherSession entered '
          'sessionCode=$sessionCode',
    );
    await _invoke<void>(
      'TEACHER',
      'startTeacherSession',
      arguments: {'sessionCode': sessionCode},
      safeArguments: 'sessionCode=$sessionCode',
    );
  }

  Future<void> stopTeacherSession() async {
    await _invoke<void>('TEACHER', 'stopTeacherSession');
  }

  Future<void> startStudentScan() async {
    await _invoke<void>('STUDENT', 'startStudentScan');
  }

  Future<void> stopStudentScan() async {
    await _invoke<void>('STUDENT', 'stopStudentScan');
  }

  Future<void> submitStudentAttendance({
    required String deviceAddress,
    required String sessionCode,
    required String seatNumber,
  }) async {
    await _invoke<void>(
      'STUDENT',
      'submitStudentAttendance',
      arguments: {
        'deviceAddress': deviceAddress,
        'sessionCode': sessionCode,
        'seatNumber': seatNumber,
      },
      safeArguments:
          'sessionCode=$sessionCode seatNumber=$seatNumber deviceAddress=<redacted>',
    );
  }

  Future<T?> _invoke<T>(
    String role,
    String method, {
    Object? arguments,
    String? safeArguments,
  }) async {
    log(
      role,
      'MethodChannel call method=$method'
      '${safeArguments == null ? '' : ' arguments={$safeArguments}'}',
    );
    try {
      final response = await _methods.invokeMethod<T>(method, arguments);
      final responseSummary = response == null
          ? 'completed'
          : _summarize(response);
      log(
        role,
        'MethodChannel response method=$method success=$responseSummary',
      );
      return response;
    } on PlatformException catch (error, stackTrace) {
      log(
        role,
        'MethodChannel error method=$method code=${error.code} '
        'message=${error.message ?? '<none>'}',
      );
      developer.log(
        '[$role] MethodChannel stack trace method=$method',
        name: 'BluMarkBLE',
        error: error,
        stackTrace: stackTrace,
      );
      rethrow;
    } on MissingPluginException catch (error, stackTrace) {
      log(role, 'MethodChannel unavailable method=$method error=$error');
      developer.log(
        '[$role] Missing plugin stack trace method=$method',
        name: 'BluMarkBLE',
        error: error,
        stackTrace: stackTrace,
      );
      rethrow;
    } catch (error, stackTrace) {
      log(role, 'MethodChannel call failed method=$method error=$error');
      developer.log(
        '[$role] MethodChannel stack trace method=$method',
        name: 'BluMarkBLE',
        error: error,
        stackTrace: stackTrace,
      );
      rethrow;
    }
  }

  void _logEvent(BleAttendanceEvent event) {
    final details = switch (event.type) {
      'status' =>
        ' state=${event.data['state']} errorCode=${event.data['errorCode']}',
      'attendanceAttempt' =>
        ' sessionCode=${event.data['sessionCode']} seatNumber=${event.data['seatNumber']}',
      'teacherFound' =>
        ' sessionCode=${event.data['sessionCode']} rssi=${event.rssi}',
      _ => '',
    };
    final key =
        '${event.type}|${event.data['sessionCode'] ?? ''}|'
        '${event.data['seatNumber'] ?? ''}|${event.data['state'] ?? ''}';
    final now = DateTime.now();
    final lastLogged = _lastEventLogs[key];
    if (event.type == 'teacherFound' &&
        lastLogged != null &&
        now.difference(lastLogged) < _eventLogInterval) {
      return;
    }
    _lastEventLogs[key] = now;
    log('CHANNEL', 'EventChannel event type=${event.type}$details');
  }

  String _summarize(Object? value) {
    if (value is Map) {
      return value.entries
          .where(
            (entry) => const {
              'bluetoothOn',
              'bluetoothPermissionGranted',
              'locationOn',
              'locationRequired',
              'locationPermissionGranted',
            }.contains(entry.key),
          )
          .map((entry) => '${entry.key}=${entry.value}')
          .join(',');
    }
    return value?.toString() ?? 'null';
  }
}
