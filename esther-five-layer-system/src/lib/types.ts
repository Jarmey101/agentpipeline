export type ChatRole = "system" | "user" | "assistant";

export type MessageRow = {
  id: string;
  phone: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export type ConversationSummaryRow = {
  phone: string;
  summary: string | null;
  updated_at: string;
};

export type LeadProfileRow = {
  phone: string;
  full_name: string | null;
  email: string | null;
  intent: "buyer" | "seller" | "renter" | "investor" | "other" | null;
  city: string | null;
  state: string | null;
  budget_min: number | null;
  budget_max: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  timeline: string | null;
  financing_status: string | null;
  notes: string | null;
  last_summary: string | null;
  updated_at?: string;
};

export type MemoryJobType = "summary_update" | "crm_extract";
