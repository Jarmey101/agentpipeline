import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { runEstherBrain } from "../../../src/lib/ai/runEstherBrain";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function xmlEscape(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function extractEntities(msg: string) {
  const m = msg.toLowerCase();

  return {
    intent: m.includes("buy") ? "buyer" :
            m.includes("sell") ? "seller" :
            m.includes("rent") ? "renter" : null,

    city: m.match(/fort worth|dallas|houston|austin/)?.[0] || null,

    budget: m.match(/\$?\d+[k]?/)?.[0] || null,
  };
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const incomingMessage = String(formData.get("Body") || "");
    const phone = String(formData.get("From") || "unknown");

    const { data: existing } = await supabase
      .from("leads")
      .select("*")
      .eq("phone", phone)
      .single();

    const extracted = extractEntities(incomingMessage);

    const lead = {
      phone,
      intent: extracted.intent || existing?.intent || null,
      city: extracted.city || existing?.city || null,
      budget: extracted.budget || existing?.budget || null,
      stage: existing?.stage || "start",
    };

    await supabase.from("leads").upsert(lead);

    let instruction = "";

    if (!lead.intent) {
      instruction = "Ask what they want to do (buy, sell, rent).";
    } else if (!lead.city) {
      instruction = "Ask which city they are interested in.";
    } else if (!lead.budget) {
      instruction = "Ask their budget.";
    } else {
      instruction = "Move toward scheduling.";
    }

    const reply = await runEstherBrain(
      JSON.stringify(lead) + "\nInstruction: " + instruction,
      incomingMessage
    );

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
