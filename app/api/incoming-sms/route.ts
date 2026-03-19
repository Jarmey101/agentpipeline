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

    await supabase.from("conversations").insert({
      phone,
      message,
      role: "user",
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are Esther, the AI operations and client management assistant for Marie Arne Realty. Your job is to qualify leads, help with scheduling, keep responses short, ask one question at a time, and move every conversation toward an appointment or clear next action.",
        },
        {
          role: "user",
          content: message,
        },
      ],
    });

    const reply = completion.choices[0].message.content || "Thanks for reaching out. How can I help you today?";

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
    console.error("incoming-sms error:", error);
    return new NextResponse(
      `<Response><Message>Sorry, I’m having trouble right now. Please try again shortly.</Message></Response>`,
      {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      }
    );
  }
}
