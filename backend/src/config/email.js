import "dotenv/config";
import nodemailer from "nodemailer";
import AppError from "../utils/AppError.js";

export function isEmailConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_FROM &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASSWORD,
  );
}

export function assertEmailConfigured() {
  if (!isEmailConfigured()) {
    throw new AppError("Email delivery is temporarily unavailable", 503);
  }
}

export function createEmailTransport() {
  assertEmailConfigured();
  const secure = process.env.SMTP_SECURE === "true";
  const port = Number(process.env.SMTP_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("SMTP_PORT must be a valid TCP port.");
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    requireTLS: !secure,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    logger: false,
    debug: false,
  });
}

async function sendLink({ email, subject, path, rawToken, intro }) {
  const transport = createEmailTransport();
  const frontend = process.env.FRONTEND_URL?.split(",")[0]?.trim();
  if (!frontend) throw new Error("FRONTEND_URL must be set for authentication emails.");
  const url = new URL(path, frontend);
  url.searchParams.set("token", rawToken);
  await transport.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject,
    text: `${intro}\n\n${url.toString()}\n\nIf you did not request this, ignore this message.`,
  });
}

export function sendActivationEmail(email, rawToken) {
  return sendLink({
    email,
    subject: "Activate your Blu-Mark account",
    path: "/auth/activate",
    rawToken,
    intro: "Use this one-time link to activate your Blu-Mark account and set your password.",
  });
}

export function sendPasswordResetEmail(email, rawToken) {
  return sendLink({
    email,
    subject: "Reset your Blu-Mark password",
    path: "/auth/reset-password",
    rawToken,
    intro: "Use this one-time link to reset your Blu-Mark password.",
  });
}

export async function sendProvisionedUserCredentials(email, { fullName, temporaryPassword }) {
  const transport = createEmailTransport();
  const frontend = process.env.FRONTEND_URL?.split(",")[0]?.trim();
  if (!frontend) throw new Error("FRONTEND_URL must be set for authentication emails.");
  const url = new URL("/auth/login", frontend);

  const text = `Hello ${fullName},

Your Blu-Mark account has been successfully created by your institution administrator.

Your login credentials are:

Email: ${email}

Temporary Password: ${temporaryPassword}

Login URL: ${url.toString()}

For security reasons, you must change your temporary password immediately after your first login.

Please do not share your credentials with anyone.

Regards,
Blu-Mark Team`;

  const html = `
    <p>Hello ${fullName},</p>
    <p>Your Blu-Mark account has been successfully created by your institution administrator.</p>
    <p>Your login credentials are:</p>
    <ul>
      <li><strong>Email:</strong> ${email}</li>
      <li><strong>Temporary Password:</strong> ${temporaryPassword}</li>
    </ul>
    <p><a href="${url.toString()}">Login URL</a></p>
    <p>For security reasons, you must change your temporary password immediately after your first login.</p>
    <p>Please do not share your credentials with anyone.</p>
    <p>Regards,<br/>Blu-Mark Team</p>
  `;

  await transport.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: "Your Blu-Mark Account Has Been Created",
    text,
    html,
  });
}

