CREATE TABLE "user_credentials" (
    "profile_id" UUID NOT NULL,
    "email_normalized" VARCHAR(254) NOT NULL,
    "password_hash" TEXT,
    "password_changed_at" TIMESTAMPTZ(3),
    "must_change_password" BOOLEAN NOT NULL DEFAULT false,
    "activated_at" TIMESTAMPTZ(3),
    "failed_login_count" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "user_credentials_pkey" PRIMARY KEY ("profile_id")
);

CREATE TABLE "auth_sessions" (
    "id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "refresh_token_hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "absolute_expires_at" TIMESTAMPTZ(3) NOT NULL,
    "last_used_at" TIMESTAMPTZ(3),
    "rotated_at" TIMESTAMPTZ(3),
    "revoked_at" TIMESTAMPTZ(3),
    "revocation_reason" VARCHAR(64),
    "ip_address" VARCHAR(64),
    "user_agent" VARCHAR(512),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "used_at" TIMESTAMPTZ(3),
    "revoked_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "account_activation_tokens" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "used_at" TIMESTAMPTZ(3),
    "revoked_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "account_activation_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_credentials_email_normalized_key" ON "user_credentials"("email_normalized");
CREATE UNIQUE INDEX "auth_sessions_refresh_token_hash_key" ON "auth_sessions"("refresh_token_hash");
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");
CREATE UNIQUE INDEX "account_activation_tokens_token_hash_key" ON "account_activation_tokens"("token_hash");
CREATE INDEX "auth_sessions_family_id_revoked_at_idx" ON "auth_sessions"("family_id", "revoked_at");
CREATE INDEX "auth_sessions_profile_id_revoked_at_idx" ON "auth_sessions"("profile_id", "revoked_at");
CREATE INDEX "auth_sessions_expires_at_idx" ON "auth_sessions"("expires_at");
CREATE INDEX "password_reset_tokens_profile_id_expires_at_idx" ON "password_reset_tokens"("profile_id", "expires_at");
CREATE INDEX "account_activation_tokens_profile_id_expires_at_idx" ON "account_activation_tokens"("profile_id", "expires_at");

ALTER TABLE "user_credentials" ADD CONSTRAINT "user_credentials_profile_id_fkey"
    FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_profile_id_fkey"
    FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_profile_id_fkey"
    FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "account_activation_tokens" ADD CONSTRAINT "account_activation_tokens_profile_id_fkey"
    FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
