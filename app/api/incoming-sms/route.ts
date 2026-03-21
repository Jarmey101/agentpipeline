import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { extractLeadData, generateReply } from "../../../src/lib/ai/runEstherBrain";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function xmlEscape(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function POST(req: Request) {
  const formData = await req.formData();
  const message = String(formData.get("Body") || "");
  const phone = String(formData.get("From") || "");

  // GET EXISTING LEAD (SAFE)
  const { data: existing } = await supabase
    .from("leads")
    .select("*")
    .eq("phone", phone)
    .maybeSingle();

  const extracted = await extractLeadData(message);

  let lead = {
    phone,
    intent: existing?.intent || null,
    city: existing?.city || null,
    budget: existing?.budget || null,
    stage: existing?.stage || "intent",
  };

  // STATE MACHINE (FIXED — NO LOOPING)
if (!lead.intent && extracted.intent) {
  lead.intent = extracted.intent;
  lead.stage = "city";
}

if (!lead.city && extracted.city) {
  lead.city = extracted.city;
  lead.stage = "budget";
}

if (!lead.budget && extracted.budget) {
  lead.budget = extracted.budget;
  lead.stage = "complete";
}

  await supabase.from("leads").upsert(lead);

  // RESPONSE LOGIC
  let instruction = "";

  if (!lead.intent) {
  instruction = "Ask what they want to do: buy, sell, or rent.";
} else if (!lead.city) {
  instruction = "Ask which city they are interested in.";
} else if (!lead.budget) {
  instruction = "Ask their budget range.";
} else {
  instruction = `
User already provided:
- Intent: ${lead.intent}
- City: ${lead.city}
- Budget: ${lead.budget}

Do NOT ask any more qualifying questions.

Your job:
- Acknowledge the info
- Move forward to scheduling
- Offer to set an appointment
- Sound like a professional real estate assistant
`;
}

  const reply = await generateReply(`
You are a professional real estate assistant.

Conversation so far:
- Intent: ${lead.intent || "unknown"}
- City: ${lead.city || "unknown"}
- Budget: ${lead.budget || "unknown"}

User just said: "${message}"

Your job:
- DO NOT repeat questions already answered
- Ask ONLY for missing information
- Be natural, human, and helpful
- If all info is collected, move toward scheduling

Instruction: ${instruction}
`);

  // ✅ MEMORY WRITE (NEW)
  await supabase.from("conversations").insert({
    phone: phone,
    message: message,
    response: reply,
    created_at: new Date().toISOString(),
  });

  return new NextResponse(
    `<Response><Message>${xmlEscape(reply)}</Message></Response>`,
    { status: 200, headers: { "Content-Type": "text/xml" } }
  );
}