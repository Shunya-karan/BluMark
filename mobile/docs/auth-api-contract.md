# Blu-Mark authentication API contract

Base path: `/api/v1/auth`. Flutter uses bearer-token JSON transport (do **not** send `X-Auth-Transport: cookie`). All successful responses wrap payloads as `{ "success": true, "message": "…", "data": { … } }`; failures use `{ "success": false, "message": "…" }`.

## Session endpoints

- `POST /login` body: `{ "email": "person@example.com", "password": "…" }`. On success, `data` has `accessToken` (HS256 JWT), `refreshToken` (opaque rotating token), `tokenType: "Bearer"`, `expiresIn` (configured 300–604800 seconds; this deployment uses 604800), `refreshExpiresIn: 604800`, and `profile`.
- `POST /refresh` body: `{ "refreshToken": "…" }`. Returns the same session payload and rotates the refresh token. A token reused after rotation revokes its session family. Sessions expire after seven idle days or 30 absolute days.
- `GET /me` header: `Authorization: Bearer <accessToken>`. Returns the profile directly in `data`: `id`, `institutionId`, `fullName`, `email`, `phone`, `role`, `isActive`, `mustChangePassword`, plus optional `institution` (`id`, `name`, `code`, `type`), student or teacher details.
- `POST /logout` header: `Authorization: Bearer <accessToken>`. Revokes the entire server-side session family and returns `{ "revoked": true }`.

Access JWT claims are `sub`, `sid`, and `typ: "access"`; backend validation additionally checks signature, issuer/audience, expiry, session family, profile/credential activation, account status, and institution activity.

Roles are exactly `STUDENT`, `TEACHER`, and `INSTITUTION_ADMIN`. The Flutter entry flow permits only `STUDENT` and `TEACHER`, then verifies the backend-returned role before routing.

## Account lifecycle

- Login requires active profile and institution, activated credential, and no lockout. Invalid/inactive/locked accounts intentionally produce `401 Invalid email or password`.
- Provisioned accounts receive a temporary password and `mustChangePassword: true`; authenticated requests other than `/me`, `/change-password`, and `/logout` are blocked until `POST /change-password` succeeds. That endpoint takes `{ "currentPassword", "newPassword" }` and revokes sessions; the app asks the user to sign in again.
- Password reset is supported: `POST /forgot-password` body `{ "email" }` always gives a generic success message. Completing email-link reset is `POST /reset-password` with `{ "token", "newPassword" }`; no UI token-entry route exists because the backend email link targets a configured frontend URL.
- Activation endpoints are `POST /activation/request` `{ "email" }` and `POST /activation/complete` `{ "token", "password" }`. Activation/reset delivery requires SMTP.

For Flutter Web development, add the exact Chrome origin (for example `http://localhost:PORT`) to backend `FRONTEND_URL`; CORS rejects unallowlisted origins.
