import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type InboundDedupeResult =
  | { ok: true; isDuplicate: false }
  | { ok: true; isDuplicate: true }
  | { ok: false; error: string };

export async function checkAndMarkInboundMessage(params: {
  messageSid: string;
  phone: string;
  rawBody?: string | null;
}): Promise<InboundDedupeResult> {
  try {
    const { messageSid, phone, rawBody } = params;

    if (!messageSid) {
      return { ok: false, error: "Missing messageSid" };
    }

    const supabase = getSupabaseAdmin();

    const { data: existing, error: readError } = await supabase
      .from("processed_inbound_messages")
      .select("message_sid")
      .eq("message_sid", messageSid)
      .maybeSingle();

    if (readError) {
      return { ok: false, error: readError.message };
    }

    if (existing) {
      return { ok: true, isDuplicate: true };
    }

    const { error: insertError } = await supabase
      .from("processed_inbound_messages")
      .insert({
        message_sid: messageSid,
        phone,
        raw_body: rawBody ?? null,
      });

    if (insertError) {
      const msg = (insertError.message || "").toLowerCase();

      if (
        msg.includes("duplicate") ||
        msg.includes("unique") ||
        msg.includes("already exists")
      ) {
        return { ok: true, isDuplicate: true };
      }

      return { ok: false, error: insertError.message };
    }

    return { ok: true, isDuplicate: false };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown dedupe error",
    };
  }
}
