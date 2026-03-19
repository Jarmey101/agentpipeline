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

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const message = (formData.get("Body") as string) || "";
    const phone = (formData.get("From") as string) || "unknown";

    // save user message
    await supabase.from("conversations").insert({
      phone,
      message,
      role: "user",
    });

    // get last 10 messages for this phone
    const { data: history } = await supabase
      .from("conversations")
      .select("role, message")
      .eq("phone", phone)
      .order("created_at", { ascending: true })
      .limit(10);

    const messages = [
      {
        role: "system",
        content: `
You are Esther, the AI operations assistant for Marie Arne Realty.

You behave like a real assistant, not a bot.

RULES:
- Never repeat questions already answered
- Track what the user has said
- Ask only what is missing
- One question at a time
- Move toward booking an appointment
- Be concise, human, and confident

GOAL:
Qualify the lead fully and move them to a scheduled call or showing.
`
      },
      ...(history || []),
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
    });

    const reply = completion.choices[0].message.content || "";

    // save assistant reply
    await supabase.from("conversations").insert({
      phone,
      message: reply,
      role: "assistant",
    });

    return new NextResponse(
      `<Response><Message>${reply}</Message></Response>`,
      {
        headers: { "Content-Type": "text/xml" },
      }
    );
  } catch (error: any) {
    console.error(error);

    return new NextResponse(
      `<Response><Message>Sorry, I’m having trouble right now. Please try again shortly.</Message></Response>`,
      {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      }
    );
  }
}
