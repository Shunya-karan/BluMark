# Blu-Mark Authentication

## Architecture and migration

Blu-Mark uses application-managed credentials and JWT sessions. PostgreSQL remains the application database; Supabase Auth is removed. Existing Profile UUIDs are retained, preserving class assignments, enrollments, attendance, devices, sessions, and audit references.

The additive migration creates `UserCredential`, `AuthSession`, `PasswordResetToken`, and `AccountActivationToken`. Existing profiles receive no password and are not automatically authenticated. They must request an activation link at `POST /api/v1/auth/activation/request` and set a password at `POST /api/v1/auth/activation/complete`. Activation lookup rejects ambiguous matching profile emails; normalized credential emails are globally unique.

Migration steps:

1. Back up PostgreSQL and verify that the target is a non-production database.
2. Apply the additive migration using `npx prisma migrate deploy --config prisma7.config.ts`.
3. Configure the environment variables described below and deploy the API with SMTP delivery enabled.
4. Activate existing profiles, then verify login and refresh-token rotation.
5. Only after verification, remove obsolete Supabase Auth settings from deployment environments. Keep any Supabase PostgreSQL connection settings still used by the application.

Rollback: stop the new API and restore the pre-migration database backup. The migration does not alter existing tables. A rollback may drop the four new tables only after confirming credentials and session history can be discarded. Never change Profile IDs or attendance foreign keys to roll back.

## Tokens and clients

Access JWTs use HS256 and contain only `sub`, `sid`, and `typ=access`. They expire within 5-15 minutes (default 15). The API validates algorithm, signature, issuer, audience, expiry, token type, session family, profile status, credential activation, and institution status on each protected request. The database lookup makes logout and password-reset revocation effective immediately; short expiry is an additional limit.

Refresh tokens are 256-bit opaque random values; PostgreSQL stores only SHA-256 hashes. Every rotation retains the consumed hash so reuse revokes the whole family. Refresh operations serialize on the consumed row with a PostgreSQL lock. Sessions expire after 7 days idle or 30 days absolute.

Flutter receives access and refresh tokens in JSON and must store them with platform secure storage (Keychain/Android Keystore via a secure-storage plugin). Do not put tokens in ordinary preferences or logs. Browser clients send `X-Auth-Transport: cookie`; the API uses HttpOnly, SameSite=Strict cookies and Secure in production. Browser requests must use credentialed CORS from an allowlisted HTTPS origin.

## Provisioning and activation

Institution admins can create one account through `POST /api/v1/auth/provision-user` or process up to 100 records through `POST /api/v1/auth/provision-users`. Roles remain `INSTITUTION_ADMIN`, `TEACHER`, and `STUDENT`. Every record is validated and committed separately so row failures do not roll back successful rows. Per-institution profile count is capped by `MAX_PROFILES_PER_INSTITUTION`.

Provisioned accounts start inactive with no password hash. Users activate through a high-entropy, single-use link that expires after 30 minutes; only the SHA-256 token hash is stored. Bulk provisioning does not send email. SMTP is used only when a user requests activation or password reset. If SMTP is not configured, these endpoints return service unavailable and do not create tokens.

## Password recovery and sessions

Password changes require the current password and revoke all sessions. Forgot-password responses do not reveal whether an email exists. Reset tokens expire after 30 minutes, are single-use and hash-only, and a successful reset revokes all sessions and outstanding reset tokens.

Login, refresh, activation, and reset endpoints are rate limited. Five failed logins lock a credential for 15 minutes. The built-in limiter uses an in-memory store; configure a shared store before horizontally scaling production API replicas. Request logs must not contain passwords, tokens, password hashes, or email bodies.

## Environment

Copy `.env.example` to `.env`. Configure `DATABASE_URL`, `FRONTEND_URL`, and a random `JWT_ACCESS_SECRET` of at least 32 bytes. `JWT_ACCESS_TTL_SECONDS` must be 300-900. Production requires SMTP settings and numeric `TRUST_PROXY_HOPS` matching the trusted TLS proxy chain. Production frontend origins must use HTTPS.

## Endpoints

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/provision-user`
- `POST /api/v1/auth/provision-users`
- `POST /api/v1/auth/activation/request`
- `POST /api/v1/auth/activation/complete`
- `POST /api/v1/auth/change-password`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`
