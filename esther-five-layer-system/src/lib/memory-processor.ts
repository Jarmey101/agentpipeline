import { getOpenAI } from "@/lib/openai";
import { getRecentMessages } from "@/lib/messages";
import { mergeLeadProfile } from "@/lib/lead-profiles";
import { upsertConversationSummary } from "@/lib/summary-memory";
import type { LeadProfileRow } from "@/lib/types";

function safeJsonParse<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function processSummaryUpdate(phone: string) {
  const openai = getOpenAI();
  const messages = await getRecentMessages(phone, 12);
  const transcript = messages
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n");

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "Summarize the active conversation for future continuity in under 120 words. Focus on stable facts, current intent, and the latest active thread. Output plain text only.",
      },
      {
        role: "user",
        content: transcript,
      },
    ],
    temperature: 0.2,
  });

  const summary = response.choices[0]?.message?.content?.trim() || "";
  if (summary) {
    await upsertConversationSummary(phone, summary);
  }
}

export async function processCrmExtraction(phone: string) {
  const openai = getOpenAI();
  const messages = await getRecentMessages(phone, 15);
  const transcript = messages
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n");

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Extract structured real-estate lead data from this SMS conversation. Return JSON only. Use null for unknown values. Do not guess. Valid intent: buyer, seller, renter, investor, other, or null. Include keys: full_name, email, intent, city, state, budget_min, budget_max, bedrooms, bathrooms, timeline, financing_status, notes, last_summary.",
      },
      {
        role: "user",
        content: transcript,
      },
    ],
    temperature: 0.1,
  });

  const raw = response.choices[0]?.message?.content?.trim() || "{}";
  const parsed = safeJsonParse<Partial<LeadProfileRow>>(raw, {});
  await mergeLeadProfile(phone, parsed);
}
