import "dotenv/config";
import { listProfilesForReconciliation } from "../src/modules/auth/auth.repository.js";
import { disconnectDatabase } from "../src/repositories/database.repository.js";
import { createAdminAuthClient } from "../src/config/supabase.js";
async function main() {
  const all = [];
  const admin = createAdminAuthClient();
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) throw new Error("Supabase user listing failed.");
    all.push(...data.users);
    if (data.users.length < 1000) break;
    page++;
  }
  const byId = new Map(all.map((u) => [u.id, u]));
  const profiles = await listProfilesForReconciliation();
  console.log(
    "Dry-run only: no profile IDs, Auth users, or database records will be changed.",
  );
  for (const p of profiles) {
    const exact = byId.get(p.id),
      same = all.filter(
        (u) => u.email?.toLowerCase() === p.email.toLowerCase(),
      ),
      refs = Object.values(p._count).reduce((a, b) => a + b, 0);
    const status = exact
      ? exact.email?.toLowerCase() === p.email.toLowerCase()
        ? "MATCH"
        : "ID_MATCH_EMAIL_DIFF"
      : same.length
        ? "EMAIL_MATCH_ID_MISMATCH"
        : "NO_AUTH_USER_MATCH";
    console.log(
      JSON.stringify({
        status,
        profileId: p.id,
        email: p.email,
        role: p.role,
        authUserId: same[0]?.id ?? null,
        relatedRecordCount: refs,
      }),
    );
  }
  console.log(
    `Profiles checked: ${profiles.length}; Supabase users checked: ${all.length}`,
  );
  console.log(
    "Only MATCH rows are ready for authentication. Resolve mismatches manually after reviewing all foreign-key relationships; never edit Profile.id directly.",
  );
}
main()
  .catch((e) => {
    console.error("Reconciliation preview failed:", e.message);
    process.exitCode = 1;
  })
  .finally(async () => disconnectDatabase());
