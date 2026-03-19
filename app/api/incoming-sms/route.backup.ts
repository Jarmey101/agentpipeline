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

    const extractionPrompt = `
You are analyzing an SMS conversation for a real estate assistant.

Return ONLY valid JSON.
Do not include markdown.
Do not include explanations.

Extract the lead state from the full transcript below.

Rules:
- If the user already gave a city like "Fort Worth", locationKnown should be true.
- If the user says "not sure" about neighborhood, do NOT ask the same neighborhood question again.
- If the user gives a budget like "800k", budgetKnown should be true.
- If the latest user message is just "hi", "hello", "yes", or another short filler, do NOT reset the conversation.
- Keep prior known facts from earlier messages.
- intent should be one of: buy, sell, rent, unknown
- For missing values use null
- greetingOnly should be true only if the latest message is a greeting/filler with no new info

Return this exact JSON shape:
{
  "intent": "buy|sell|rent|unknown",
  "city": string | null,
  "neighborhood": string | null,
  "budget": string | null,
  "timeline": string | null,
  "propertyType": string | null,
  "financing": string | null,
  "name": string | null,
  "locationKnown": boolean,
  "budgetKnown": boolean,
  "timelineKnown": boolean,
  "propertyTypeKnown": boolean,
  "financingKnown": boolean,
  "greetingOnly": boolean,
  "summary": string
}

Transcript:
${transcript}
`;

    const extraction = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You extract structured state from SMS conversations. Return only JSON.",
        },
        {
          role: "user",
          content: extractionPrompt,
        },
      ],
      temperature: 0,
      response_format: { type: "json_object" } as any,
    } as any);

    const extractionText = extraction.choices[0]?.message?.content || "{}";
    const state = safeJsonParse(extractionText) || {
      intent: "unknown",
      city: null,
      neighborhood: null,
      budget: null,
      timeline: null,
      propertyType: null,
      financing: null,
      name: null,
      locationKnown: false,
      budgetKnown: false,
      timelineKnown: false,
      propertyTypeKnown: false,
      financingKnown: false,
      greetingOnly: false,
      summary: "",
    };

    const latest = incomingMessage.toLowerCase();

    let reply = "";

    if (state.greetingOnly && state.intent !== "unknown") {
      const pieces: string[] = [];
      if (state.intent === "buy") pieces.push("buying");
      if (state.intent === "sell") pieces.push("selling");
      if (state.intent === "rent") pieces.push("renting");

      const contextBits: string[] = [];
      if (state.city) contextBits.push(`in ${state.city}`);
      if (state.budget) contextBits.push(`around ${state.budget}`);

      const contextText =
        pieces.length || contextBits.length
          ? `I still have you ${pieces.join(" ")} ${contextBits.join(" ")}. `.replace(/\s+/g, " ")
          : "";

      if (state.intent === "buy") {
        if (!state.locationKnown) {
          reply = `${contextText}What city or area are you focusing on?`;
        } else if (!state.budgetKnown) {
          reply = `${contextText}What budget range would you like me to work with?`;
        } else if (!state.timelineKnown) {
          reply = `${contextText}What’s your timeline for buying?`;
        } else if (!state.propertyTypeKnown) {
          reply = `${contextText}What type of home are you looking for?`;
        } else if (!state.financingKnown) {
          reply = `${contextText}Will this be cash or will you be financing?`;
        } else {
          reply = `${contextText}You’ve given me a solid picture. The next step is a quick call with Marie to line up options. What day works better for you?`;
        }
      } else if (state.intent === "sell") {
        reply = `${contextText}What’s the property address or city?`;
      } else if (state.intent === "rent") {
        reply = `${contextText}What area are you hoping to rent in?`;
      }
    }

    if (!reply) {
      if (state.intent === "unknown") {
        reply =
          "Hi, this is Esther with Marie Arne Realty. Are you looking to buy, sell, or rent?";
      } else if (state.intent === "buy") {
        if (!state.locationKnown) {
          reply = "Great. What city or area are you looking in?";
        } else if (!state.budgetKnown) {
          reply = `Got it${state.city ? `, ${state.city}` : ""}. What budget range are you targeting?`;
        } else if (!state.timelineKnown) {
          reply = "What’s your timeline for buying?";
        } else if (!state.propertyTypeKnown) {
          reply =
            "What type of property are you looking for—single-family, condo, townhouse, or something else?";
        } else if (!state.financingKnown) {
          reply = "Will you be financing the purchase or paying cash?";
        } else {
          const summaryParts = [
            state.city ? `buying in ${state.city}` : null,
            state.budget ? `budget around ${state.budget}` : null,
            state.timeline ? `timeline ${state.timeline}` : null,
            state.propertyType ? `property type ${state.propertyType}` : null,
          ].filter(Boolean);

          const summaryText = summaryParts.length
            ? `I have you ${summaryParts.join(", ")}. `
            : "";

          reply = `${summaryText}The next best step is a quick call with Marie so she can narrow options and plan showings. What day works best for you?`;
        }
      } else if (state.intent === "sell") {
        if (!state.locationKnown) {
          reply = "What city is the property in?";
        } else if (!state.timelineKnown) {
          reply = "What’s your timeline for selling?";
        } else {
          reply =
            "Perfect. The next step is a quick call with Marie to go over pricing and strategy. What day works best for you?";
        }
      } else if (state.intent === "rent") {
        if (!state.locationKnown) {
          reply = "What area are you hoping to rent in?";
        } else if (!state.budgetKnown) {
          reply = "What monthly budget are you targeting?";
        } else if (!state.timelineKnown) {
          reply = "When are you planning to move?";
        } else {
          reply =
            "Perfect. The next step is a quick call so Marie can narrow options for you. What day works best?";
        }
      }
    }

    reply = normalizeText(reply);

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
