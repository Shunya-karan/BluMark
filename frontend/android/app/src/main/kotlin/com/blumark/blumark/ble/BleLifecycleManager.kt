package com.blumark.blumark.ble

import android.app.Activity
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.content.pm.PackageManager
import android.util.Log
import io.flutter.plugin.common.MethodChannel

interface BleEventEmitter {
    fun emit(event: Map<String, Any?>)
}

class BleLifecycleManager(private val activity: Activity, private val events: BleEventEmitter) {
    private val permissionManager = BlePermissionManager(activity)
    private val adapter = (activity.getSystemService(BluetoothManager::class.java))?.adapter
    private val advertiser = BleAdvertiser(adapter, events)
    private val gattServer = BleGattServer(activity, events)
    private val scanner = BleScanner(activity, events)

    init {
        val bleSupported = activity.packageManager.hasSystemFeature(PackageManager.FEATURE_BLUETOOTH_LE)
        Log.i(
            BleConstants.LOG_TAG,
            "[PLATFORM] BLE manager initialized; bleFeatureSupported=$bleSupported " +
                "adapterAvailable=${adapter != null} androidSdk=${android.os.Build.VERSION.SDK_INT}",
        )
        if (!bleSupported) {
            Log.e(BleConstants.LOG_TAG, "[PLATFORM] This device does not advertise BLE hardware support")
        }
        if (adapter == null) {
            Log.e(BleConstants.LOG_TAG, "[PLATFORM] Bluetooth adapter is unavailable")
        }
    }

    fun requestPermissions(result: MethodChannel.Result, role: String) {
        Log.d(BleConstants.LOG_TAG, "[$role][PERMISSION] BLE permission request started")
        permissionManager.request(result, role)
    }

    fun onRequestPermissionsResult(requestCode: Int, grantResults: IntArray): Boolean =
        permissionManager.onRequestPermissionsResult(requestCode, grantResults)

    fun startTeacherSession(sessionCode: String?, result: MethodChannel.Result) {
        Log.i(
            BleConstants.LOG_TAG,
            "[TEACHER] Start session requested; sessionCode=${sessionCode ?: "<missing>"}",
        )
        if (!permissionManager.hasRequiredPermissions("TEACHER")) {
            Log.e(BleConstants.LOG_TAG, "[TEACHER] Start blocked: required Bluetooth permission missing")
            error("Bluetooth permissions are required")
        }
        require(!sessionCode.isNullOrBlank()) {
            Log.e(BleConstants.LOG_TAG, "[TEACHER] Start blocked: session code is blank")
            "Session code is required"
        }
        val activeAdapter = adapter ?: run {
            Log.e(BleConstants.LOG_TAG, "[TEACHER] Start blocked: Bluetooth adapter unavailable")
            error("Bluetooth adapter is unavailable")
        }
        val adapterState = activeAdapter.state
        Log.d(
            BleConstants.LOG_TAG,
            "[TEACHER] Bluetooth adapter state=${activeAdapter.stateName()}",
        )
        if (adapterState != BluetoothAdapter.STATE_ON) {
            Log.e(
                BleConstants.LOG_TAG,
                "[TEACHER] Start blocked: Bluetooth adapter is not ON; " +
                    "state=${activeAdapter.stateName()}",
            )
            error("Bluetooth is turned off")
        }
        gattServer.start(sessionCode)
        advertiser.start(sessionCode)
        Log.i(
            BleConstants.LOG_TAG,
            "[TEACHER] Start operations submitted; awaiting GATT service and advertiser callbacks",
        )
        result.success(true)
    }

    fun stopTeacherSession(result: MethodChannel.Result) {
        Log.i(BleConstants.LOG_TAG, "[TEACHER] Stop session requested")
        advertiser.stop()
        gattServer.stop()
        Log.i(BleConstants.LOG_TAG, "[TEACHER] Stop session operations completed")
        result.success(true)
    }

    fun startStudentScan(result: MethodChannel.Result) {
        Log.i(BleConstants.LOG_TAG, "[STUDENT] Start scan requested")
        if (!permissionManager.hasRequiredPermissions("STUDENT")) {
            Log.e(BleConstants.LOG_TAG, "[STUDENT] Scan blocked: required Bluetooth permission missing")
            error("Bluetooth permissions are required")
        }
        Log.d(
            BleConstants.LOG_TAG,
            "[STUDENT] Bluetooth adapter state=${adapter?.stateName() ?: "UNAVAILABLE"}",
        )
        scanner.start()
        result.success(true)
    }

    fun stopStudentScan(result: MethodChannel.Result) {
        Log.i(BleConstants.LOG_TAG, "[STUDENT] Stop scan requested")
        scanner.stop()
        result.success(true)
    }

    fun submitStudentAttendance(
        deviceAddress: String?,
        sessionCode: String?,
        seatNumber: String?,
        result: MethodChannel.Result,
    ) {
        Log.i(
            BleConstants.LOG_TAG,
            "[STUDENT] Attendance submission requested; " +
                "sessionCode=${sessionCode ?: "<missing>"} seatNumber=${seatNumber ?: "<missing>"}",
        )
        require(!deviceAddress.isNullOrBlank() && !sessionCode.isNullOrBlank() && !seatNumber.isNullOrBlank()) {
            Log.e(
                BleConstants.LOG_TAG,
                "[STUDENT] Attendance submission blocked: teacher, session code, or seat number missing",
            )
            "Teacher, session code and seat number are required"
        }
        scanner.submit(deviceAddress, sessionCode, seatNumber) { success, error ->
            if (success) {
                Log.i(
                    BleConstants.LOG_TAG,
                    "[STUDENT] GATT write completed successfully; sessionCode=$sessionCode seatNumber=$seatNumber",
                )
                result.success(true)
            } else {
                Log.e(
                    BleConstants.LOG_TAG,
                    "[STUDENT] Attendance GATT write failed; sessionCode=$sessionCode " +
                        "seatNumber=$seatNumber error=${error ?: "<none>"}",
                )
                result.error("BLE_SUBMIT_FAILED", error, null)
            }
        }
    }

    fun release() {
        Log.i(BleConstants.LOG_TAG, "[PLATFORM] Releasing BLE resources")
        advertiser.stop()
        gattServer.stop()
        scanner.stop()
    }

    private fun BluetoothAdapter.stateName(): String = when (state) {
        BluetoothAdapter.STATE_OFF -> "OFF"
        BluetoothAdapter.STATE_TURNING_ON -> "TURNING_ON"
        BluetoothAdapter.STATE_ON -> "ON"
        BluetoothAdapter.STATE_TURNING_OFF -> "TURNING_OFF"
        else -> "UNKNOWN($state)"
    }
}
