import { optEnv } from "./env";

export async function sendSms(to: string, body: string) {
  const sid = optEnv("TWILIO_ACCOUNT_SID");
  const token = optEnv("TWILIO_AUTH_TOKEN");
  const from = optEnv("TWILIO_FROM_NUMBER");
  if (!sid || !token || !from) return { skipped: true };

  const twilio = (await import("twilio")).default(sid, token);
  const msg = await twilio.messages.create({ to, from, body });
  return { skipped: false, sid: msg.sid };
}

export async function sendEmail(to: string, subject: string, html: string) {
  const key = optEnv("RESEND_API_KEY");
  const from = optEnv("EMAIL_FROM");
  if (!key || !from) return { skipped: true };

  const { Resend } = await import("resend");
  const resend = new Resend(key);
  const res = await resend.emails.send({ from, to, subject, html });
  return { skipped: false, id: res.data?.id };
}
