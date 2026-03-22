import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

type ConversationMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type LeadProfileExtraction = {
  full_name: string | null;
  email: string | null;
  phone: string | null;
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
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function normalizePartialProfile(
  extracted: Partial<LeadProfileExtraction>,
  phone: string
): LeadProfileExtraction {
  return {
    full_name: extracted.full_name ?? null,
    email: extracted.email ?? null,
    phone,
    intent: extracted.intent ?? null,
    city: extracted.city ?? null,
    state: extracted.state ?? null,
    budget_min:
      typeof extracted.budget_min === "number" ? extracted.budget_min : null,
    budget_max:
      typeof extracted.budget_max === "number" ? extracted.budget_max : null,
    bedrooms:
      typeof extracted.bedrooms === "number" ? extracted.bedrooms : null,
    bathrooms:
      typeof extracted.bathrooms === "number" ? extracted.bathrooms : null,
    timeline: extracted.timeline ?? null,
    financing_status: extracted.financing_status ?? null,
    notes: extracted.notes ?? null,
    last_summary: extracted.last_summary ?? null,
  };
}

export async function extractAndUpsertLeadProfile(params: {
  phone: string;
  conversation: ConversationMessage[];
}) {
  const { phone, conversation } = params;

  const recentConversation = conversation.slice(-20);

  const systemPrompt = `
You extract structured real-estate lead facts from a natural SMS conversation.

Rules:
- Return JSON only.
- Use null when unknown.
- Do not guess.
- Preserve ambiguity unless the lead clearly stated a fact.
- intent must be one of: buyer, seller, renter, investor, other, or null.
- budget_min and budget_max must be numbers or null.
- bedrooms and bathrooms must be numbers or null.
- notes should contain only short operational facts worth saving.
- last_summary should be a short CRM summary of the lead's current status.

Return exactly this shape:
{
  "full_name": string|null,
  "email": string|null,
  "phone": string|null,
  "intent": "buyer"|"seller"|"renter"|"investor"|"other"|null,
  "city": string|null,
  "state": string|null,
  "budget_min": number|null,
  "budget_max": number|null,
  "bedrooms": number|null,
  "bathrooms": number|null,
  "timeline": string|null,
  "financing_status": string|null,
  "notes": string|null,
  "last_summary": string|null
}
`.trim();

  const input = [
    {
      role: "system" as const,
      content: systemPrompt,
    },
    ...recentConversation,
    {
      role: "system" as const,
      content: `Known phone number for this lead: ${phone}`,
    },
  ];

  const response = await openai.responses.create({
    model: "gpt-5",
    input,
    text: {
      format: {
        type: "json_schema",
        name: "lead_profile_extraction",
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            full_name: { type: ["string", "null"] },
            email: { type: ["string", "null"] },
            phone: { type: ["string", "null"] },
            intent: {
              type: ["string", "null"],
              enum: ["buyer", "seller", "renter", "investor", "other", null],
            },
            city: { type: ["string", "null"] },
            state: { type: ["string", "null"] },
            budget_min: { type: ["number", "null"] },
            budget_max: { type: ["number", "null"] },
            bedrooms: { type: ["number", "null"] },
            bathrooms: { type: ["number", "null"] },
            timeline: { type: ["string", "null"] },
            financing_status: { type: ["string", "null"] },
            notes: { type: ["string", "null"] },
            last_summary: { type: ["string", "null"] },
          },
          required: [
            "full_name",
            "email",
            "phone",
            "intent",
            "city",
            "state",
            "budget_min",
            "budget_max",
            "bedrooms",
            "bathrooms",
            "timeline",
            "financing_status",
            "notes",
            "last_summary",
          ],
        },
      },
    },
  });

  const raw = response.output_text;
  const extracted = JSON.parse(raw) as Partial<LeadProfileExtraction>;
  const normalized = normalizePartialProfile(extracted, phone);

  const { error } = await supabase
    .from("lead_profiles")
    .upsert(normalized, { onConflict: "phone" });

  if (error) {
    throw new Error(`lead_profiles upsert failed: ${error.message}`);
  }

  return normalized;
}