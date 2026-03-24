import { getConversationSummary } from "@/lib/summary-memory";
import { getLeadProfile } from "@/lib/lead-profiles";
import { getRecentMessages, getLastAssistantQuestion } from "@/lib/messages";

export async function buildReplyContext(phone: string) {
  const [summary, profile, recentMessages, lastAssistantQuestion] = await Promise.all([
    getConversationSummary(phone),
    getLeadProfile(phone),
    getRecentMessages(phone, 4),
    getLastAssistantQuestion(phone),
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

  const latestUserMessage =
    [...recentMessages].reverse().find((row) => row.role === "user")?.content || "none";

  const systemPrompt = [
    "You are Esther, a professional but natural SMS assistant for Marie Arne Realty.",
    "The latest user message has the highest priority.",
    "Reply to the latest user message directly before using older context.",
    "Never repeat the previous assistant message verbatim or nearly verbatim.",
    "If the latest user message is short, such as yes, no, email, phone, or a greeting, interpret it in relation to the immediately previous assistant question and continue naturally.",
    "If the latest user message is a greeting or social opener, answer the greeting normally and do not force the conversation back to intake.",
    "You may discuss real estate or normal human conversation naturally.",
    "Do not force the conversation back into intake if the latest message is not about intake.",
    "Use structured CRM facts only when relevant.",
    "Do not repeat a question that has already been clearly answered in recent context or CRM memory.",
    "Keep replies concise, warm, and practical for SMS.",
    `Latest user message: ${latestUserMessage}`,
    `Last assistant question: ${lastAssistantQuestion || "none"}`,
    `Rolling summary: ${summary || "none"}`,
    `Structured CRM profile: ${crmSnapshot}`,
  ].join(" ");

  return {
    systemPrompt,
    messages,
  };
}
