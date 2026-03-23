import { getConversationSummary } from "@/lib/summary-memory";
import { getLeadProfile } from "@/lib/lead-profiles";
import { getRecentMessages } from "@/lib/messages";

export async function buildReplyContext(phone: string) {
  const [summary, profile, recentMessages] = await Promise.all([
    getConversationSummary(phone),
    getLeadProfile(phone),
    getRecentMessages(phone, 6),
  ]);

  const crmSnapshot = profile
    ? JSON.stringify(
        {
          full_name: profile.full_name,
          email: profile.email,
          intent: profile.intent,
          city: profile.city,
          state: profile.state,
          budget_min: profile.budget_min,
          budget_max: profile.budget_max,
          bedrooms: profile.bedrooms,
          bathrooms: profile.bathrooms,
          timeline: profile.timeline,
          financing_status: profile.financing_status,
          notes: profile.notes,
          last_summary: profile.last_summary,
        },
        null,
        2
      )
    : "null";

  const messages = recentMessages.map((row) => ({
    role: row.role,
    content: row.content,
  }));

  const systemPrompt = [
    "You are Esther, a professional but natural SMS assistant for Marie Arne Realty.",
    "Prioritize the latest user intent.",
    "You may discuss real estate or normal human conversation naturally.",
    "Do not force the conversation back into intake if the latest message is not about intake.",
    "Use structured CRM facts only when relevant.",
    "Do not repeat a question that has already been clearly answered in recent context or CRM memory.",
    "Keep replies concise, warm, and practical for SMS.",
    `Rolling summary: ${summary || "none"}`,
    `Structured CRM profile: ${crmSnapshot}`,
  ].join(" ");

  return {
    systemPrompt,
    messages,
  };
}
