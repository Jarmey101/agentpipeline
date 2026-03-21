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
  const formData = await req.formData();
  const message = String(formData.get("Body") || "");
  const phone = String(formData.get("From") || "");

  // GET MEMORY
  const { data: history } = await supabase
    .from("conversations")
    .select("*")
    .eq("phone", phone)
    .order("created_at", { ascending: true })
    .limit(10);

  const conversationHistory = (history || [])
    .map((c) => `User: ${c.message}\nAssistant: ${c.response}`)
    .join("\n");

  // OPENAI AGENT
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `
You are Esther, a professional real estate assistant for Marie Arne Realty.

Rules:
- Never repeat questions
- Ask one question at a time
- Be natural and human
- Guide toward booking an appointment
- Remember what the user already said

If info is missing → ask
If info is complete → move to scheduling
`,
      },
      {
        role: "user",
        content: `
Conversation history:
${conversationHistory}

User just said:
${message}
`,
      },
    ],
  });

  const reply = completion.choices[0].message.content || "";

  // SAVE MEMORY
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
}