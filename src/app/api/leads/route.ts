import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LeadSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  email: z.string().email().max(160),
  phone: z.string().max(40).optional().or(z.literal("")),
  leadType: z.enum(["Buyer", "Seller", "Investor"]).default("Buyer"),
  timeline: z
    .enum(["0-3 months", "3-6 months", "6-12 months", "12+ months"])
    .default("0-3 months"),
  budget: z.string().max(80).optional().or(z.literal("")),
  area: z.string().max(120).optional().or(z.literal("")),
});

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

function boolEnv(name: string, fallback = false): boolean {
  const v = env(name);
  if (!v) return fallback;
  return v === "1" || v.toLowerCase() === "true" || v.toLowerCase() === "yes";
}

function supabaseAdmin() {
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function normalizeLead(body: any) {
  return {
    firstName: body.firstName ?? body.first_name ?? body.first ?? body.fname ?? "",
    lastName: body.lastName ?? body.last_name ?? body.last ?? body.lname ?? "",
    email: body.email ?? "",
    phone: body.phone ?? body.phone_number ?? body.mobile ?? "",
    leadType: body.leadType ?? body.lead_type ?? body.type ?? body.intent ?? "Buyer",
    timeline: body.timeline ?? body.timeframe ?? body.move_timeline ?? "0-3 months",
    budget: body.budget ?? body.budgetRange ?? body.budget_range ?? "",
    area: body.area ?? body.preferredArea ?? body.preferred_area ?? "",
  };
}

function safe(v?: string | null) {
  return (v ?? "").toString().trim();
}

function fmt(phone: string) {
  return phone || "N/A";
}

function isPublicHttpsBaseUrl(baseUrl?: string) {
  if (!baseUrl) return false;
  const u = baseUrl.trim();
  if (!u.startsWith("https://")) return false;
  if (u.includes("localhost")) return false;
  if (u.includes("127.0.0.1")) return false;
  return true;
}

async function sendSmsIfConfigured(toPhone: string, message: string) {
  const sid = env("TWILIO_ACCOUNT_SID");
  const token = env("TWILIO_AUTH_TOKEN");
  const from = env("TWILIO_FROM_PHONE");
  if (!sid || !token || !from) throw new Error("Twilio env missing (SID/TOKEN/FROM)");

  const baseUrl = env("APP_BASE_URL");
  const secret = env("TWILIO_WEBHOOK_SECRET");

  // Twilio requires a public HTTPS URL. Never attach callback for localhost/dev.
  const statusCallback =
    isPublicHttpsBaseUrl(baseUrl) && secret
      ? `${baseUrl}/api/webhooks/twilio/message-status?secret=${encodeURIComponent(secret)}`
      : undefined;

  const twilioMod = await import("twilio");
  const client = twilioMod.default(sid, token);

  return client.messages.create({
    from,
    to: toPhone,
    body: message,
    ...(statusCallback ? { statusCallback } : {}),
  });
}

async function recordNotification(args: {
  sb: any;
  leadId: string;
  channel: "sms" | "whatsapp" | "email";
  toValue: string;
  fromValue?: string | null;
  provider: string;
  providerMessageId?: string | null;
  status: string;
  payload?: any;
  errorMessage?: string | null;
  errorCode?: string | null;
}) {
  const { sb, ...row } = args;

  const { error } = await sb.from("lead_notifications").insert({
    lead_id: row.leadId,
    channel: row.channel,
    to_value: row.toValue,
    from_value: row.fromValue ?? null,
    provider: row.provider,
    provider_message_id: row.providerMessageId ?? null,
    status: row.status,
    payload: row.payload ?? {},
    error_message: row.errorMessage ?? null,
    error_code: row.errorCode ?? null,
  });

  if (error) console.error("SUPABASE: lead_notifications insert failed:", error.message);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const normalized = normalizeLead(body);
    const parsed = LeadSchema.safeParse(normalized);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const lead = parsed.data;

    const sb = supabaseAdmin();
    if (!sb) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Supabase not configured. Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
        },
        { status: 500 }
      );
    }

    const insertPayload = {
      first_name: lead.firstName,
      last_name: lead.lastName,
      email: lead.email,
      phone: safe(lead.phone) || null,
      lead_type: lead.leadType,
      timeline: lead.timeline,
      budget: safe(lead.budget) || null,
      area: safe(lead.area) || null,
      status: "new",
    };

    const { data, error } = await sb.from("leads").insert(insertPayload).select("id").single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: "Database insert failed", details: error.message },
        { status: 500 }
      );
    }

    const leadId = data.id as string;

    // ---------- TWILIO AGENT ALERT ----------
    const agentTo = env("AGENT_SMS_TO");
    if (agentTo) {
      const alertMsg =
        `NEW LEAD (${lead.leadType})\n` +
        `${lead.firstName} ${lead.lastName}\n` +
        `Email: ${lead.email}\n` +
        `Phone: ${fmt(safe(lead.phone))}\n` +
        `Timeline: ${lead.timeline}\n` +
        `Budget: ${safe(lead.budget) || "N/A"}\n` +
        `Area: ${safe(lead.area) || "N/A"}\n` +
        `ID: ${leadId}`;

      try {
        const msg = await sendSmsIfConfigured(agentTo, alertMsg);

        await recordNotification({
          sb,
          leadId,
          channel: "sms",
          toValue: agentTo,
          fromValue: env("TWILIO_FROM_PHONE") ?? null,
          provider: "twilio",
          providerMessageId: msg.sid,
          status: msg.status || "queued",
          payload: { kind: "agent_alert" },
        });

        console.log("TWILIO: agent alert sent to", agentTo, "sid:", msg.sid);
      } catch (err: any) {
        await recordNotification({
          sb,
          leadId,
          channel: "sms",
          toValue: agentTo,
          fromValue: env("TWILIO_FROM_PHONE") ?? null,
          provider: "twilio",
          providerMessageId: null,
          status: "failed",
          payload: { kind: "agent_alert" },
          errorMessage: err?.message || String(err),
        });

        console.error("TWILIO: agent alert failed:", err?.message || err);
      }
    }

    // ---------- OPTIONAL LEAD CONFIRMATION ----------
    const sendLeadConfirm = boolEnv("SEND_LEAD_CONFIRMATION_SMS", false);
    const leadPhone = safe(lead.phone);

    if (sendLeadConfirm && leadPhone) {
      const confirmMsg = "Hi! This is Marie Arne. I received your request and will reach out shortly.";
      try {
        const msg = await sendSmsIfConfigured(leadPhone, confirmMsg);

        await recordNotification({
          sb,
          leadId,
          channel: "sms",
          toValue: leadPhone,
          fromValue: env("TWILIO_FROM_PHONE") ?? null,
          provider: "twilio",
          providerMessageId: msg.sid,
          status: msg.status || "queued",
          payload: { kind: "lead_confirmation" },
        });

        console.log("TWILIO: lead confirmation sent to", leadPhone, "sid:", msg.sid);
      } catch (err: any) {
        await recordNotification({
          sb,
          leadId,
          channel: "sms",
          toValue: leadPhone,
          fromValue: env("TWILIO_FROM_PHONE") ?? null,
          provider: "twilio",
          providerMessageId: null,
          status: "failed",
          payload: { kind: "lead_confirmation" },
          errorMessage: err?.message || String(err),
        });

        console.error("TWILIO: lead confirmation failed:", err?.message || err);
      }
    }

    return NextResponse.json({ ok: true, id: leadId }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "Server error", details: String(e?.message || e) },
      { status: 500 }
    );
  }
}
