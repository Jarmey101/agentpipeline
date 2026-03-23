import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { MemoryJobType } from "@/lib/types";

export async function enqueueMemoryJob(params: {
  phone: string;
  job_type: MemoryJobType;
  payload?: Record<string, unknown>;
}) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("memory_jobs").insert({
    phone: params.phone,
    job_type: params.job_type,
    payload: params.payload || {},
    status: "pending",
  });

  if (error) {
    throw new Error(`memory job enqueue failed: ${error.message}`);
  }
}

export async function claimPendingJobs(limit = 10) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("memory_jobs")
    .select("id, phone, job_type, payload")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`memory jobs fetch failed: ${error.message}`);
  }

  return data || [];
}

export async function markJobStatus(
  id: string,
  status: "processing" | "done" | "failed",
  error_message?: string | null
) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("memory_jobs")
    .update({ status, error_message: error_message || null })
    .eq("id", id);

  if (error) {
    throw new Error(`memory job status update failed: ${error.message}`);
  }
}
