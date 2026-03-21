import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const body = await req.text();
  const params = new URLSearchParams(body);

  const message = params.get("Body") || "";
  const phone = params.get("From") || "unknown";

  // 1. Save user message
  await supabase.from("messages").insert({
    phone,
    role: "user",
    content: message,
  });

  // 2. Get conversation history
  const { data: history } = await supabase
    .from("messages")
    .select("role, content")
    .eq("phone", phone)
    .order("created_at", { ascending: true })
    .limit(20);

  // 3. Send to OpenAI
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are Esther, a professional real estate assistant. You hold natural conversations, remember context, and help clients smoothly.",
      },
      ...(history || []),
    ],
  });

  const reply = response.choices[0].message.content || "OK";

  // 4. Save AI response
  await supabase.from("messages").insert({
    phone,
    role: "assistant",
    content: reply,
  });

  console.log("User:", message);
  console.log("AI:", reply);

  return new NextResponse(reply);
}

export async function GET() {
  return new NextResponse("Method Not Allowed", { status: 405 });
}