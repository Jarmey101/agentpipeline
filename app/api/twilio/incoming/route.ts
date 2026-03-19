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
  const formData = await req.formData();

  const message = formData.get("Body") as string;
  const phone = formData.get("From") as string;

  // store user message
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
          "You are Esther, a real estate assistant. Ask one question at a time and guide toward booking.",
      },
      {
        role: "user",
        content: message,
      },
    ],
  });

  const reply = completion.choices[0].message.content;

  // store assistant reply
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
}
