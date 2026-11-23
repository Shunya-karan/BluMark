package com.blumark.blumark.ble

import android.app.Activity
import android.bluetooth.BluetoothManager
import io.flutter.plugin.common.MethodChannel

interface BleEventEmitter { fun emit(event: Map<String, Any?>) }

class BleLifecycleManager(private val activity: Activity, private val events: BleEventEmitter) {
    private val permissionManager = BlePermissionManager(activity)
    private val adapter = (activity.getSystemService(BluetoothManager::class.java))?.adapter
    private val advertiser = BleAdvertiser(adapter, events)
    private val gattServer = BleGattServer(activity, events)
    private val scanner = BleScanner(activity, events)

    fun requestPermissions(result: MethodChannel.Result) = permissionManager.request(result)
    fun onRequestPermissionsResult(requestCode: Int, grantResults: IntArray): Boolean = permissionManager.onRequestPermissionsResult(requestCode, grantResults)
    fun startTeacherSession(sessionCode: String?, result: MethodChannel.Result) {
        require(permissionManager.hasRequiredPermissions()) { "Bluetooth permissions are required" }
        require(!sessionCode.isNullOrBlank()) { "Session code is required" }
        gattServer.start(sessionCode); advertiser.start(sessionCode); result.success(true)
    }
    fun stopTeacherSession(result: MethodChannel.Result) { advertiser.stop(); gattServer.stop(); result.success(true) }
    fun startStudentScan(result: MethodChannel.Result) { require(permissionManager.hasRequiredPermissions()) { "Bluetooth permissions are required" }; scanner.start(); result.success(true) }
    fun stopStudentScan(result: MethodChannel.Result) { scanner.stop(); result.success(true) }
    fun submitStudentAttendance(deviceAddress: String?, sessionCode: String?, seatNumber: String?, result: MethodChannel.Result) {
        require(!deviceAddress.isNullOrBlank() && !sessionCode.isNullOrBlank() && !seatNumber.isNullOrBlank()) { "Teacher, session code and seat number are required" }
        scanner.submit(deviceAddress, sessionCode, seatNumber) { success, error -> if (success) result.success(true) else result.error("BLE_SUBMIT_FAILED", error, null) }
    }
    fun release() { advertiser.stop(); gattServer.stop(); scanner.stop() }
}
