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

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const message = String(formData.get("Body") || "");
    const phone = String(formData.get("From") || "");

    const extracted = await extractLeadData(message);

    const { data: existing } = await supabase
      .from("leads")
      .select("*")
      .eq("phone", phone)
      .single();

    const lead = {
      phone,
      intent: extracted.intent || existing?.intent || null,
      city: extracted.city || existing?.city || null,
      budget: extracted.budget || existing?.budget || null,
    };

    await supabase.from("leads").upsert(lead);

    // STRICT FLOW ENGINE
    let instruction = "";

    if (!lead.intent) {
      instruction = "Ask what they want to do: buy, sell, or rent.";
    } else if (!lead.city) {
      instruction = "Ask which city they are interested in.";
    } else if (!lead.budget) {
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
  } catch {
    return new NextResponse(
      `<Response><Message>What are you looking to do—buy, sell, or rent?</Message></Response>`,
      { status: 200, headers: { "Content-Type": "text/xml" } }
    );
  }
}
