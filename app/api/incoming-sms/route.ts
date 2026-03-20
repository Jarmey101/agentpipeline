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

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const incomingMessage = normalizeText(String(formData.get("Body") || ""));
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
      .map((m) => `${m.role}: ${String(m.message)}`)
      .join("\n");

    let reply = await runEstherBrain(transcript, incomingMessage);

    // FIX LOOP + EMPTY RESPONSE
    const lowerMsg = incomingMessage.toLowerCase();

    if (
      lowerMsg.includes("start over") ||
      lowerMsg.includes("reset") ||
      lowerMsg.includes("who are you") ||
      lowerMsg.includes("your name")
    ) {
      reply =
        "Hi, I'm Esther, your assistant at Marie Arne Realty. I help with buying, selling, and scheduling appointments. How can I help you today?";
    }

    if (!reply || typeof reply !== "string" || reply.trim() === "") {
      reply =
        "Hi, this is Esther from Marie Arne Realty. How can I assist you today?";
    }

    reply = normalizeText(reply);

    await supabase.from("conversations").insert({
      phone,
      message: reply,
      role: "assistant",
    });

    return new NextResponse(
      `<Response><Message>${xmlEscape(reply)}</Message></Response>`,
      {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      }
    );
  } catch (error) {
    console.error("incoming-sms error:", error);

    return new NextResponse(
      `<Response><Message>${xmlEscape(
        "Hi, this is Esther. I'm here to help. What are you looking for?"
      )}</Message></Response>`,
      {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      }
    );
  }
}