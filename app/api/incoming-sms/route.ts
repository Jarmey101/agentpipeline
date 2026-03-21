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

  // GET EXISTING LEAD
  const { data: existing } = await supabase
    .from("leads")
    .select("*")
    .eq("phone", phone)
    .maybeSingle();

  // EXTRACT DATA (HARD RULES FUNCTION YOU ADDED)
  const extracted = await extractLeadData(message);

  // MERGE DATA (NO STAGE SYSTEM)
  let lead = {
    phone,
    intent: existing?.intent || null,
    city: existing?.city || null,
    budget: existing?.budget || null,
  };

  if (!lead.intent && extracted.intent) lead.intent = extracted.intent;
  if (!lead.city && extracted.city) lead.city = extracted.city;
  if (!lead.budget && extracted.budget) lead.budget = extracted.budget;

  await supabase.from("leads").upsert(lead);

  // DETERMINE WHAT IS MISSING
  let missing: string[] = [];

  if (!lead.intent) missing.push("intent");
  if (!lead.city) missing.push("city");
  if (!lead.budget) missing.push("budget");

  // DECISION ENGINE (NO LOOP POSSIBLE)
  let instruction = "";

  if (missing.length === 0) {
    instruction = `
User already provided:
- Intent: ${lead.intent}
- City: ${lead.city}
- Budget: ${lead.budget}

Do NOT ask any more questions.

Your job:
- Acknowledge
- Move to scheduling
- Offer an appointment
- Be professional and natural
`;
  } else {
    if (missing[0] === "intent") {
      instruction = "Ask what they want to do: buy, sell, or rent.";
    }

    if (missing[0] === "city") {
      instruction = "Ask which city they are interested in.";
    }

    if (missing[0] === "budget") {
      instruction = "Ask their budget range.";
    }
  }

  const reply = await generateReply(`
You are a professional real estate assistant.

Known info:
- Intent: ${lead.intent || "unknown"}
- City: ${lead.city || "unknown"}
- Budget: ${lead.budget || "unknown"}

User said: "${message}"

${instruction}
`);

  // MEMORY LOG
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