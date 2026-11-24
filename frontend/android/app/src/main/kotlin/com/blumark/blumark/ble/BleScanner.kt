package com.blumark.blumark.ble

import android.bluetooth.*
import android.bluetooth.le.*
import android.content.Context
import android.os.ParcelUuid
import android.util.Log
import java.nio.charset.StandardCharsets

class BleScanner(private val context: Context, private val events: BleEventEmitter) {
    private val adapter = (context.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager).adapter
    private val scanner get() = adapter?.bluetoothLeScanner
    private var active = false
    private val lastAdvertisementLog = mutableMapOf<String, Long>()

    fun start() {
        if (active) {
            Log.d(BleConstants.LOG_TAG, "[STUDENT][SCANNER] Start requested while scan is already active")
            return
        }
        Log.i(
            BleConstants.LOG_TAG,
            "[STUDENT][SCANNER] Starting BLE scan; adapterState=${adapter?.stateName() ?: "UNAVAILABLE"} " +
                "serviceUuidFilter=${BleConstants.SERVICE_UUID}",
        )
        val activeScanner = scanner ?: run {
            Log.e(
                BleConstants.LOG_TAG,
                "[STUDENT][SCANNER] BluetoothLeScanner unavailable; " +
                    "adapter missing, Bluetooth off, or BLE unsupported",
            )
            error("Bluetooth scanner is unavailable")
        }
        val filters = listOf(
            ScanFilter.Builder()
                .setServiceUuid(ParcelUuid(BleConstants.SERVICE_UUID))
                .build(),
        )
        val settings = ScanSettings.Builder()
            .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
            .build()
        try {
            activeScanner.startScan(filters, settings, callback)
            active = true
            Log.i(
                BleConstants.LOG_TAG,
                "[STUDENT][SCANNER] Scan registration submitted; awaiting scan results or failure callback; " +
                    "mode=LOW_LATENCY serviceUuidFilter=${BleConstants.SERVICE_UUID}",
            )
            events.emit(mapOf("type" to BleConstants.EVENT_STATUS, "state" to "scanning"))
        } catch (error: Exception) {
            Log.e(
                BleConstants.LOG_TAG,
                "[STUDENT][SCANNER] Scan registration failed: ${error.message}",
                error,
            )
            throw error
        }
    }

    fun stop() {
        if (!active) {
            Log.d(BleConstants.LOG_TAG, "[STUDENT][SCANNER] Stop requested while scan is not active")
            return
        }
        Log.i(BleConstants.LOG_TAG, "[STUDENT][SCANNER] Stopping BLE scan")
        try {
            scanner?.stopScan(callback)
            active = false
            lastAdvertisementLog.clear()
            Log.i(BleConstants.LOG_TAG, "[STUDENT][SCANNER] BLE scan stopped")
        } catch (error: Exception) {
            Log.e(BleConstants.LOG_TAG, "[STUDENT][SCANNER] Failed to stop scan: ${error.message}", error)
            throw error
        }
    }

    fun submit(
        deviceAddress: String,
        sessionCode: String,
        seatNumber: String,
        result: (Boolean, String?) -> Unit,
    ) {
        Log.i(
            BleConstants.LOG_TAG,
            "[STUDENT][GATT] Attendance submission requested; " +
                "sessionCode=$sessionCode seatNumber=$seatNumber",
        )
        val device = adapter?.getRemoteDevice(deviceAddress) ?: run {
            Log.e(BleConstants.LOG_TAG, "[STUDENT][GATT] Cannot connect: teacher device unavailable")
            return result(false, "Teacher device not found")
        }
        Log.i(
            BleConstants.LOG_TAG,
            "[STUDENT][GATT] Starting connection attempt; " +
                "sessionCode=$sessionCode seatNumber=$seatNumber",
        )
        val connection = device.connectGatt(context, false, object : BluetoothGattCallback() {
            override fun onConnectionStateChange(gatt: BluetoothGatt, status: Int, newState: Int) {
                val connected = status == BluetoothGatt.GATT_SUCCESS &&
                    newState == BluetoothProfile.STATE_CONNECTED
                if (!connected) {
                    if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                        Log.i(
                            BleConstants.LOG_TAG,
                            "[STUDENT][GATT] GATT connection disconnected; " +
                                "state=${connectionStateName(newState)} status=$status " +
                                "(${gattStatusName(status)})",
                        )
                    } else {
                        Log.e(
                            BleConstants.LOG_TAG,
                            "[STUDENT][GATT] GATT connection failed; " +
                                "state=${connectionStateName(newState)} status=$status " +
                                "(${gattStatusName(status)})",
                        )
                    }
                    gatt.close()
                    result(false, "Connection failed")
                    return
                }
                Log.i(
                    BleConstants.LOG_TAG,
                    "[STUDENT][GATT] GATT connection established; " +
                        "state=${connectionStateName(newState)} status=$status",
                )
                val discoveryStarted = gatt.discoverServices()
                Log.d(
                    BleConstants.LOG_TAG,
                    "[STUDENT][GATT] Service discovery " +
                        "${if (discoveryStarted) "started" else "could not start"}",
                )
            }

            override fun onServicesDiscovered(gatt: BluetoothGatt, status: Int) {
                val attendanceService = gatt.getService(BleConstants.SERVICE_UUID)
                val characteristic = attendanceService
                    ?.getCharacteristic(BleConstants.ATTENDANCE_WRITE_UUID)
                Log.d(
                    BleConstants.LOG_TAG,
                    "[STUDENT][GATT] Service discovery completed; status=$status " +
                        "(${gattStatusName(status)}) serviceFound=${attendanceService != null} " +
                        "writeCharacteristicFound=${characteristic != null}",
                )
                if (status != BluetoothGatt.GATT_SUCCESS || characteristic == null) {
                    Log.e(
                        BleConstants.LOG_TAG,
                        "[STUDENT][GATT] Attendance write characteristic unavailable; " +
                            "serviceUuid=${BleConstants.SERVICE_UUID} " +
                            "characteristicUuid=${BleConstants.ATTENDANCE_WRITE_UUID}",
                    )
                    gatt.close()
                    result(false, "Attendance service unavailable")
                    return
                }
                val payload = "$sessionCode|$seatNumber".toByteArray(StandardCharsets.UTF_8)
                Log.i(
                    BleConstants.LOG_TAG,
                    "[STUDENT][GATT] Attendance write payload prepared; " +
                        "sessionCode=$sessionCode seatNumber=$seatNumber bytes=${payload.size}",
                )
                characteristic.value = payload
                characteristic.writeType = BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT
                val writeStarted = gatt.writeCharacteristic(characteristic)
                if (writeStarted) {
                    Log.d(BleConstants.LOG_TAG, "[STUDENT][GATT] Attendance characteristic write queued")
                } else {
                    Log.e(
                        BleConstants.LOG_TAG,
                        "[STUDENT][GATT] Attendance characteristic write rejected by Android",
                    )
                    gatt.close()
                    result(false, "Unable to submit attendance")
                }
            }

            override fun onCharacteristicWrite(
                gatt: BluetoothGatt,
                characteristic: BluetoothGattCharacteristic,
                status: Int,
            ) {
                val success = status == BluetoothGatt.GATT_SUCCESS
                if (success) {
                    Log.i(
                        BleConstants.LOG_TAG,
                        "[STUDENT][GATT] GATT write response received successfully; " +
                            "characteristicUuid=${characteristic.uuid} status=$status",
                    )
                } else {
                    Log.e(
                        BleConstants.LOG_TAG,
                        "[STUDENT][GATT] GATT write failed; characteristicUuid=${characteristic.uuid} " +
                            "status=$status (${gattStatusName(status)})",
                    )
                }
                gatt.close()
                result(success, if (success) null else "Teacher rejected attendance")
            }

            @Suppress("DEPRECATION")
            override fun onCharacteristicChanged(
                gatt: BluetoothGatt,
                characteristic: BluetoothGattCharacteristic,
            ) {
                val response = characteristic.value?.toString(StandardCharsets.UTF_8)
                Log.i(
                    BleConstants.LOG_TAG,
                    "[STUDENT][GATT] Teacher response notification received; " +
                        "characteristicUuid=${characteristic.uuid} response=$response",
                )
            }
        })
        if (connection == null) {
            Log.e(BleConstants.LOG_TAG, "[STUDENT][GATT] connectGatt returned null")
            result(false, "Unable to connect to teacher")
        } else {
            Log.d(BleConstants.LOG_TAG, "[STUDENT][GATT] connectGatt returned; awaiting connection callback")
        }
    }

    private val callback = object : ScanCallback() {
        override fun onScanResult(callbackType: Int, result: ScanResult) {
            val scanRecord = result.scanRecord
            val serviceUuid = ParcelUuid(BleConstants.SERVICE_UUID)
            val uuidMatched = scanRecord?.serviceUuids?.contains(serviceUuid) == true ||
                scanRecord?.getServiceData(serviceUuid) != null
            val logKey = "${result.device.address}|uuid"
            if (!uuidMatched) {
                if (shouldLogAdvertisement(logKey)) {
                    Log.w(
                        BleConstants.LOG_TAG,
                        "[STUDENT][SCANNER] Advertisement rejected; required service UUID " +
                            "${BleConstants.SERVICE_UUID} not present",
                    )
                }
                return
            }
            val rawSessionCode = scanRecord?.getServiceData(serviceUuid)
            if (rawSessionCode == null) {
                if (shouldLogAdvertisement("$logKey|missing-data")) {
                    Log.w(
                        BleConstants.LOG_TAG,
                        "[STUDENT][SCANNER] Service UUID matched but session-code service data is missing",
                    )
                }
                return
            }
            val sessionCode = rawSessionCode.toString(StandardCharsets.UTF_8)
            if (shouldLogAdvertisement("$logKey|$sessionCode")) {
                Log.i(
                    BleConstants.LOG_TAG,
                    "[STUDENT][SCANNER] Advertisement discovered; serviceUuidMatched=true " +
                        "sessionCode=$sessionCode RSSI=${result.rssi} callbackType=$callbackType",
                )
            }
            events.emit(
                mapOf(
                    "type" to BleConstants.EVENT_DEVICE,
                    "deviceAddress" to result.device.address,
                    "deviceName" to (result.device.name ?: BleConstants.ADVERTISEMENT_NAME),
                    "sessionCode" to sessionCode,
                    "rssi" to result.rssi,
                    "lowSignal" to (result.rssi < -75),
                    "rssiAvailable" to true,
                ),
            )
        }

        override fun onScanFailed(errorCode: Int) {
            active = false
            Log.e(
                BleConstants.LOG_TAG,
                "[STUDENT][SCANNER] Scan failed; errorCode=$errorCode " +
                    "reason=${scanFailureReason(errorCode)}",
            )
            events.emit(
                mapOf(
                    "type" to BleConstants.EVENT_STATUS,
                    "state" to "error",
                    "errorCode" to errorCode,
                ),
            )
        }
    }

    private fun shouldLogAdvertisement(key: String): Boolean {
        val now = System.currentTimeMillis()
        val lastLogged = lastAdvertisementLog[key]
        if (lastLogged != null && now - lastLogged < ADVERTISEMENT_LOG_INTERVAL_MS) {
            return false
        }
        lastAdvertisementLog[key] = now
        return true
    }

    private fun scanFailureReason(errorCode: Int): String = when (errorCode) {
        ScanCallback.SCAN_FAILED_ALREADY_STARTED -> "ALREADY_STARTED"
        ScanCallback.SCAN_FAILED_APPLICATION_REGISTRATION_FAILED -> "APPLICATION_REGISTRATION_FAILED"
        ScanCallback.SCAN_FAILED_FEATURE_UNSUPPORTED -> "FEATURE_UNSUPPORTED"
        ScanCallback.SCAN_FAILED_INTERNAL_ERROR -> "INTERNAL_ERROR"
        ScanCallback.SCAN_FAILED_OUT_OF_HARDWARE_RESOURCES -> "OUT_OF_HARDWARE_RESOURCES"
        ScanCallback.SCAN_FAILED_SCANNING_TOO_FREQUENTLY -> "SCANNING_TOO_FREQUENTLY"
        else -> "UNKNOWN"
    }

    private fun BluetoothAdapter.stateName(): String = when (state) {
        BluetoothAdapter.STATE_OFF -> "OFF"
        BluetoothAdapter.STATE_TURNING_ON -> "TURNING_ON"
        BluetoothAdapter.STATE_ON -> "ON"
        BluetoothAdapter.STATE_TURNING_OFF -> "TURNING_OFF"
        else -> "UNKNOWN($state)"
    }

    private fun connectionStateName(state: Int): String = when (state) {
        BluetoothProfile.STATE_DISCONNECTED -> "DISCONNECTED"
        BluetoothProfile.STATE_CONNECTING -> "CONNECTING"
        BluetoothProfile.STATE_CONNECTED -> "CONNECTED"
        BluetoothProfile.STATE_DISCONNECTING -> "DISCONNECTING"
        else -> "UNKNOWN($state)"
    }

    private fun gattStatusName(status: Int): String = when (status) {
        BluetoothGatt.GATT_SUCCESS -> "SUCCESS"
        BluetoothGatt.GATT_FAILURE -> "FAILURE"
        else -> "UNKNOWN"
    }

    companion object {
        private const val ADVERTISEMENT_LOG_INTERVAL_MS = 10_000L
    }
}
