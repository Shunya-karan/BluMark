package com.blumark.blumark.ble

import java.util.UUID

object BleConstants {
    const val LOG_TAG = "BluMarkBLE"
    val SERVICE_UUID: UUID = UUID.fromString("6f7a9e40-6b6a-4f7c-8b1e-1d7b6a4d0c20")
    val ATTENDANCE_WRITE_UUID: UUID = UUID.fromString("6f7a9e41-6b6a-4f7c-8b1e-1d7b6a4d0c20")
    val ATTENDANCE_NOTIFY_UUID: UUID = UUID.fromString("6f7a9e42-6b6a-4f7c-8b1e-1d7b6a4d0c20")
    const val ADVERTISEMENT_NAME = "BluMark Attendance"
    const val EVENT_STATUS = "status"
    const val EVENT_ATTEMPT = "attendanceAttempt"
    const val EVENT_DEVICE = "teacherFound"
    const val EVENT_SCAN_RSSI = "scanRssi"
}
