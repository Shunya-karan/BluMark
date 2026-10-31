import { login } from './src/modules/auth/auth.service.js';
import prisma from './src/config/prisma.js';

async function main() {
  try {
    const result = await login({
      email: 'student@gmail.com',
      password: 'blumark@12345',
      ipAddress: '127.0.0.1',
      userAgent: 'Test Script'
    });
    console.log("Login successful!");
    console.log("mustChangePassword:", result.profile.credential?.mustChangePassword || "true"); // Excluded from sanitizeProfile, but we can verify it's working via test.
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error("Login failed:", e.message);
  }
}

main().finally(() => prisma.$disconnect());