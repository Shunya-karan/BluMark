package com.blumark.blumark

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.content.Intent
import android.provider.Settings
import android.location.LocationManager
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import io.flutter.plugin.common.EventChannel
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
            logMethodCall(call)
            val loggedResult = LoggingMethodResult(call.method, methodRole(call), result)
            try {
                when (call.method) {
                    "requestPermissions" -> bleManager.requestPermissions(
                        loggedResult,
                        call.argument<String>("role") ?: "CHANNEL",
                    )
                    "getDeviceStatus" -> loggedResult.success(deviceStatus())
                    "openBluetoothSettings" -> {
                        startActivity(Intent(Settings.ACTION_BLUETOOTH_SETTINGS))
                        loggedResult.success(true)
                    }
                    "openLocationSettings" -> {
                        startActivity(Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS))
                        loggedResult.success(true)
                    }
                    "startTeacherSession" -> bleManager.startTeacherSession(
                        call.argument<String>("sessionCode"),
                        loggedResult,
                    )
                    "stopTeacherSession" -> bleManager.stopTeacherSession(loggedResult)
                    "startStudentScan" -> bleManager.startStudentScan(loggedResult)
                    "stopStudentScan" -> bleManager.stopStudentScan(loggedResult)
                    "submitStudentAttendance" -> bleManager.submitStudentAttendance(
                        call.argument<String>("deviceAddress"),
                        call.argument<String>("sessionCode"),
                        call.argument<String>("seatNumber"),
                        loggedResult,
                    )
                    else -> loggedResult.notImplemented()
                }
            } catch (error: Exception) {
                Log.e(
                    BLE_LOG_TAG,
                    "[${methodRole(call)}][CHANNEL] MethodChannel method=${call.method} " +
                        "failed: ${error.message}",
                    error,
                )
                loggedResult.error("BLE_ERROR", error.message, null)
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
        val bleSupported = packageManager.hasSystemFeature(PackageManager.FEATURE_BLUETOOTH_LE)
        val adapterState = if (bluetoothPermissionGranted) {
            bluetoothStateName(adapter?.state)
        } else {
            "PERMISSION_DENIED"
        }
        val locationOn = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            locationManager.isLocationEnabled
        } else {
            locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER) ||
                locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)
        }
        val locationRequired = Build.VERSION.SDK_INT < Build.VERSION_CODES.S
        val locationPermission = !locationRequired || checkSelfPermission(android.Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        Log.i(
            BLE_LOG_TAG,
            "[CHANNEL] Device status: adapterState=$adapterState bleFeatureSupported=$bleSupported " +
                "bluetoothPermissionGranted=$bluetoothPermissionGranted locationOn=$locationOn " +
                "locationPermissionGranted=$locationPermission",
        )
        return mapOf(
            "bluetoothOn" to (bluetoothPermissionGranted && adapter?.isEnabled == true),
            "bluetoothPermissionGranted" to bluetoothPermissionGranted,
            "locationOn" to locationOn,
            "locationRequired" to locationRequired,
            "locationPermissionGranted" to locationPermission,
        )
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        Log.d(
            BLE_LOG_TAG,
            "[CHANNEL] Permission callback requestCode=$requestCode " +
                "permissions=${permissions.joinToString()} " +
                "granted=${grantResults.count { it == PackageManager.PERMISSION_GRANTED }}/${grantResults.size}",
        )
        if (::bleManager.isInitialized && bleManager.onRequestPermissionsResult(requestCode, grantResults)) return
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
    }

    private fun logMethodCall(call: io.flutter.plugin.common.MethodCall) {
        val role = methodRole(call)
        val safeArguments = when (call.method) {
            "startTeacherSession" -> "sessionCode=${call.argument<String>("sessionCode") ?: "<missing>"}"
            "requestPermissions" -> "role=$role"
            "submitStudentAttendance" ->
                "sessionCode=${call.argument<String>("sessionCode") ?: "<missing>"} " +
                    "seatNumber=${call.argument<String>("seatNumber") ?: "<missing>"} " +
                    "deviceAddress=<redacted>"
            else -> null
        }
        Log.d(
            BLE_LOG_TAG,
            "[$role][CHANNEL] MethodChannel call method=${call.method}" +
                (safeArguments?.let { " arguments={$it}" } ?: ""),
        )
    }

    private fun methodRole(call: io.flutter.plugin.common.MethodCall): String = when (call.method) {
        "startTeacherSession", "stopTeacherSession" -> "TEACHER"
        "requestPermissions" -> call.argument<String>("role") ?: "CHANNEL"
        "startStudentScan", "stopStudentScan", "submitStudentAttendance" -> "STUDENT"
        else -> "CHANNEL"
    }

    private fun bluetoothStateName(state: Int?): String = when (state) {
        BluetoothAdapter.STATE_OFF -> "OFF"
        BluetoothAdapter.STATE_TURNING_ON -> "TURNING_ON"
        BluetoothAdapter.STATE_ON -> "ON"
        BluetoothAdapter.STATE_TURNING_OFF -> "TURNING_OFF"
        null -> "UNAVAILABLE"
        else -> "UNKNOWN($state)"
    }

    private inner class LoggingMethodResult(
        private val method: String,
        private val role: String,
        private val delegate: MethodChannel.Result,
    ) : MethodChannel.Result {
        override fun success(value: Any?) {
            val summary = when (value) {
                is Boolean, is Number, is String, null -> value.toString()
                is Map<*, *> -> {
                    val keys = listOf(
                        "bluetoothOn",
                        "bluetoothPermissionGranted",
                        "locationOn",
                        "locationRequired",
                        "locationPermissionGranted",
                        "bleFeatureSupported",
                        "adapterState",
                    )
                    keys.filter { value.containsKey(it) }
                        .joinToString { "$it=${value[it]}" }
                }
                else -> value::class.java.simpleName
            }
            Log.d(
                BLE_LOG_TAG,
                "[$role][CHANNEL] MethodChannel response " +
                    "method=$method success value=$summary",
            )
            delegate.success(value)
        }

        override fun error(errorCode: String, errorMessage: String?, errorDetails: Any?) {
            Log.e(
                BLE_LOG_TAG,
                "[$role][CHANNEL] MethodChannel response " +
                    "method=$method errorCode=$errorCode " +
                    "message=${errorMessage ?: "<none>"}",
            )
            delegate.error(errorCode, errorMessage, errorDetails)
        }

        override fun notImplemented() {
            Log.e(
                BLE_LOG_TAG,
                "[$role][CHANNEL] MethodChannel response " +
                    "method=$method not implemented",
            )
            delegate.notImplemented()
        }
    }

    private class BleEventSink : EventChannel.StreamHandler, com.blumark.blumark.ble.BleEventEmitter {
        private var sink: EventChannel.EventSink? = null
        private val lastTeacherAdvertisementLog = mutableMapOf<String, Long>()
        override fun onListen(arguments: Any?, events: EventChannel.EventSink?) {
            sink = events
            Log.d(BLE_LOG_TAG, "[CHANNEL] EventChannel listener attached")
        }

        override fun onCancel(arguments: Any?) {
            sink = null
            Log.d(BLE_LOG_TAG, "[CHANNEL] EventChannel listener cancelled")
        }

        override fun emit(event: Map<String, Any?>) {
            val type = event["type"]?.toString() ?: "unknown"
            val details = when (type) {
                "teacherFound" ->
                    "sessionCode=${event["sessionCode"]} rssi=${event["rssi"]}"
                "attendanceAttempt" ->
                    "sessionCode=${event["sessionCode"]} seatNumber=${event["seatNumber"]}"
                "status" -> "state=${event["state"]} errorCode=${event["errorCode"]}"
                else -> ""
            }
            val shouldLog = if (type == "teacherFound") {
                val key = event["sessionCode"]?.toString() ?: "<missing>"
                val now = System.currentTimeMillis()
                val lastLogged = lastTeacherAdvertisementLog[key]
                if (lastLogged != null && now - lastLogged < EVENT_LOG_INTERVAL_MS) {
                    false
                } else {
                    lastTeacherAdvertisementLog[key] = now
                    true
                }
            } else {
                true
            }
            if (shouldLog) {
                Log.d(BLE_LOG_TAG, "[CHANNEL] Native EventChannel event type=$type $details")
            }
            runOnMain {
                val activeSink = sink
                if (activeSink == null) {
                    Log.w(BLE_LOG_TAG, "[CHANNEL] Dropping native event; no EventChannel listener; type=$type")
                } else {
                    activeSink.success(event)
                }
            }
        }

        private fun runOnMain(block: () -> Unit) {
            android.os.Handler(android.os.Looper.getMainLooper()).post(block)
        }
    }

    companion object {
        private const val BLE_LOG_TAG = "BluMarkBLE"
        private const val EVENT_LOG_INTERVAL_MS = 10_000L
        private const val CHANNEL = "blumark/ble/methods"
        private const val EVENTS = "blumark/ble/events"

    }
}
