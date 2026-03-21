import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

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

    console.log("Incoming:", { message, phone });

    // Fetch memory
    const { data: history, error: historyError } = await supabase
      .from("conversations")
      .select("*")
      .eq("phone", phone)
      .order("created_at", { ascending: true })
      .limit(10);

    if (historyError) {
      console.error("Supabase fetch error:", historyError);
    }

    const conversationHistory = (history || [])
      .map((c) => `User: ${c.message}\nAssistant: ${c.response}`)
      .join("\n");

    // OpenAI call
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
You are Esther, a professional real estate assistant.

Rules:
- Never repeat questions already answered
- Ask only one question at a time
- Be natural, confident, and human
- Move toward scheduling an appointment
`,
        },
        {
          role: "user",
          content: `
Conversation history:
${conversationHistory}

User said:
${message}
`,
        },
      ],
    });

    const reply = completion.choices?.[0]?.message?.content || "Sorry, something went wrong.";

    console.log("AI Reply:", reply);

    // Save memory (non-blocking safe)
    await supabase.from("conversations").insert({
      phone,
      message,
      response: reply,
      created_at: new Date().toISOString(),
    });

    return new NextResponse(
      `<Response><Message>${xmlEscape(reply)}</Message></Response>`,
      { status: 200, headers: { "Content-Type": "text/xml" } }
    );
  } catch (error) {
    console.error("FATAL ERROR:", error);

    return new NextResponse(
      `<Response><Message>System error. Please try again.</Message></Response>`,
      { status: 200, headers: { "Content-Type": "text/xml" } }
    );
  }
}