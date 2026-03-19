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
      .limit(15);

    const formattedHistory =
      history?.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: String(m.message),
      })) || [];

    const messages: any = [
      {
        role: "system",
        content: `
You are Esther, a high-level real estate assistant.

You TRACK and UNDERSTAND conversation state.

CURRENT TASK:
Extract what the user has already provided.

KNOWN DATA RULES:
- If user already gave location → NEVER ask location again
- If user already gave budget → NEVER ask budget again
- If user says "not sure" → move forward, do NOT repeat question

FLOW:
1. Identify missing fields:
   - location
   - budget
   - timeline
   - property type
2. Ask ONLY the next missing item
3. Move toward scheduling

CRITICAL:
- Never repeat a question
- Never rephrase the same question
- Do not loop
- Always progress

Be sharp. Be efficient. Act like a human assistant.
`,
      },
      ...formattedHistory,
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages,
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
