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
    private val submitted = mutableSetOf<String>()
    private val connections = mutableSetOf<BluetoothDevice>()
    private val service = BluetoothGattService(BleConstants.SERVICE_UUID, BluetoothGattService.SERVICE_TYPE_PRIMARY).apply {
        addCharacteristic(BluetoothGattCharacteristic(BleConstants.ATTENDANCE_WRITE_UUID, BluetoothGattCharacteristic.PROPERTY_WRITE, BluetoothGattCharacteristic.PERMISSION_WRITE))
        addCharacteristic(BluetoothGattCharacteristic(BleConstants.ATTENDANCE_NOTIFY_UUID, BluetoothGattCharacteristic.PROPERTY_NOTIFY, BluetoothGattCharacteristic.PERMISSION_READ))
    }

    fun start(sessionCode: String) {
        Log.d(BleConstants.LOG_TAG, "Opening GATT server")
        activeSessionCode = sessionCode
        submitted.clear()
        server = manager.openGattServer(context, callback)?.also { it.addService(service) }
            ?: error("Unable to open GATT server")
    }
    fun stop() { connections.forEach { server?.cancelConnection(it) }; connections.clear(); submitted.clear(); activeSessionCode = null; server?.clearServices(); server?.close(); server = null }

    private val callback = object : BluetoothGattServerCallback() {
        override fun onConnectionStateChange(device: BluetoothDevice, status: Int, newState: Int) {
            if (newState == BluetoothProfile.STATE_CONNECTED) connections += device else connections -= device
            events.emit(mapOf("type" to BleConstants.EVENT_STATUS, "state" to if (newState == BluetoothProfile.STATE_CONNECTED) "connected" else "disconnected"))
        }
        override fun onCharacteristicWriteRequest(device: BluetoothDevice, requestId: Int, characteristic: BluetoothGattCharacteristic, preparedWrite: Boolean, responseNeeded: Boolean, offset: Int, value: ByteArray) {
            if (characteristic.uuid != BleConstants.ATTENDANCE_WRITE_UUID || offset != 0) return
            if (responseNeeded) server?.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, 0, null)
            val parts = value.toString(StandardCharsets.UTF_8).split('|', limit = 2)
            val key = if (parts.size == 2) "${parts[0]}|${parts[1]}" else null
            Log.d(BleConstants.LOG_TAG, "Attendance payload received")
            if (parts.size == 2 && parts[0] == activeSessionCode && key != null && submitted.add(key)) {
                events.emit(mapOf("type" to BleConstants.EVENT_ATTEMPT, "sessionCode" to parts[0], "seatNumber" to parts[1], "rssi" to null, "rssiAvailable" to false))
                Handler(Looper.getMainLooper()).post { notify(device, "accepted") }
            } else if (parts.size == 2) {
                Log.w(BleConstants.LOG_TAG, "Attendance payload rejected or duplicated")
                Handler(Looper.getMainLooper()).post { notify(device, "rejected") }
            }
        }
    }
    private fun notify(device: BluetoothDevice, value: String) {
        val characteristic = service.getCharacteristic(BleConstants.ATTENDANCE_NOTIFY_UUID) ?: return
        characteristic.value = value.toByteArray(StandardCharsets.UTF_8)
        server?.notifyCharacteristicChanged(device, characteristic, false)
    }
}
