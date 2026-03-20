import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function extractLeadData(message: string) {
  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    messages: [
      {
        role: "system",
        content: `
Extract real estate lead data from message.

Return ONLY JSON:

{
  "intent": "buyer | seller | renter | null",
  "city": string | null,
  "budget": string | null
}
        `,
      },
      { role: "user", content: message },
    ],
  });

  try {
    return JSON.parse(res.choices[0].message.content || "{}");
  } catch {
    return {};
  }
}

export async function generateReply(instruction: string) {
  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.7,
    messages: [
      {
        role: "system",
        content: `
You are Esther, a professional real estate assistant.
Speak naturally, short, confident.
Do not repeat questions.
        `,
      },
      { role: "user", content: instruction },
    ],
  });

  return res.choices[0].message.content || "";
}
