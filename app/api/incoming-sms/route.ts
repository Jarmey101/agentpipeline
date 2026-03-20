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

function clean(text: string) {
  return text.trim().toLowerCase();
}

// extract simple signals
function extractState(history: any[]) {
  const text = history.map(h => h.message.toLowerCase()).join(" ");

  return {
    hasIntent: /(buy|sell|rent)/.test(text),
    hasCity: /(houston|dallas|austin|miami|new york)/.test(text),
    hasBudget: /\$\d+|\d{3,}/.test(text),
  };
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const incomingMessage = clean(String(formData.get("Body") || ""));
    const phone = String(formData.get("From") || "unknown");

    await supabase.from("conversations").insert({
      phone,
      message: incomingMessage,
      role: "user",
    });

    const { data: history } = await supabase
      .from("conversations")
      .select("role, message, created_at")
      .eq("phone", phone)
      .order("created_at", { ascending: true })
      .limit(20);

    const state = extractState(history || []);

    let reply = "";

    // HARD FLOW CONTROL (NO LOOP POSSIBLE)

    if (!state.hasIntent) {
      reply = "Are you looking to buy, sell, or rent?";
    } else if (!state.hasCity) {
      reply = "Which city are you interested in?";
    } else if (!state.hasBudget) {
      reply = "What price range are you considering?";
    } else {
      // NOW AI CAN SPEAK (ONLY AFTER DATA COLLECTED)
      const transcript = (history || [])
        .map(m => `${m.role}: ${m.message}`)
        .join("\n");

      reply = await runEstherBrain(transcript, incomingMessage);

      if (!reply || reply.length < 2) {
        reply = "Got it. Let’s get you scheduled with an agent. What day works best for you?";
      }
    }

    await supabase.from("conversations").insert({
      phone,
      message: reply,
      role: "assistant",
    });

    return new NextResponse(
      `<Response><Message>${xmlEscape(reply)}</Message></Response>`,
      { status: 200, headers: { "Content-Type": "text/xml" } }
    );
  } catch {
    return new NextResponse(
      `<Response><Message>Are you looking to buy, sell, or rent?</Message></Response>`,
      { status: 200, headers: { "Content-Type": "text/xml" } }
    );
  }
}
