import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import AppError from "../utils/AppError.js";
const options = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
  global: {
    fetch: (input, init = {}) =>
      fetch(input, {
        ...init,
        signal: init.signal ?? AbortSignal.timeout(10_000),
      }),
  },
};
export function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL,
    anonKey =
      process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY,
    serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !anonKey)
    throw new Error(
      "Missing SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY (or SUPABASE_ANON_KEY).",
    );
  return { url, anonKey, serviceKey };
}
export function assertSupabaseConfig() {
  if (!getSupabaseConfig().serviceKey)
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY); admin auth features require it.",
    );
}
export function createPublicAuthClient() {
  const { url, anonKey } = getSupabaseConfig();
  return createClient(url, anonKey, options);
}
export function createAdminAuthClient() {
  const { url, serviceKey } = getSupabaseConfig();
  if (!serviceKey)
    throw new AppError("Authentication service is not configured", 503);
  return createClient(url, serviceKey, options);
}
export async function verifyAccessToken(token) {
  const { data, error } = await createPublicAuthClient().auth.getUser(token);
  return error || !data?.user?.id ? null : data.user;
}
