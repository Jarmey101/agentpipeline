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

function nextField(lead: any) {
  if (!lead.intent) return "intent";
  if (!lead.city) return "city";
  if (!lead.budget) return "budget";
  return "done";
}

// VALIDATION LAYER
function didAnswer(field: string, extracted: any) {
  if (field === "intent") return !!extracted.intent;
  if (field === "city") return !!extracted.city;
  if (field === "budget") return !!extracted.budget;
  return false;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const message = String(formData.get("Body") || "");
    const phone = String(formData.get("From") || "");

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
      current_field: existing?.current_field || "intent",
    };

    const field = nextField(lead);

    let instruction = "";

    if (didAnswer(field, extracted)) {
      // MOVE FORWARD
      if (field === "intent") instruction = "Ask which city they are interested in.";
      else if (field === "city") instruction = "Ask their budget.";
      else if (field === "budget") instruction = "Move toward scheduling.";
      else instruction = "Move toward scheduling.";
    } else {
      // DO NOT REPEAT — REFRAME
      if (field === "intent")
        instruction = "Ask what they want to do in a different natural way.";
      else if (field === "city")
        instruction = "Ask location in a different way without repeating.";
      else if (field === "budget")
        instruction = "Ask budget differently without repeating.";
    }

    await supabase.from("leads").upsert({
      ...lead,
      current_field: field,
    });

    const reply = await generateReply(instruction);

    return new NextResponse(
      `<Response><Message>${xmlEscape(reply)}</Message></Response>`,
      { status: 200, headers: { "Content-Type": "text/xml" } }
    );
  } catch {
    return new NextResponse(
      `<Response><Message>What are you looking to do?</Message></Response>`,
      { status: 200, headers: { "Content-Type": "text/xml" } }
    );
  }
}
