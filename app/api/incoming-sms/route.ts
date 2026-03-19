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

    const { data: history } = await supabase
      .from("conversations")
      .select("role, message")
      .eq("phone", phone)
      .order("created_at", { ascending: true })
      .limit(10);

    const formattedHistory =
      history?.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: String(m.message),
      })) || [];

    const messages: any = [
      {
        role: "system",
        content: `
You are Esther, the AI operations assistant for Marie Arne Realty.

RULES:
- Never repeat questions
- Track user answers
- Ask only what is missing
- One question at a time
- Move toward booking
- Be concise and human
`,
      },
      ...formattedHistory,
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages as any,
    });

    const reply = completion.choices[0].message.content || "";

    await supabase.from("conversations").insert({
      phone,
      message: reply,
      role: "assistant",
    });

    return new NextResponse(
      `<Response><Message>${reply}</Message></Response>`,
      { headers: { "Content-Type": "text/xml" } }
    );
  } catch (error: any) {
    console.error(error);

    return new NextResponse(
      `<Response><Message>System error. Try again.</Message></Response>`,
      { status: 200, headers: { "Content-Type": "text/xml" } }
    );
  }
}
