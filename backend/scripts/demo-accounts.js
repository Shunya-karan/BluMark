
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

import { createAdminAuthClient } from "../src/config/supabase.js";
import { disconnectDatabase } from "../src/repositories/database.repository.js";
import { findDemoInstitutionProfiles } from "../src/modules/auth/auth.repository.js";

const PAGE_SIZE = 200;
const MAX_PAGES = 10_000;
const DEMO_MARKER = "blumark_demo_account";

export function assertDevelopmentEnvironment(env = process.env) {
  if (env.NODE_ENV !== "development") {
    throw new Error(
      "Demo accounts can only be provisioned when NODE_ENV=development."
    );
  }

  if (env.SUPABASE_ENVIRONMENT !== "development") {
    throw new Error(
      "Set SUPABASE_ENVIRONMENT=development before provisioning demo accounts."
    );
  }

  const projectRef = env.DEMO_SUPABASE_PROJECT_REF;

  if (!/^[a-z0-9]{5,40}$/.test(projectRef ?? "")) {
    throw new Error(
      "Set DEMO_SUPABASE_PROJECT_REF to your development Supabase project reference."
    );
  }

  let supabaseUrl;

  try {
    supabaseUrl = new URL(env.SUPABASE_URL);
  } catch {
    throw new Error(
      "Set SUPABASE_URL to your development Supabase project URL."
    );
  }

  if (
    supabaseUrl.protocol !== "https:" ||
    supabaseUrl.hostname !== `${projectRef}.supabase.co`
  ) {
    throw new Error(
      "SUPABASE_URL does not match DEMO_SUPABASE_PROJECT_REF."
    );
  }

  if (
    !env.SUPABASE_SERVICE_ROLE_KEY &&
    !env.SUPABASE_SECRET_KEY
  ) {
    throw new Error(
      "Set a server-side Supabase service key in your local environment."
    );
  }

  if (
    env.DATABASE_URL?.includes("SUPABASE_POSTGRES_CONNECTION_STRING") ||
    env.SUPABASE_URL?.includes("SUPABASE_PROJECT_URL")
  ) {
    throw new Error(
      "Replace placeholder environment values with actual development credentials."
    );
  }
}

/**
 * Use the email already stored in the PostgreSQL Profile record.
 * Invalid addresses are rejected instead of silently replaced.
 */
export function demoEmail(profile) {
  const email = profile.email?.trim().toLowerCase();

  if (
    !email ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new Error(
      `Profile ${profile.id} has an invalid email: ${
        profile.email ?? "(missing)"
      }`
    );
  }

  return email;
}

export async function listAllAuthUsers(adminClient) {
  const users = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const { data, error } =
      await adminClient.auth.admin.listUsers({
        page,
        perPage: PAGE_SIZE,
      });

    if (error) {
      throw new Error("Unable to inspect Supabase Auth users.");
    }

    const batch = data?.users ?? [];
    users.push(...batch);

    if (batch.length < PAGE_SIZE) {
      return users;
    }
  }

  throw new Error(
    "Supabase Auth user listing exceeded the safety page limit."
  );
}

/**
 * Classify an account before making any changes.
 *
 * A matching email with a different UUID is a collision.
 * Never attach a profile to another user's Auth account.
 */
export function classifyExisting(profile, users) {
  const email = demoEmail(profile);

  const emailUser = users.find(
    (user) => user.email?.trim().toLowerCase() === email
  );

  if (emailUser && emailUser.id !== profile.id) {
    return {
      kind: "collision",
      user: emailUser,
      email,
    };
  }

  const sameId = users.find(
    (user) => user.id === profile.id
  );

  if (sameId) {
    return {
      kind: "existing",
      user: sameId,
      email,
    };
  }

  return {
    kind: "new",
    email,
  };
}

export async function provisionDemoAccounts({
  profiles,
  adminClient,
  password,
}) {
  const report = {
    created: 0,
    alreadyExisting: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
  };

  // Read existing Auth accounts once before provisioning.
  const users = await listAllAuthUsers(adminClient);

  for (const profile of profiles) {
    if (!profile.isActive) {
      report.skipped += 1;

      console.log(
        `SKIPPED ${profile.role} profile ${profile.id}: inactive profile.`
      );

      continue;
    }

    let existing;

    try {
      existing = classifyExisting(profile, users);
    } catch (error) {
      report.failed += 1;

      console.error(
        `FAILED ${profile.role} profile ${profile.id}: ${error.message}`
      );

      continue;
    }

    if (existing.kind === "collision") {
      report.failed += 1;

      console.error(
        `FAILED ${profile.role} profile ${profile.id}: ` +
          `email ${existing.email} belongs to a different Auth UUID. ` +
          "Resolve the account collision manually."
      );

      continue;
    }

    if (existing.kind === "existing") {
      const currentEmail =
        existing.user.email?.trim().toLowerCase();

      // Only update email when the Auth UUID already matches
      // the profile UUID.
      if (currentEmail !== existing.email) {
        const { data, error } =
          await adminClient.auth.admin.updateUserById(
            existing.user.id,
            {
              email: existing.email,
              email_confirm: true,
            }
          );

        if (error || data?.user?.id !== profile.id) {
          report.failed += 1;

          console.error(
            `FAILED ${profile.role} profile ${profile.id}: ` +
              "unable to update the matching Auth user's email."
          );

          continue;
        }

        Object.assign(existing.user, data.user);
        report.updated += 1;

        console.log(
          `UPDATED ${profile.role} profile ${profile.id}: ` +
            `${existing.email}`
        );
      } else {
        report.alreadyExisting += 1;

        console.log(
          `EXISTS ${profile.role} profile ${profile.id}: ` +
            "Auth UUID and email match. Password unchanged."
        );
      }

      continue;
    }

    // A new Auth user must use the existing Profile UUID.
    let response;

    try {
      response = await adminClient.auth.admin.createUser({
        id: profile.id,
        email: existing.email,
        password,
        email_confirm: true,

        user_metadata: {
          full_name: profile.fullName,
        },

        app_metadata: {
          [DEMO_MARKER]: true,
          blumark_profile_id: profile.id,
          blumark_role: profile.role,
        },
      });
    } catch {
      response = {
        data: null,
        error: new Error("Supabase Auth request failed."),
      };
    }

    const { data, error } = response ?? {};

    if (error || data?.user?.id !== profile.id) {
      report.failed += 1;

      console.error(
        `FAILED ${profile.role} profile ${profile.id}: ` +
          "Supabase Auth did not return the matching profile UUID."
      );

      continue;
    }

    users.push(data.user);
    report.created += 1;

    console.log(
      `CREATED ${profile.role} profile ${profile.id} -> ${existing.email}`
    );
  }

  return report;
}

async function main() {
  assertDevelopmentEnvironment();

  const password = process.env.DEMO_USER_PASSWORD;

  if (
    !password ||
    password === "replace-with-local-development-password" ||
    password.length < 12 ||
    password.length > 128
  ) {
    throw new Error(
      "Set DEMO_USER_PASSWORD locally (12-128 characters) before provisioning."
    );
  }

  const institution = await findDemoInstitutionProfiles();

  if (!institution) {
    throw new Error(
      "Seeded BLUMARK-DEMO institution was not found."
    );
  }

const activeAdmins = institution.profiles.filter(
  (profile) =>
    profile.role === "INSTITUTION_ADMIN" && profile.isActive
);

const activeTeachers = institution.profiles.filter(
  (profile) => profile.role === "TEACHER" && profile.isActive
);

const activeStudents = institution.profiles.filter(
  (profile) => profile.role === "STUDENT" && profile.isActive
);

if (activeAdmins.length !== 1) {
  throw new Error(
    `BLUMARK-DEMO must contain exactly 1 active institution admin; ` +
      `found $DIL0.`
  );
}

  if (
    activeTeachers.length < 2 ||
    activeStudents.length < 5
  ) {
    throw new Error(
      "BLUMARK-DEMO must contain at least 2 active teachers " +
        "and 5 active students; found " +
        `${activeTeachers.length} teachers and ${activeStudents.length} students.`
    );
  }

  console.log(
    `Provisioning accounts for ${institution.name} ` +
      `(${activeTeachers.length} teachers, ${activeStudents.length} students).`
  );

  const adminClient = createAdminAuthClient();

  const report = await provisionDemoAccounts({
    profiles: institution.profiles,
    adminClient,
    password,
  });

  console.log(
    "\nProvisioning summary:",
    `created=${report.created},`,
    `already-existing=${report.alreadyExisting},`,
    `updated=${report.updated},`,
    `skipped=${report.skipped},`,
    `failed=${report.failed}.`
  );

  if (report.failed > 0) {
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  import.meta.url ===
    pathToFileURL(resolve(process.argv[1])).href
) {
  main()
    .catch((error) => {
      console.error(
        `Demo account provisioning failed: ${error.message}`
      );

      process.exitCode = 1;
    })
    .finally(async () => {
      await disconnectDatabase();
    });
}
