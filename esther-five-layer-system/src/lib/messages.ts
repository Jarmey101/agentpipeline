import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { MessageRow } from "@/lib/types";

export async function insertMessage(params: {
  phone: string;
  role: "user" | "assistant";
  content: string;
}) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("messages").insert(params);
  if (error) {
    throw new Error(`messages insert failed: ${error.message}`);
  }
}

export async function getRecentMessages(phone: string, limit = 6): Promise<MessageRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("messages")
    .select("id, phone, role, content, created_at")
    .eq("phone", phone)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`messages fetch failed: ${error.message}`);
  }

  return ((data || []) as MessageRow[]).reverse();
}

export async function getLastAssistantQuestion(phone: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("messages")
    .select("content")
    .eq("phone", phone)
    .eq("role", "assistant")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`last assistant fetch failed: ${error.message}`);
  }

  return data?.content || null;
}
