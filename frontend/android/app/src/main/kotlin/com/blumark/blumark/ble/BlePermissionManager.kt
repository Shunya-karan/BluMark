package com.blumark.blumark.ble

import android.Manifest
import android.app.Activity
import android.content.pm.PackageManager
import android.os.Build
import io.flutter.plugin.common.MethodChannel

class BlePermissionManager(private val activity: Activity) {
    companion object { const val REQUEST_CODE = 8142 }

    fun request(result: MethodChannel.Result) {
        val missing = requiredPermissions().filter { activity.checkSelfPermission(it) != PackageManager.PERMISSION_GRANTED }
        if (missing.isEmpty()) result.success(true)
        else { pendingResult = result; activity.requestPermissions(missing.toTypedArray(), REQUEST_CODE) }
    }

    fun onRequestPermissionsResult(requestCode: Int, grantResults: IntArray): Boolean {
        if (requestCode != REQUEST_CODE) return false
        val granted = grantResults.isNotEmpty() && grantResults.all { it == PackageManager.PERMISSION_GRANTED }
        pendingResult?.success(granted); pendingResult = null
        return true
    }

    fun hasRequiredPermissions(): Boolean = requiredPermissions().all {
        activity.checkSelfPermission(it) == PackageManager.PERMISSION_GRANTED
    }

    private fun requiredPermissions(): List<String> = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        listOf(Manifest.permission.BLUETOOTH_SCAN, Manifest.permission.BLUETOOTH_CONNECT, Manifest.permission.BLUETOOTH_ADVERTISE)
    } else listOf(Manifest.permission.ACCESS_FINE_LOCATION)

    private var pendingResult: MethodChannel.Result? = null
}
