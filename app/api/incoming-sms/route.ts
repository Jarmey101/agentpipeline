import { runEstherBrain } from "../../../lib/ai/esther-brain";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
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

    const { data: history, error: historyError } = await supabase
      .from("conversations")
      .select("role, message, created_at")
      .eq("phone", phone)
      .order("created_at", { ascending: true })
      .limit(30);

    if (historyError) {
      throw historyError;
    }

    const transcript = (history || [])
      .map((m) => `${m.role}: ${String(m.message)}`)
      .join("\n");

    let reply = await runEstherBrain(transcript, incomingMessage);

    reply = normalizeText(reply || "");

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
  } catch (error: any) {
    console.error("incoming-sms error:", error);

    return new NextResponse(
      `<Response><Message>${xmlEscape(
        "Sorry, I’m having a temporary issue right now. Please send your city or budget and I’ll keep going."
      )}</Message></Response>`,
      {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      }
    );
  }
}
