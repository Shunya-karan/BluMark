package com.blumark.blumark.ble

import android.bluetooth.*
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import java.nio.charset.StandardCharsets

class BleGattServer(private val context: Context, private val events: BleEventEmitter) {
    private val manager = context.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
    private var server: BluetoothGattServer? = null
    private var activeSessionCode: String? = null
    private var serviceReady = false
    private val submitted = mutableSetOf<String>()
    private val connections = mutableSetOf<BluetoothDevice>()
    private val service = BluetoothGattService(BleConstants.SERVICE_UUID, BluetoothGattService.SERVICE_TYPE_PRIMARY).apply {
        addCharacteristic(BluetoothGattCharacteristic(BleConstants.ATTENDANCE_WRITE_UUID, BluetoothGattCharacteristic.PROPERTY_WRITE, BluetoothGattCharacteristic.PERMISSION_WRITE))
        addCharacteristic(BluetoothGattCharacteristic(BleConstants.ATTENDANCE_NOTIFY_UUID, BluetoothGattCharacteristic.PROPERTY_NOTIFY, BluetoothGattCharacteristic.PERMISSION_READ))
    }

    fun start(sessionCode: String) {
        Log.i(
            BleConstants.LOG_TAG,
            "[TEACHER][GATT] Opening server for sessionCode=$sessionCode " +
                "serviceUuid=${BleConstants.SERVICE_UUID}",
        )
        activeSessionCode = sessionCode
        serviceReady = false
        submitted.clear()
        try {
            val openedServer = manager.openGattServer(context, callback)
                ?: run {
                    Log.e(BleConstants.LOG_TAG, "[TEACHER][GATT] openGattServer returned null")
                    error("Unable to open GATT server")
                }
            server = openedServer
            Log.i(BleConstants.LOG_TAG, "[TEACHER][GATT] GATT server opened successfully")
            val serviceAccepted = openedServer.addService(service)
            if (!serviceAccepted) {
                Log.e(
                    BleConstants.LOG_TAG,
                    "[TEACHER][GATT] Service registration rejected; " +
                        "serviceUuid=${service.uuid}",
                )
                error("Unable to add attendance GATT service")
            }
            Log.d(
                BleConstants.LOG_TAG,
                "[TEACHER][GATT] Service registration submitted; awaiting onServiceAdded",
            )
        } catch (error: Exception) {
            Log.e(
                BleConstants.LOG_TAG,
                "[TEACHER][GATT] Server startup failed: ${error.message}",
                error,
            )
            server?.close()
            server = null
            throw error
        }
    }

    fun stop() {
        Log.i(BleConstants.LOG_TAG, "[TEACHER][GATT] Stopping server; connectedDevices=${connections.size}")
        connections.forEach { device ->
            Log.d(BleConstants.LOG_TAG, "[TEACHER][GATT] Cancelling connection; deviceType=${device.type}")
            server?.cancelConnection(device)
        }
        connections.clear()
        submitted.clear()
        activeSessionCode = null
        serviceReady = false
        server?.clearServices()
        server?.close()
        server = null
        Log.i(BleConstants.LOG_TAG, "[TEACHER][GATT] Server stopped and closed")
    }

    private val callback = object : BluetoothGattServerCallback() {
        override fun onServiceAdded(status: Int, addedService: BluetoothGattService) {
            serviceReady = status == BluetoothGatt.GATT_SUCCESS &&
                addedService.uuid == BleConstants.SERVICE_UUID
            if (serviceReady) {
                Log.i(
                    BleConstants.LOG_TAG,
                    "[TEACHER][GATT] Attendance service added successfully; " +
                        "serviceUuid=${addedService.uuid}; server ready to accept connections",
                )
            } else {
                Log.e(
                    BleConstants.LOG_TAG,
                    "[TEACHER][GATT] Service registration failed; " +
                        "status=$status (${gattStatusName(status)}) serviceUuid=${addedService.uuid}",
                )
            }
        }

        override fun onConnectionStateChange(device: BluetoothDevice, status: Int, newState: Int) {
            val connected = newState == BluetoothProfile.STATE_CONNECTED
            if (connected) connections += device else connections -= device
            Log.i(
                BleConstants.LOG_TAG,
                "[TEACHER][GATT] Student device ${if (connected) "connected" else "disconnected"}; " +
                    "deviceType=${device.type} connectionState=${connectionStateName(newState)} " +
                    "gattStatus=$status (${gattStatusName(status)}) serviceReady=$serviceReady",
            )
            events.emit(mapOf("type" to BleConstants.EVENT_STATUS, "state" to if (newState == BluetoothProfile.STATE_CONNECTED) "connected" else "disconnected"))
        }

        override fun onCharacteristicReadRequest(
            device: BluetoothDevice,
            requestId: Int,
            offset: Int,
            characteristic: BluetoothGattCharacteristic,
        ) {
            Log.d(
                BleConstants.LOG_TAG,
                "[TEACHER][GATT] Characteristic read request; deviceType=${device.type} " +
                    "requestId=$requestId characteristicUuid=${characteristic.uuid} offset=$offset",
            )
        }

        override fun onCharacteristicWriteRequest(device: BluetoothDevice, requestId: Int, characteristic: BluetoothGattCharacteristic, preparedWrite: Boolean, responseNeeded: Boolean, offset: Int, value: ByteArray) {
            Log.i(
                BleConstants.LOG_TAG,
                "[TEACHER][GATT] Characteristic write request received; deviceType=${device.type} " +
                    "requestId=$requestId characteristicUuid=${characteristic.uuid} " +
                    "preparedWrite=$preparedWrite responseNeeded=$responseNeeded offset=$offset bytes=${value.size}",
            )
            if (characteristic.uuid != BleConstants.ATTENDANCE_WRITE_UUID || offset != 0) {
                Log.w(
                    BleConstants.LOG_TAG,
                    "[TEACHER][GATT] Write request rejected before payload validation; " +
                        "expectedUuid=${BleConstants.ATTENDANCE_WRITE_UUID} actualUuid=${characteristic.uuid} offset=$offset",
                )
                return
            }
            if (responseNeeded) {
                val responseSent = server?.sendResponse(
                    device,
                    requestId,
                    BluetoothGatt.GATT_SUCCESS,
                    0,
                    null,
                ) == true
                if (responseSent) {
                    Log.d(
                        BleConstants.LOG_TAG,
                        "[TEACHER][GATT] GATT write response sent; requestId=$requestId " +
                            "status=${BluetoothGatt.GATT_SUCCESS}",
                    )
                } else {
                    Log.e(
                        BleConstants.LOG_TAG,
                        "[TEACHER][GATT] Failed to send GATT write response; requestId=$requestId",
                    )
                }
            }
            val parts = value.toString(StandardCharsets.UTF_8).split('|', limit = 2)
            val key = if (parts.size == 2) "${parts[0]}|${parts[1]}" else null
            if (parts.size == 2) {
                Log.i(
                    BleConstants.LOG_TAG,
                    "[TEACHER][GATT] Attendance request payload received; " +
                        "sessionCode=${parts[0]} seatNumber=${parts[1]}",
                )
            } else {
                Log.w(
                    BleConstants.LOG_TAG,
                    "[TEACHER][GATT] Malformed attendance payload; bytes=${value.size} delimiterMissing=true",
                )
                Log.w(
                    BleConstants.LOG_TAG,
                    "[TEACHER][GATT] Payload validation failed: malformed attendance payload",
                )
            }
            val matchesSession = parts.size == 2 && parts[0] == activeSessionCode
            val firstRequest = matchesSession && key != null && submitted.add(key)
            if (parts.size == 2 && matchesSession && firstRequest) {
                Log.i(
                    BleConstants.LOG_TAG,
                    "[TEACHER][GATT] Payload validation successful; session matches and request is unique",
                )
                events.emit(mapOf("type" to BleConstants.EVENT_ATTEMPT, "sessionCode" to parts[0], "seatNumber" to parts[1], "rssi" to null, "rssiAvailable" to false))
                Log.d(
                    BleConstants.LOG_TAG,
                    "[TEACHER][GATT] Attendance attempt queued to Flutter for roster matching; " +
                        "sessionCode=${parts[0]} seatNumber=${parts[1]}",
                )
                Handler(Looper.getMainLooper()).post { notify(device, "accepted") }
            } else if (parts.size == 2) {
                when {
                    !matchesSession ->
                        Log.w(
                            BleConstants.LOG_TAG,
                            "[TEACHER][GATT] Payload validation failed: session mismatch; " +
                                "receivedSessionCode=${parts[0]} activeSessionCode=$activeSessionCode",
                        )
                    !firstRequest ->
                        Log.w(
                            BleConstants.LOG_TAG,
                            "[TEACHER][GATT] Duplicate attendance request detected; " +
                                "sessionCode=${parts[0]} seatNumber=${parts[1]}",
                        )
                }
                Handler(Looper.getMainLooper()).post { notify(device, "rejected") }
            }
        }

        override fun onNotificationSent(device: BluetoothDevice, status: Int) {
            if (status == BluetoothGatt.GATT_SUCCESS) {
                Log.d(
                    BleConstants.LOG_TAG,
                    "[TEACHER][GATT] Attendance response notification sent; " +
                        "deviceType=${device.type} status=$status",
                )
            } else {
                Log.e(
                    BleConstants.LOG_TAG,
                    "[TEACHER][GATT] Attendance response notification failed; " +
                        "deviceType=${device.type} status=$status (${gattStatusName(status)})",
                )
            }
        }
    }

    private fun notify(device: BluetoothDevice, value: String) {
        val characteristic = service.getCharacteristic(BleConstants.ATTENDANCE_NOTIFY_UUID) ?: run {
            Log.e(
                BleConstants.LOG_TAG,
                "[TEACHER][GATT] Response characteristic unavailable; uuid=${BleConstants.ATTENDANCE_NOTIFY_UUID}",
            )
            return
        }
        characteristic.value = value.toByteArray(StandardCharsets.UTF_8)
        val notificationQueued = server?.notifyCharacteristicChanged(device, characteristic, false) == true
        if (notificationQueued) {
            Log.d(
                BleConstants.LOG_TAG,
                "[TEACHER][GATT] Attendance response notification queued; " +
                    "deviceType=${device.type} response=$value",
            )
        } else {
            Log.e(
                BleConstants.LOG_TAG,
                "[TEACHER][GATT] Failed to queue attendance response notification; " +
                    "deviceType=${device.type} response=$value serverAvailable=${server != null}",
            )
        }
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
}
