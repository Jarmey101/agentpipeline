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
  return text.trim().replace(/\s+/g, " ");
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
      .limit(30);

    const transcript = (history || [])
      .map((m) => `${m.role}: ${m.message}`)
      .join("\n");

    let reply = await runEstherBrain(transcript, incomingMessage);

    const lower = incomingMessage.toLowerCase();

    // RESET HANDLING
    if (
      lower.includes("start over") ||
      lower.includes("reset") ||
      lower.includes("who are you")
    ) {
      reply =
        "Hi, I'm Esther with Marie Arne Realty. I help with buying, selling, and scheduling. What are you looking to do?";
    }

    // FAILSAFE (NO EMPTY / NO LOOP)
    if (!reply || reply.trim().length < 2) {
      reply =
        "Hi, I'm Esther with Marie Arne Realty. How can I help you today?";
    }

    reply = clean(reply);

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
      `<Response><Message>Hi, this is Esther. What are you looking for?</Message></Response>`,
      { status: 200, headers: { "Content-Type": "text/xml" } }
    );
  }
}
