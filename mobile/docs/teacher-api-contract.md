# Blu-Mark Teacher API Contract

Base path: `/api/v1/teacher`
Authorization: `Bearer <token>`
Roles: `TEACHER`

## Dashboard
- `GET /dashboard`
- `GET /dashboard/summary`
- `GET /dashboard/today-schedule`
- `GET /dashboard/attendance-summary`
- `GET /dashboard/recent-activity`

## Profile
- `GET /profile`
- `PATCH /profile` (body: profileUpdateSchema)
- `GET /profile/department`
- `GET /profile/subjects`

## Assigned Classes
- `GET /classes`
- `GET /classes/:classId`
- `GET /classes/:classId/subjects`
- `GET /classes/:classId/subjects/:subjectId`
- `GET /classes/:classId/statistics`
- `GET /classes/:classId/students/directory` (query: studentDirectoryQuerySchema)
- `GET /classes/:classId/students`
- `GET /classes/:classId/students/:studentId`

## Timetable
- `GET /timetable`
- `GET /timetable/day/:weekday`

## Attendance Management
- `GET /attendance/history` (query: attendanceHistoryQuerySchema)
- `GET /attendance/sessions/:sessionId`
- `GET /attendance/sessions/:sessionId/records` (query: sessionAttendanceQuerySchema)
- `POST /attendance/sessions` (body: createAttendanceSessionSchema)
- `PATCH /attendance/sessions/:sessionId/end`
- `GET /attendance/sessions/:sessionId/live`
- `POST /attendance/sessions/:sessionId/records/manual` (body: manualAttendanceSchema)
- `PATCH /attendance/sessions/:sessionId/records/:recordId` (body: correctAttendanceSchema)
- `POST /attendance/sessions/:sessionId/records/bulk` (body: bulkManualAttendanceSchema)
- `PATCH /attendance/sessions/:sessionId/records/bulk` (body: bulkUpdateAttendanceSchema)
- `GET /attendance/sessions/:sessionId/attendance`

## Study Materials
- `GET /study-materials` (query: studyMaterialQuerySchema)
- `GET /study-materials/:materialId`
- `POST /study-materials` (multipart/form-data, body: createStudyMaterialSchema)
- `PATCH /study-materials/:materialId` (multipart/form-data, body: updateStudyMaterialSchema)
- `DELETE /study-materials/:materialId`
- `GET /study-materials/:materialId/download`

## Notes
- All successful responses wrap payloads as `{ "success": true, "message": "...", "data": { ... } }`.
- Failed requests wrap payloads as `{ "success": false, "message": "..." }`.
- Notifications seem to be missing from `teacher.routes.js`, though there is an admin notification route. I will use the general structure or document it as a missing API if needed.