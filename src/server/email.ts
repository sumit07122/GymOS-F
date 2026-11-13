import { Resend } from "resend";
import { env } from "./env";

let resendInstance: Resend | undefined;

function getResendClient(): Resend | null {
  const apiKey = env().RESEND_API_KEY;
  if (!apiKey) return null;
  return (resendInstance ??= new Resend(apiKey));
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: SendEmailOptions): Promise<{ success: boolean; id?: string; error?: string }> {
  const resend = getResendClient();
  if (!resend) {
    console.info(
      `[email:skipped] Resend API key not configured. Target: ${
        Array.isArray(to) ? to.join(", ") : to
      }, Subject: ${subject}`
    );
    return { success: false, error: "RESEND_API_KEY_NOT_CONFIGURED" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: env().EMAIL_FROM,
      to,
      subject,
      html,
      text,
    });

    if (error) {
      console.error("[email:error]", error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[email:exception]", msg);
    return { success: false, error: msg };
  }
}

/** Sends an acknowledgment email when a gym submits a registration request. */
export async function sendRegistrationReceivedEmail(params: {
  ownerEmail: string;
  ownerName: string;
  gymName: string;
}) {
  const subject = `FIXIA GymOS — Registration received for ${params.gymName}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #111;">
      <h2 style="color: #123b28; margin-bottom: 16px;">Registration Received</h2>
      <p>Hi ${params.ownerName},</p>
      <p>Thank you for registering <strong>${params.gymName}</strong> with <strong>FIXIA GymOS</strong>.</p>
      <p>Our team is reviewing your details. Once approved, you will receive your login link and onboarding instructions to configure your gym, membership plans, and staff access.</p>
      <hr style="border: 0; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
      <p style="color: #666; font-size: 13px;">If you have any questions, reply directly to this email or reach us at <a href="mailto:support@fixia.in" style="color: #167a45;">support@fixia.in</a>.</p>
      <p style="color: #999; font-size: 12px; margin-top: 24px;">© ${new Date().getFullYear()} FIXIA GymOS. All rights reserved.</p>
    </div>
  `;
  return sendEmail({
    to: params.ownerEmail,
    subject,
    html,
    text: `Hi ${params.ownerName},\n\nThank you for registering ${params.gymName} with FIXIA GymOS. Our team is reviewing your application and will follow up shortly.\n\n— FIXIA GymOS Team`,
  });
}

/** Sends an onboarding notification email when FIXIA admin approves the gym. */
export async function sendRegistrationApprovedEmail(params: {
  ownerEmail: string;
  ownerName: string;
  gymName: string;
  slug: string;
  appUrl?: string;
}) {
  const baseUrl = params.appUrl || process.env.NEXT_PUBLIC_APP_URL || "https://gymos.fixia.in";
  const loginUrl = `${baseUrl}/login`;
  const subject = `Welcome to FIXIA GymOS — ${params.gymName} is approved!`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #111;">
      <h2 style="color: #123b28; margin-bottom: 16px;">Your Gym is Approved! 🎉</h2>
      <p>Hi ${params.ownerName},</p>
      <p>We are excited to welcome <strong>${params.gymName}</strong> to <strong>FIXIA GymOS</strong>.</p>
      <p>Your gym workspace has been provisioned with the slug: <code>${params.slug}</code>.</p>
      <div style="margin: 32px 0;">
        <a href="${loginUrl}" style="background-color: #167a45; color: #ffffff; text-decoration: none; padding: 12px 24px; font-weight: 600; border-radius: 8px; display: inline-block;">
          Sign In to Your Gym Dashboard
        </a>
      </div>
      <p>Next steps:</p>
      <ol style="padding-left: 20px; line-height: 1.6;">
        <li>Sign in with your email (<code>${params.ownerEmail}</code>) and temporary password.</li>
        <li>Review your members in <strong>Owner &gt; Members</strong>.</li>
        <li>Download and print your reception check-in QR poster in <strong>Owner &gt; Attendance</strong>.</li>
      </ol>
      <hr style="border: 0; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
      <p style="color: #666; font-size: 13px;">Need assistance? Reply directly to this email.</p>
    </div>
  `;
  return sendEmail({
    to: params.ownerEmail,
    subject,
    html,
    text: `Hi ${params.ownerName},\n\nYour gym ${params.gymName} is approved! Sign in at: ${loginUrl}\n\n— FIXIA GymOS Team`,
  });
}

/** Sends 6-digit email enrollment verification OTP for member account security. */
export async function sendMemberEmailVerificationOtp(params: {
  to: string;
  memberName: string;
  otp: string;
}) {
  const subject = `Your GymOS Email Verification Code: ${params.otp}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #17251d;">
      <div style="margin-bottom: 24px; border-bottom: 2px solid #16834a; padding-bottom: 12px;">
        <h2 style="color: #16834a; margin: 0; font-size: 22px;">FIXIA GymOS</h2>
        <span style="font-size: 12px; color: #68776d; text-transform: uppercase; letter-spacing: 1px;">Account Security</span>
      </div>
      <p>Hi <strong>${params.memberName}</strong>,</p>
      <p>Please enter the following 6-digit verification code to secure your GymOS account and enable self-service password recovery:</p>
      <div style="margin: 28px 0; text-align: center;">
        <div style="display: inline-block; background-color: #f3f6f2; border: 2px solid #dfe8e0; border-radius: 12px; padding: 14px 28px; font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #16834a;">
          ${params.otp}
        </div>
      </div>
      <p style="font-size: 13px; color: #68776d;">This code is valid for <strong>5 minutes</strong> and can only be used once. If you did not request this verification, you can safely ignore this email.</p>
      <hr style="border: 0; border-top: 1px solid #dfe8e0; margin: 24px 0;" />
      <p style="color: #8a998f; font-size: 11px;">© ${new Date().getFullYear()} FIXIA GymOS Enterprise &middot; Neon Tenant Isolated</p>
    </div>
  `;
  return sendEmail({
    to: params.to,
    subject,
    html,
    text: `Hi ${params.memberName},\n\nYour GymOS email verification code is: ${params.otp}\n\nValid for 5 minutes.\n\n— FIXIA GymOS Team`,
  });
}

/** Sends password reset link to member with verified email. */
export async function sendPasswordResetEmail(params: {
  to: string;
  memberName: string;
  resetUrl: string;
  expiresMinutes?: number;
}) {
  const expires = params.expiresMinutes ?? 30;
  const subject = `Reset Your GymOS Password`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #17251d;">
      <div style="margin-bottom: 24px; border-bottom: 2px solid #16834a; padding-bottom: 12px;">
        <h2 style="color: #16834a; margin: 0; font-size: 22px;">FIXIA GymOS</h2>
        <span style="font-size: 12px; color: #68776d; text-transform: uppercase; letter-spacing: 1px;">Password Recovery</span>
      </div>
      <p>Hi <strong>${params.memberName}</strong>,</p>
      <p>We received a request to reset the password for your GymOS account. Click the secure link below to set your new password:</p>
      <div style="margin: 32px 0; text-align: center;">
        <a href="${params.resetUrl}" style="background-color: #16834a; color: #ffffff; text-decoration: none; padding: 14px 28px; font-weight: 700; border-radius: 10px; display: inline-block; box-shadow: 0 4px 12px rgba(22, 131, 74, 0.25);">
          Reset Password
        </a>
      </div>
      <p style="font-size: 13px; color: #68776d;">This secure reset link will expire in <strong>${expires} minutes</strong>. If the button does not work, copy and paste this link into your browser:</p>
      <p style="font-size: 12px; color: #16834a; word-break: break-all;">${params.resetUrl}</p>
      <p style="font-size: 13px; color: #68776d; margin-top: 24px;">If you did not request a password reset, no action is needed; your existing password remains safe.</p>
      <hr style="border: 0; border-top: 1px solid #dfe8e0; margin: 24px 0;" />
      <p style="color: #8a998f; font-size: 11px;">© ${new Date().getFullYear()} FIXIA GymOS Enterprise</p>
    </div>
  `;
  return sendEmail({
    to: params.to,
    subject,
    html,
    text: `Hi ${params.memberName},\n\nReset your GymOS password by visiting:\n${params.resetUrl}\n\nLink expires in ${expires} minutes.\n\n— FIXIA GymOS Team`,
  });
}

/** Sends notification confirming member password was changed. */
export async function sendPasswordChangedAlert(params: {
  to: string;
  memberName: string;
}) {
  const subject = `Your GymOS Password Was Changed`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #17251d;">
      <div style="margin-bottom: 24px; border-bottom: 2px solid #16834a; padding-bottom: 12px;">
        <h2 style="color: #16834a; margin: 0; font-size: 22px;">FIXIA GymOS</h2>
        <span style="font-size: 12px; color: #68776d; text-transform: uppercase; letter-spacing: 1px;">Security Alert</span>
      </div>
      <p>Hi <strong>${params.memberName}</strong>,</p>
      <p>This is a confirmation that your GymOS account password was successfully updated just now.</p>
      <p style="font-size: 13px; color: #68776d;">All other active login sessions have been signed out for your protection.</p>
      <p style="font-size: 13px; color: #dc5555; font-weight: 600; margin-top: 20px;">If you did not make this change, please contact your gym manager or FIXIA Platform support immediately.</p>
      <hr style="border: 0; border-top: 1px solid #dfe8e0; margin: 24px 0;" />
      <p style="color: #8a998f; font-size: 11px;">© ${new Date().getFullYear()} FIXIA GymOS Enterprise</p>
    </div>
  `;
  return sendEmail({
    to: params.to,
    subject,
    html,
    text: `Hi ${params.memberName},\n\nYour GymOS password was successfully changed. If you did not make this change, contact your gym desk immediately.\n\n— FIXIA GymOS Team`,
  });
}
