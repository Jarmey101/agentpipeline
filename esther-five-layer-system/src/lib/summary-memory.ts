import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function getConversationSummary(phone: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("conversation_summaries")
    .select("summary")
    .eq("phone", phone)
    .maybeSingle();

  if (error) {
    throw new Error(`conversation summary fetch failed: ${error.message}`);
  }

  return data?.summary || null;
}

export async function upsertConversationSummary(phone: string, summary: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("conversation_summaries").upsert(
    {
      phone,
      summary,
    },
    { onConflict: "phone" }
  );

  if (error) {
    throw new Error(`conversation summary upsert failed: ${error.message}`);
  }
}
