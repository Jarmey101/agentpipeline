import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Twilio Delivery Status Webhook
 * POST /api/webhooks/twilio/message-status?secret=YOUR_SECRET
 *
 * Twilio will POST application/x-www-form-urlencoded by default.
 * We gate the endpoint with a shared secret (your secret, not Twilio's).
 *
 * This endpoint records:
 *  - raw webhook payload -> provider_webhook_events
 *  - updates lead_notifications.status by provider_message_id (MessageSid)
 */

export async function POST(req: Request) {
  // 1) Verify shared secret
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");

  if (!secret || secret !== process.env.TWILIO_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  // 2) Parse Twilio form body
  const form = await req.formData();
  const payload: Record<string, any> = {};
  form.forEach((v, k) => (payload[k] = v));

  const messageSid = (payload.MessageSid || payload.SmsSid || "").toString() || null;
  const messageStatus = (payload.MessageStatus || payload.SmsStatus || "").toString() || null;
  const errorCode = payload.ErrorCode != null ? String(payload.ErrorCode) : null;
  const errorMessage = payload.ErrorMessage != null ? String(payload.ErrorMessage) : null;

  // 3) Supabase (service role)
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!sbUrl || !sbKey) {
    return NextResponse.json(
      {
        ok: false,
        error: "Supabase not configured. Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
      },
      { status: 500 }
    );
  }

  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(sbUrl, sbKey, { auth: { persistSession: false } });

  // 4) Store raw webhook event
  const { error: evErr } = await sb.from("provider_webhook_events").insert({
    provider: "twilio",
    event_type: "message.status",
    provider_message_id: messageSid,
    payload,
  });

  // 5) Update notification status (if you are tracking notifications)
  // NOTE: requires lead_notifications table and provider_message_id = Twilio MessageSid
  let updErrMsg: string | null = null;

  if (messageSid) {
    const { error: updErr } = await sb
      .from("lead_notifications")
      .update({
        status: messageStatus || "unknown",
        error_code: errorCode,
        error_message: errorMessage,
        updated_at: new Date().toISOString(),
      })
      .eq("provider_message_id", messageSid);

    if (updErr) updErrMsg = updErr.message;
  }

  // Twilio expects fast 200 OK. Do not fail hard unless unauthorized.
  return NextResponse.json(
    {
      ok: true,
      messageSid,
      messageStatus,
      storedEvent: !evErr,
      eventError: evErr?.message || null,
      notificationUpdateError: updErrMsg,
    },
    { status: 200 }
  );
}
