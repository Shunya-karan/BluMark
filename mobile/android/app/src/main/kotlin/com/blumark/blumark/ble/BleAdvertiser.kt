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
    private var advertising = false

    fun start(sessionCode: String) {
        require(sessionCode.isNotBlank()) { "Session code is required" }
        val restart = advertising || advertiser != null
        Log.i(
            BleConstants.LOG_TAG,
            "[TEACHER][ADVERTISER] ${if (restart) "Restart" else "Start"} requested; sessionCode=$sessionCode",
        )
        if (adapter == null) {
            Log.e(BleConstants.LOG_TAG, "[TEACHER][ADVERTISER] Bluetooth adapter unavailable")
            error("Bluetooth adapter is unavailable")
        }
        Log.d(
            BleConstants.LOG_TAG,
            "[TEACHER][ADVERTISER] adapterState=${adapter.stateName()} " +
                "multipleAdvertisementSupported=${adapter.isMultipleAdvertisementSupported}",
        )
        advertiser = adapter.bluetoothLeAdvertiser ?: run {
            Log.e(
                BleConstants.LOG_TAG,
                "[TEACHER][ADVERTISER] BLE advertiser unavailable; " +
                    "Bluetooth may be off or advertising unsupported",
            )
            error("BLE advertising is unavailable")
        }
        val settings = AdvertiseSettings.Builder().setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
            .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_MEDIUM).setConnectable(true).build()
        // Keep the primary advertisement small: the 128-bit service UUID is
        // discoverable immediately, while the 12-byte session code is placed
        // in the scan response (the practical Android BLE payload limit).
        val data = AdvertiseData.Builder().setIncludeDeviceName(false)
            .addServiceUuid(ParcelUuid(BleConstants.SERVICE_UUID)).build()
        val scanResponse = AdvertiseData.Builder().setIncludeDeviceName(false)
            .addServiceData(ParcelUuid(BleConstants.SERVICE_UUID), sessionCode.toByteArray(Charsets.UTF_8)).build()
        Log.i(
            BleConstants.LOG_TAG,
            "[TEACHER][ADVERTISER] Configuration: mode=LOW_LATENCY " +
                "txPower=MEDIUM connectable=true serviceUuid=${BleConstants.SERVICE_UUID} " +
                "sessionCodeLength=${sessionCode.length} (in scan response)",
        )
        try {
            advertiser?.startAdvertising(settings, data, scanResponse, callback)
            Log.d(
                BleConstants.LOG_TAG,
                "[TEACHER][ADVERTISER] startAdvertising submitted; awaiting platform callback",
            )
        } catch (error: Exception) {
            Log.e(
                BleConstants.LOG_TAG,
                "[TEACHER][ADVERTISER] startAdvertising threw: ${error.message}",
                error,
            )
            throw error
        }
    }

    fun stop() {
        val activeAdvertiser = advertiser
        if (activeAdvertiser == null) {
            Log.d(BleConstants.LOG_TAG, "[TEACHER][ADVERTISER] Stop requested while advertiser is not initialized")
            return
        }
        Log.i(BleConstants.LOG_TAG, "[TEACHER][ADVERTISER] Stop requested")
        try {
            activeAdvertiser.stopAdvertising(callback)
            advertising = false
            advertiser = null
            Log.i(
                BleConstants.LOG_TAG,
                "[TEACHER][ADVERTISER] Advertising stop request submitted; " +
                    "Android AdvertiseCallback has no stop confirmation",
            )
        } catch (error: Exception) {
            Log.e(
                BleConstants.LOG_TAG,
                "[TEACHER][ADVERTISER] stopAdvertising failed: ${error.message}",
                error,
            )
            throw error
        }
    }

    private val callback = object : AdvertiseCallback() {
        override fun onStartSuccess(settingsInEffect: AdvertiseSettings?) {
            advertising = true
            Log.i(
                BleConstants.LOG_TAG,
                "[TEACHER][ADVERTISER] Advertising successfully started; " +
                    "mode=${settingsInEffect?.mode} txPower=${settingsInEffect?.txPowerLevel} " +
                    "connectable=${settingsInEffect?.isConnectable}",
            )
            events.emit(mapOf("type" to BleConstants.EVENT_STATUS, "state" to "advertising"))
        }

        override fun onStartFailure(errorCode: Int) {
            advertising = false
            Log.e(
                BleConstants.LOG_TAG,
                "[TEACHER][ADVERTISER] Advertising failed; errorCode=$errorCode " +
                    "reason=${advertiseFailureReason(errorCode)}",
            )
            events.emit(mapOf("type" to BleConstants.EVENT_STATUS, "state" to "error", "errorCode" to errorCode))
        }
    }

    private fun advertiseFailureReason(errorCode: Int): String = when (errorCode) {
        AdvertiseCallback.ADVERTISE_FAILED_DATA_TOO_LARGE -> "DATA_TOO_LARGE"
        AdvertiseCallback.ADVERTISE_FAILED_TOO_MANY_ADVERTISERS -> "TOO_MANY_ADVERTISERS"
        AdvertiseCallback.ADVERTISE_FAILED_ALREADY_STARTED -> "ALREADY_STARTED"
        AdvertiseCallback.ADVERTISE_FAILED_INTERNAL_ERROR -> "INTERNAL_ERROR"
        AdvertiseCallback.ADVERTISE_FAILED_FEATURE_UNSUPPORTED -> "FEATURE_UNSUPPORTED"
        else -> "UNKNOWN"
    }

    private fun BluetoothAdapter.stateName(): String = when (state) {
        BluetoothAdapter.STATE_OFF -> "OFF"
        BluetoothAdapter.STATE_TURNING_ON -> "TURNING_ON"
        BluetoothAdapter.STATE_ON -> "ON"
        BluetoothAdapter.STATE_TURNING_OFF -> "TURNING_OFF"
        else -> "UNKNOWN($state)"
    }
}
