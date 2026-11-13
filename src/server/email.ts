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

export async function sendEmail({ to, subject, html, text }: SendEmailOptions): Promise<{ success: boolean; id?: string; error?: string }> {
  const resend = getResendClient();
  if (!resend) {
    console.info(`[email:skipped] Resend API key not configured. Target: ${Array.isArray(to) ? to.join(", ") : to}, Subject: ${subject}`);
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
      <p style="color: #666; font-size: 13px;">If you have any urgent questions, reply directly to this email or reach us at <a href="mailto:support@fixia.in" style="color: #167a45;">support@fixia.in</a>.</p>
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
      <p>Your gym account has been set up with the identifier: <code>${params.slug}</code>.</p>
      <div style="margin: 32px 0;">
        <a href="${loginUrl}" style="background-color: #167a45; color: #ffffff; text-decoration: none; padding: 12px 24px; font-weight: 600; border-radius: 4px; display: inline-block;">
          Sign In to Your Gym Dashboard
        </a>
      </div>
      <p>Next steps:</p>
      <ol style="padding-left: 20px; line-height: 1.6;">
        <li>Sign in with your email (<code>${params.ownerEmail}</code>) and password.</li>
        <li>Set up your membership plans in <strong>Owner &gt; Plans</strong>.</li>
        <li>Download and print your reception check-in QR poster in <strong>Owner &gt; Attendance</strong>.</li>
      </ol>
      <hr style="border: 0; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
      <p style="color: #666; font-size: 13px;">Need assistance? Reply directly to this email or contact support at <a href="mailto:support@fixia.in" style="color: #167a45;">support@fixia.in</a>.</p>
      <p style="color: #999; font-size: 12px; margin-top: 24px;">© ${new Date().getFullYear()} FIXIA GymOS. All rights reserved.</p>
    </div>
  `;
  return sendEmail({
    to: params.ownerEmail,
    subject,
    html,
    text: `Hi ${params.ownerName},\n\nYour gym ${params.gymName} is approved on FIXIA GymOS!\n\nSign in here: ${loginUrl}\nEmail: ${params.ownerEmail}\n\n— FIXIA GymOS Team`,
  });
}
