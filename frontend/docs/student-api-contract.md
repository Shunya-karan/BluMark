# Blu-Mark Student API contract

Every endpoint below is mounted at `/api/v1/student`, requires `Authorization: Bearer <access JWT>`, and is protected by the backend's `STUDENT` role guard. Responses are `{ "success": true, "message": "…", "data": … }`; errors are `{ "success": false, "message": "…" }`. The backend derives the student and institution from the JWT session—clients do not send a student ID.

## Dashboard and profile

- `GET /dashboard` returns `profile`, `institution`, first `enrollment`, aggregate `attendance`, `upcomingTimetable`, `recentAttendance`, and up to five `latestNotifications`.
- `GET /profile` returns `id`, `fullName`, `email`, `phone`, `studentNumber`, `isActive`, `institution`, and active `enrollments`.
- `PATCH /profile` accepts one or both permitted values: `{ "fullName": "…", "phone": "…" | null }`. Academic and institution fields cannot be edited.
- `GET /academic-details` returns the profile payload. `GET /enrollment` returns `{ "enrollments": [...] }`.

## Attendance

- `GET /attendance/summary` returns `totalSessions`, `presentSessions`, `absentSessions`, `attendancePercentage`, and subject summaries.
- `GET /attendance/history?page=1&limit=20&from=<ISO date>&to=<ISO date>&subjectId=<uuid>&status=PRESENT|LATE|ABSENT|EXCUSED` returns `{ records, pagination }`. Each record includes the session, subject, teacher, class, status, times, and optional mark method.
- `GET /attendance/calendar?year=YYYY&month=1..12` returns records grouped by ISO date.
- `GET /attendance/subjects` returns subject-level attendance summaries.

There is no student attendance-marking endpoint. The client must not create or alter attendance records.

## Timetable and subjects

- `GET /timetable` returns `{ slots }` for active enrollments. Slots include weekday (1 Monday through 7 Sunday), start/end time, room, subject, teacher, and class.
- `GET /timetable/today` and `GET /timetable/upcoming` return filtered/upcoming slot collections.
- `GET /subjects` returns assigned class-subject records including `subject`, `teacher`, and `schoolClass`.
- `GET /subjects/:subjectId` returns one assigned subject; unknown/unassigned IDs return 404.

## Study materials

- `GET /study-materials?page=1&limit=20&subjectId=<uuid>&search=<text>&from=<ISO>&to=<ISO>` returns `{ materials, pagination }` for enrolled classes.
- `GET /study-materials/:materialId` returns one authorized material.
- `GET /study-materials/:materialId/download` returns a short-lived authorized `downloadUrl` for an enrolled student.

The Flutter app requests the authorized download endpoint and opens only the returned short-lived URL; it never opens raw storage keys or exposes storage credentials.

## Notifications

- `GET /notifications?page=1&limit=20&unread=true|false` returns `{ notifications, pagination }`.
- `GET /notifications/:notificationId` returns an owned notification.
- `PATCH /notifications/:notificationId/read` marks an owned item as read.
- `PATCH /notifications/read-all` marks all owned unread items as read.

Notifications are in-app only; no push-notification subscription endpoint is implemented.

## Device information

- `GET /device` returns `{ activeDevice, pendingDevice }`.
- `POST /device/register` expects `{ "deviceIdentifier": "…", "publicKey": "optional" }` and creates an admin-reviewed pending registration.
- `DELETE /device/request-replacement` expects `{ "deviceIdentifier": "…", "publicKey": "optional", "reason": "optional" }` and creates an admin-reviewed replacement request.

The frontend shows device status only. It does not manufacture a hardware identifier or public key, so it cannot safely invoke device registration/replacement without an existing secure device-key workflow.

Typical failures are 401 (invalid/expired session), 403 (non-student/disabled account), 404 (no active enrollment or unavailable resource), 409 (device policy conflict), and 422 (validation error).
