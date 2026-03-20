import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  extractLeadData,
  generateReply,
} from "../../../src/lib/ai/runEstherBrain";

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

function nextMissingField(lead: any) {
  if (!lead.intent) return "intent";
  if (!lead.city) return "city";
  if (!lead.budget) return "budget";
  return "done";
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const message = String(formData.get("Body") || "");
    const phone = String(formData.get("From") || "");

    // LOAD LEAD
    const { data: existing } = await supabase
      .from("leads")
      .select("*")
      .eq("phone", phone)
      .single();

    const extracted = await extractLeadData(message);

    const lead = {
      phone,
      intent: extracted.intent || existing?.intent || null,
      city: extracted.city || existing?.city || null,
      budget: extracted.budget || existing?.budget || null,
      last_question: existing?.last_question || null,
    };

    // DETERMINE NEXT STEP
    const nextField = nextMissingField(lead);

    let instruction = "";
    let questionKey = "";

    if (nextField === "intent") {
      questionKey = "intent";
      instruction = "Ask what they want to do: buy, sell, or rent.";
    } else if (nextField === "city") {
      questionKey = "city";
      instruction = "Ask which city they are interested in.";
    } else if (nextField === "budget") {
      questionKey = "budget";
      instruction = "Ask their budget range.";
    } else {
      questionKey = "done";
      instruction =
        "Acknowledge their details and move toward scheduling an appointment.";
    }

    // HARD LOOP BLOCK
    if (lead.last_question === questionKey) {
      instruction =
        "Acknowledge what they said and move forward without repeating the same question.";
    }

    // SAVE STATE
    await supabase.from("leads").upsert({
      ...lead,
      last_question: questionKey,
    });

    const reply = await generateReply(instruction);

    return new NextResponse(
      `<Response><Message>${xmlEscape(reply)}</Message></Response>`,
      { status: 200, headers: { "Content-Type": "text/xml" } }
    );
  } catch {
    return new NextResponse(
      `<Response><Message>What are you looking to do—buy, sell, or rent?</Message></Response>`,
      { status: 200, headers: { "Content-Type": "text/xml" } }
    );
  }
}
