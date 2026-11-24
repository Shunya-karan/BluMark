package com.blumark.blumark.ble

import android.Manifest
import android.app.Activity
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import io.flutter.plugin.common.MethodChannel

class BlePermissionManager(private val activity: Activity) {
    companion object { const val REQUEST_CODE = 8142 }

    fun request(result: MethodChannel.Result, role: String) {
        val required = requiredPermissions()
        val missing = required.filter {
            activity.checkSelfPermission(it) != PackageManager.PERMISSION_GRANTED
        }
        if (missing.isEmpty()) {
            Log.i(BleConstants.LOG_TAG, "[$role][PERMISSION] All required BLE permissions already granted")
            result.success(true)
        } else {
            Log.w(
                BleConstants.LOG_TAG,
                "[$role][PERMISSION] Requesting BLE permissions; missing=${missing.joinToString()}",
            )
            pendingResult = result
            pendingRole = role
            try {
                activity.requestPermissions(missing.toTypedArray(), REQUEST_CODE)
            } catch (error: Exception) {
                pendingResult = null
                pendingRole = null
                Log.e(
                    BleConstants.LOG_TAG,
                    "[$role][PERMISSION] Permission request failed: ${error.message}",
                    error,
                )
                throw error
            }
        }
    }

    fun onRequestPermissionsResult(requestCode: Int, grantResults: IntArray): Boolean {
        if (requestCode != REQUEST_CODE) return false
        val granted = grantResults.isNotEmpty() && grantResults.all { it == PackageManager.PERMISSION_GRANTED }
        val grantedCount = grantResults.count { it == PackageManager.PERMISSION_GRANTED }
        val role = pendingRole ?: "CHANNEL"
        if (granted) {
            Log.i(
                BleConstants.LOG_TAG,
                "[$role][PERMISSION] BLE permission request granted; count=$grantedCount",
            )
        } else {
            Log.e(
                BleConstants.LOG_TAG,
                "[$role][PERMISSION] BLE permission request denied or incomplete; " +
                    "granted=$grantedCount requested=${grantResults.size}",
            )
        }
        pendingResult?.success(granted)
        pendingResult = null
        pendingRole = null
        return true
    }

    fun hasRequiredPermissions(role: String): Boolean {
        val missing = requiredPermissions().filter {
            activity.checkSelfPermission(it) != PackageManager.PERMISSION_GRANTED
        }
        if (missing.isNotEmpty()) {
            Log.e(
                BleConstants.LOG_TAG,
                "[$role][PERMISSION] BLE operation blocked; missing=${missing.joinToString()}",
            )
        } else {
            Log.d(BleConstants.LOG_TAG, "[$role][PERMISSION] Required BLE permissions verified")
        }
        return missing.isEmpty()
    }

    private fun requiredPermissions(): List<String> = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        listOf(Manifest.permission.BLUETOOTH_SCAN, Manifest.permission.BLUETOOTH_CONNECT, Manifest.permission.BLUETOOTH_ADVERTISE)
    } else listOf(Manifest.permission.ACCESS_FINE_LOCATION)

    private var pendingResult: MethodChannel.Result? = null
    private var pendingRole: String? = null
}
