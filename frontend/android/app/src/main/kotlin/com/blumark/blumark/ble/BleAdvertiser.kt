package com.blumark.blumark.ble

import android.bluetooth.BluetoothAdapter
import android.bluetooth.le.AdvertiseCallback
import android.bluetooth.le.AdvertiseData
import android.bluetooth.le.AdvertiseSettings
import android.bluetooth.le.BluetoothLeAdvertiser
import android.os.ParcelUuid
import android.util.Log

class BleAdvertiser(private val adapter: BluetoothAdapter?, private val events: BleEventEmitter) {
    private var advertiser: BluetoothLeAdvertiser? = null

    fun start(sessionCode: String) {
        Log.d(BleConstants.LOG_TAG, "Starting advertising for session code")
        require(sessionCode.isNotBlank()) { "Session code is required" }
        advertiser = adapter?.bluetoothLeAdvertiser ?: error("BLE advertising is unavailable")
        val settings = AdvertiseSettings.Builder().setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
            .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_MEDIUM).setConnectable(true).build()
        // Keep the primary advertisement small: the 128-bit service UUID is
        // discoverable immediately, while the 12-byte session code is placed
        // in the scan response (the practical Android BLE payload limit).
        val data = AdvertiseData.Builder().setIncludeDeviceName(false)
            .addServiceUuid(ParcelUuid(BleConstants.SERVICE_UUID)).build()
        val scanResponse = AdvertiseData.Builder().setIncludeDeviceName(false)
            .addServiceData(ParcelUuid(BleConstants.SERVICE_UUID), sessionCode.toByteArray(Charsets.UTF_8)).build()
        advertiser?.startAdvertising(settings, data, scanResponse, callback)
    }

    fun stop() { advertiser?.stopAdvertising(callback); advertiser = null; Log.d(BleConstants.LOG_TAG, "Advertising stopped") }
    private val callback = object : AdvertiseCallback() {
        override fun onStartSuccess(settingsInEffect: AdvertiseSettings?) { Log.d(BleConstants.LOG_TAG, "Advertising started"); events.emit(mapOf("type" to BleConstants.EVENT_STATUS, "state" to "advertising")) }
        override fun onStartFailure(errorCode: Int) { Log.e(BleConstants.LOG_TAG, "Advertising failed: $errorCode"); events.emit(mapOf("type" to BleConstants.EVENT_STATUS, "state" to "error", "errorCode" to errorCode)) }
    }
}
