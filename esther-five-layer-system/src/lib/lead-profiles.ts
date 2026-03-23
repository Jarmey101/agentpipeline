import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { LeadProfileRow } from "@/lib/types";

export async function getLeadProfile(phone: string): Promise<LeadProfileRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("lead_profiles")
    .select("phone, full_name, email, intent, city, state, budget_min, budget_max, bedrooms, bathrooms, timeline, financing_status, notes, last_summary, updated_at")
    .eq("phone", phone)
    .maybeSingle();

  if (error) {
    throw new Error(`lead profile fetch failed: ${error.message}`);
  }

  return (data as LeadProfileRow | null) || null;
}

function coalesce<T>(incoming: T | null | undefined, existing: T | null | undefined): T | null {
  if (incoming === null || incoming === undefined || incoming === "") {
    return existing ?? null;
  }
  return incoming;
}

export async function mergeLeadProfile(phone: string, incoming: Partial<LeadProfileRow>) {
  const supabase = getSupabaseAdmin();
  const existing = await getLeadProfile(phone);

  const merged: LeadProfileRow = {
    phone,
    full_name: coalesce(incoming.full_name, existing?.full_name),
    email: coalesce(incoming.email, existing?.email),
    intent: coalesce(incoming.intent, existing?.intent),
    city: coalesce(incoming.city, existing?.city),
    state: coalesce(incoming.state, existing?.state),
    budget_min: coalesce(incoming.budget_min, existing?.budget_min),
    budget_max: coalesce(incoming.budget_max, existing?.budget_max),
    bedrooms: coalesce(incoming.bedrooms, existing?.bedrooms),
    bathrooms: coalesce(incoming.bathrooms, existing?.bathrooms),
    timeline: coalesce(incoming.timeline, existing?.timeline),
    financing_status: coalesce(incoming.financing_status, existing?.financing_status),
    notes: coalesce(incoming.notes, existing?.notes),
    last_summary: coalesce(incoming.last_summary, existing?.last_summary),
  };

  const { error } = await supabase.from("lead_profiles").upsert(merged, {
    onConflict: "phone",
  });

  if (error) {
    throw new Error(`lead profile upsert failed: ${error.message}`);
  }
}
