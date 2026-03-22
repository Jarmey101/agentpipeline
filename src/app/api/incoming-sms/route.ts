import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getOpenAI() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
  });
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const params = new URLSearchParams(body);

    const message = params.get("Body") || "";
    const phone = params.get("From") || "unknown";

    const supabase = getSupabase();

    const insertUser = await supabase.from("messages").insert({
      phone,
      role: "user",
      content: message,
    });

    if (insertUser.error) {
      throw new Error(`Supabase insert user failed: ${insertUser.error.message}`);
    }

    const historyResult = await supabase
      .from("messages")
      .select("role, content")
      .eq("phone", phone)
      .order("created_at", { ascending: true })
      .limit(20);

    if (historyResult.error) {
      throw new Error(`Supabase history fetch failed: ${historyResult.error.message}`);
    }

    const openai = getOpenAI();

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are Esther, a professional real estate assistant for Marie Arne Realty. You speak naturally, stay organized, remember context, avoid repetitive questions, and help move conversations toward useful next steps.",
        },
        ...(historyResult.data || []),
      ],
    });

    const reply =
      response.choices[0]?.message?.content?.trim() ||
      "Hello. I received your message.";

    const insertAssistant = await supabase.from("messages").insert({
      phone,
      role: "assistant",
      content: reply,
    });

    if (insertAssistant.error) {
      throw new Error(
        `Supabase insert assistant failed: ${insertAssistant.error.message}`
      );
    }

    console.log("User:", message);
    console.log("AI:", reply);

    return new NextResponse(reply, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  } catch (error) {
    console.error("INCOMING_SMS_ERROR:", error);

    const message =
      error instanceof Error ? error.message : "Unknown server error";

    return new NextResponse(`Server error: ${message}`, {
      status: 500,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }
}

export async function GET() {
  return new NextResponse("Method Not Allowed", { status: 405 });
}