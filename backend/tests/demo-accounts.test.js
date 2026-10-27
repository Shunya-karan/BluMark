import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createAdminAuthClient: vi.fn(),
  disconnectDatabase: vi.fn(),
  findDemoInstitutionProfiles: vi.fn(),
}));

vi.mock("../src/config/supabase.js", () => ({ createAdminAuthClient: mocks.createAdminAuthClient }));
vi.mock("../src/repositories/database.repository.js", () => ({ disconnectDatabase: mocks.disconnectDatabase }));
vi.mock("../src/modules/auth/auth.repository.js", () => ({ findDemoInstitutionProfiles: mocks.findDemoInstitutionProfiles }));

const { assertDevelopmentEnvironment, provisionDemoAccounts } = await import("../scripts/demo-accounts.js");

function makeAdmin(users = []) {
  const createUser = vi.fn(async (attributes) => ({ data: { user: { ...attributes, id: attributes.id } }, error: null }));
  return {
    auth: { admin: {
      listUsers: vi.fn(async ({ page, perPage }) => ({ data: { users: page === 1 ? users.slice(0, perPage) : [] }, error: null })),
      createUser,
    } },
  };
}

const profile = (overrides = {}) => ({
  id: "0d25d9ca-6bf8-42a1-a903-3e1cedd87d77",
  fullName: "Demo Teacher",
  role: "TEACHER",
  isActive: true,
  ...overrides,
});

describe("demo account provisioning", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires an explicit development environment and server-side credentials", () => {
    expect(() => assertDevelopmentEnvironment({ NODE_ENV: "production", SUPABASE_URL: "x", SUPABASE_SERVICE_ROLE_KEY: "y" })).toThrow(/development/);
    expect(() => assertDevelopmentEnvironment({ NODE_ENV: "development", SUPABASE_ENVIRONMENT: "development", DEMO_SUPABASE_PROJECT_REF: "devref123", SUPABASE_URL: "https://devref123.supabase.co" })).toThrow(/service key/);
    expect(() => assertDevelopmentEnvironment({ NODE_ENV: "development", SUPABASE_ENVIRONMENT: "development", DEMO_SUPABASE_PROJECT_REF: "devref123", SUPABASE_URL: "https://devref123.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "y" })).not.toThrow();
  });

  it("creates a confirmed Auth user with the profile UUID and demo marker", async () => {
    const adminClient = makeAdmin();
    const item = profile();
    const report = await provisionDemoAccounts({ profiles: [item], adminClient, password: "development-only-password" });
    expect(report).toEqual({ created: 1, alreadyExisting: 0, skipped: 0, failed: 0 });
    expect(adminClient.auth.admin.createUser).toHaveBeenCalledWith(expect.objectContaining({
      id: item.id,
      email: `blumark.demo.teacher.${item.id}@example.com`,
      password: "development-only-password",
      email_confirm: true,
      app_metadata: expect.objectContaining({ blumark_demo_account: true, blumark_profile_id: item.id }),
    }));
  });

  it("does not change credentials for an Auth user whose UUID already matches", async () => {
    const item = profile();
    const adminClient = makeAdmin([{ id: item.id, email: "existing-real-user@example.net" }]);
    const report = await provisionDemoAccounts({ profiles: [item], adminClient, password: "unused-password" });
    expect(report.alreadyExisting).toBe(1);
    expect(adminClient.auth.admin.createUser).not.toHaveBeenCalled();
  });

  it("refuses a demo email already owned by a different Auth UUID", async () => {
    const item = profile();
    const email = `blumark.demo.teacher.${item.id}@example.com`;
    const adminClient = makeAdmin([{ id: "3dba68e1-6289-472a-9150-e51561567d2c", email }]);
    const report = await provisionDemoAccounts({ profiles: [item], adminClient, password: "unused-password" });
    expect(report.failed).toBe(1);
    expect(adminClient.auth.admin.createUser).not.toHaveBeenCalled();
  });

  it("skips inactive profiles", async () => {
    const adminClient = makeAdmin();
    const report = await provisionDemoAccounts({ profiles: [profile({ isActive: false })], adminClient, password: "unused-password" });
    expect(report.skipped).toBe(1);
    expect(adminClient.auth.admin.createUser).not.toHaveBeenCalled();
  });
});
