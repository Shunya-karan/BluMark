import 'dart:async';
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

  Stream<BleAttendanceEvent> get events => _events.receiveBroadcastStream().map((event) {
        final map = Map<String, dynamic>.from(event as Map);
        return BleAttendanceEvent(map['type'] as String? ?? 'status', map);
      });

  Future<bool> requestPermissions() async => await _methods.invokeMethod<bool>('requestPermissions') ?? false;
  Future<Map<String, dynamic>> getDeviceStatus() async => Map<String, dynamic>.from(await _methods.invokeMethod<Map>('getDeviceStatus') ?? {});
  Future<void> openBluetoothSettings() => _methods.invokeMethod('openBluetoothSettings');
  Future<void> openLocationSettings() => _methods.invokeMethod('openLocationSettings');
  Future<void> startTeacherSession(String sessionCode) => _methods.invokeMethod('startTeacherSession', {'sessionCode': sessionCode});
  Future<void> stopTeacherSession() => _methods.invokeMethod('stopTeacherSession');
  Future<void> startStudentScan() => _methods.invokeMethod('startStudentScan');
  Future<void> stopStudentScan() => _methods.invokeMethod('stopStudentScan');
  Future<void> submitStudentAttendance({required String deviceAddress, required String sessionCode, required String seatNumber}) =>
      _methods.invokeMethod('submitStudentAttendance', {'deviceAddress': deviceAddress, 'sessionCode': sessionCode, 'seatNumber': seatNumber});
}
