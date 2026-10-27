import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { createAdminAuthClient } from "../src/config/supabase.js";
import { disconnectDatabase } from "../src/repositories/database.repository.js";
import { findDemoInstitutionProfiles } from "../src/modules/auth/auth.repository.js";
import { assertDevelopmentEnvironment, DEMO_MARKER, listAllAuthUsers } from "./demo-accounts.js";

async function main() {
  assertDevelopmentEnvironment();
  if (!process.argv.includes("--confirm")) {
    throw new Error("Pass --confirm to delete only marked Blu-Mark demo Auth users. Profile and related database records will be retained.");
  }

  const institution = await findDemoInstitutionProfiles();
  if (!institution) throw new Error("Seeded BLUMARK-DEMO institution was not found.");
  const profileIds = new Set(institution.profiles.map((profile) => profile.id));
  const adminClient = createAdminAuthClient();
  const users = await listAllAuthUsers(adminClient);
  let deleted = 0;
  let skipped = 0;
  let failed = 0;

  for (const user of users) {
    if (user.app_metadata?.[DEMO_MARKER] !== true || !profileIds.has(user.id)) continue;
    if (user.app_metadata?.blumark_profile_id !== user.id) {
      skipped += 1;
      console.log(`SKIPPED Auth user ${user.id}: demo marker does not match profile UUID.`);
      continue;
    }
    const { error } = await adminClient.auth.admin.deleteUser(user.id);
    if (error) {
      failed += 1;
      console.error(`FAILED to delete marked demo Auth user ${user.id}.`);
    } else {
      deleted += 1;
      console.log(`DELETED marked demo Auth user ${user.id}; database profile and related records were retained.`);
    }
  }
  console.log(`Summary: deleted=${deleted}, skipped=${skipped}, failed=${failed}.`);
  if (failed > 0) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main()
    .catch((error) => {
      console.error(`Demo account cleanup failed: ${error.message}`);
      process.exitCode = 1;
    })
    .finally(disconnectDatabase);
}
