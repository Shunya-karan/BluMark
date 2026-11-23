package com.blumark.blumark.ble

import android.bluetooth.*
import android.bluetooth.le.*
import android.content.Context
import android.os.ParcelUuid
import java.nio.charset.StandardCharsets
import android.util.Log

class BleScanner(private val context: Context, private val events: BleEventEmitter) {
    private val adapter = (context.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager).adapter
    private val scanner get() = adapter?.bluetoothLeScanner
    private var active = false

    fun start() {
        if (active) return
        Log.d(BleConstants.LOG_TAG, "Scanner started")
        val activeScanner = scanner ?: error("Bluetooth scanner is unavailable")
        activeScanner.startScan(listOf(ScanFilter.Builder().setServiceUuid(ParcelUuid(BleConstants.SERVICE_UUID)).build()), ScanSettings.Builder().setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY).build(), callback)
        active = true
        events.emit(mapOf("type" to BleConstants.EVENT_STATUS, "state" to "scanning"))
    }
    fun stop() { if (active) scanner?.stopScan(callback); active = false; Log.d(BleConstants.LOG_TAG, "Scanner stopped") }

    fun submit(deviceAddress: String, sessionCode: String, seatNumber: String, result: (Boolean, String?) -> Unit) {
        val device = adapter?.getRemoteDevice(deviceAddress) ?: return result(false, "Teacher device not found")
        val connection = device.connectGatt(context, false, object : BluetoothGattCallback() {
            override fun onConnectionStateChange(gatt: BluetoothGatt, status: Int, newState: Int) {
                if (status != BluetoothGatt.GATT_SUCCESS || newState != BluetoothProfile.STATE_CONNECTED) { gatt.close(); result(false, "Connection failed"); return }
                gatt.discoverServices()
            }
            override fun onServicesDiscovered(gatt: BluetoothGatt, status: Int) {
                val characteristic = gatt.getService(BleConstants.SERVICE_UUID)?.getCharacteristic(BleConstants.ATTENDANCE_WRITE_UUID)
                if (status != BluetoothGatt.GATT_SUCCESS || characteristic == null) { gatt.close(); result(false, "Attendance service unavailable"); return }
                characteristic.value = "$sessionCode|$seatNumber".toByteArray(StandardCharsets.UTF_8)
                characteristic.writeType = BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT
                if (!gatt.writeCharacteristic(characteristic)) { gatt.close(); result(false, "Unable to submit attendance") }
            }
            override fun onCharacteristicWrite(gatt: BluetoothGatt, characteristic: BluetoothGattCharacteristic, status: Int) {
                gatt.close(); result(status == BluetoothGatt.GATT_SUCCESS, if (status == BluetoothGatt.GATT_SUCCESS) null else "Teacher rejected attendance")
            }
        })
        if (connection == null) result(false, "Unable to connect to teacher")
    }

    private val callback = object : ScanCallback() {
        override fun onScanResult(callbackType: Int, result: ScanResult) {
            val data = result.scanRecord?.getServiceData(ParcelUuid(BleConstants.SERVICE_UUID))?.toString(StandardCharsets.UTF_8) ?: return
            Log.d(BleConstants.LOG_TAG, "Teacher advertisement detected; RSSI=${result.rssi}")
            events.emit(mapOf("type" to BleConstants.EVENT_DEVICE, "deviceAddress" to result.device.address, "deviceName" to (result.device.name ?: BleConstants.ADVERTISEMENT_NAME), "sessionCode" to data, "rssi" to result.rssi, "lowSignal" to (result.rssi < -75), "rssiAvailable" to true))
        }
        override fun onScanFailed(errorCode: Int) {
            active = false
            events.emit(mapOf("type" to BleConstants.EVENT_STATUS, "state" to "error", "errorCode" to errorCode))
        }
    }
}
