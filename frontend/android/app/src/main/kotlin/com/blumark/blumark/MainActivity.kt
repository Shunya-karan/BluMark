package com.blumark.blumark

import android.os.Bundle
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.content.Intent
import android.provider.Settings
import android.location.LocationManager
import android.content.pm.PackageManager
import android.os.Build
import io.flutter.plugin.common.EventChannel
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import com.blumark.blumark.ble.BleLifecycleManager

class MainActivity : FlutterActivity() {
    private lateinit var bleManager: BleLifecycleManager

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        val eventSink = BleEventSink()
        bleManager = BleLifecycleManager(this, eventSink)

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            try {
                when (call.method) {
                    "requestPermissions" -> bleManager.requestPermissions(result)
                    "getDeviceStatus" -> result.success(deviceStatus())
                    "openBluetoothSettings" -> { startActivity(Intent(Settings.ACTION_BLUETOOTH_SETTINGS)); result.success(true) }
                    "openLocationSettings" -> { startActivity(Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS)); result.success(true) }
                    "startTeacherSession" -> bleManager.startTeacherSession(call.argument<String>("sessionCode"), result)
                    "stopTeacherSession" -> bleManager.stopTeacherSession(result)
                    "startStudentScan" -> bleManager.startStudentScan(result)
                    "stopStudentScan" -> bleManager.stopStudentScan(result)
                    "submitStudentAttendance" -> bleManager.submitStudentAttendance(
                        call.argument<String>("deviceAddress"),
                        call.argument<String>("sessionCode"),
                        call.argument<String>("seatNumber"),
                        result,
                    )
                    else -> result.notImplemented()
                }
            } catch (error: Exception) {
                result.error("BLE_ERROR", error.message, null)
            }
        }
        EventChannel(flutterEngine.dartExecutor.binaryMessenger, EVENTS).setStreamHandler(eventSink)
    }

    override fun onDestroy() {
        if (::bleManager.isInitialized) bleManager.release()
        super.onDestroy()
    }

    private fun deviceStatus(): Map<String, Any> {
        val adapter = (getSystemService(BLUETOOTH_SERVICE) as BluetoothManager).adapter
        val locationManager = getSystemService(LOCATION_SERVICE) as LocationManager
        val bluetoothPermissionGranted = Build.VERSION.SDK_INT < Build.VERSION_CODES.S ||
            checkSelfPermission(android.Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED
        val locationOn = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            locationManager.isLocationEnabled
        } else {
            locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER) ||
                locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)
        }
        val locationRequired = Build.VERSION.SDK_INT < Build.VERSION_CODES.S
        val locationPermission = !locationRequired || checkSelfPermission(android.Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        return mapOf(
            "bluetoothOn" to (bluetoothPermissionGranted && adapter?.isEnabled == true),
            "bluetoothPermissionGranted" to bluetoothPermissionGranted,
            "locationOn" to locationOn,
            "locationRequired" to locationRequired,
            "locationPermissionGranted" to locationPermission,
        )
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        if (::bleManager.isInitialized && bleManager.onRequestPermissionsResult(requestCode, grantResults)) return
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
    }

    private class BleEventSink : EventChannel.StreamHandler, com.blumark.blumark.ble.BleEventEmitter {
        private var sink: EventChannel.EventSink? = null
        override fun onListen(arguments: Any?, events: EventChannel.EventSink?) { sink = events }
        override fun onCancel(arguments: Any?) { sink = null }
        override fun emit(event: Map<String, Any?>) { runOnMain { sink?.success(event) } }
        private fun runOnMain(block: () -> Unit) { android.os.Handler(android.os.Looper.getMainLooper()).post(block) }
    }

    companion object {
        private const val CHANNEL = "blumark/ble/methods"
        private const val EVENTS = "blumark/ble/events"
    }
}
