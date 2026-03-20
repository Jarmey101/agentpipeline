import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { extractLeadData, generateReply } from "../../../src/lib/ai/runEstherBrain";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function xmlEscape(str: string) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function POST(req: Request) {
  const formData = await req.formData();
  const message = String(formData.get("Body") || "");
  const phone = String(formData.get("From") || "");

  const { data: existing } = await supabase
    .from("leads")
    .select("*")
    .eq("phone", phone)
    .single();

  const extracted = await extractLeadData(message);

  let lead = {
    phone,
    intent: existing?.intent || null,
    city: existing?.city || null,
    budget: existing?.budget || null,
    stage: existing?.stage || "intent",
  };

  // UPDATE STATE ONLY IF VALID
  if (lead.stage === "intent" && extracted.intent) {
    lead.intent = extracted.intent;
    lead.stage = "city";
  } else if (lead.stage === "city" && extracted.city) {
    lead.city = extracted.city;
    lead.stage = "budget";
  } else if (lead.stage === "budget" && extracted.budget) {
    lead.budget = extracted.budget;
    lead.stage = "complete";
  }

  await supabase.from("leads").upsert(lead);

  // HARD STAGE RESPONSE (NO AI DECISION)
  let instruction = "";

  if (lead.stage === "intent") {
    instruction = "Ask what they want to do: buy, sell, or rent.";
  } else if (lead.stage === "city") {
    instruction = "Ask which city they are interested in.";
  } else if (lead.stage === "budget") {
    instruction = "Ask their budget range.";
  } else {
    instruction =
      "Acknowledge their info and move toward scheduling an appointment.";
  }

  const reply = await generateReply(instruction);

  return new NextResponse(
    `<Response><Message>${xmlEscape(reply)}</Message></Response>`,
    { status: 200, headers: { "Content-Type": "text/xml" } }
  );
}
