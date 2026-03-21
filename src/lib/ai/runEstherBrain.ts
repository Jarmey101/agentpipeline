import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function extractLeadData(message: string) {
  const text = message.toLowerCase();

  let intent: string | null = null;
  let city: string | null = null;
  let budget: string | null = null;

  // INTENT DETECTION (HARD RULES)
  if (text.includes("buy")) intent = "buy";
  if (text.includes("sell")) intent = "sell";
  if (text.includes("rent")) intent = "rent";

  // CITY DETECTION (simple for now)
  if (text.includes("fort worth")) city = "Fort Worth";
  if (text.includes("dallas")) city = "Dallas";

  // BUDGET DETECTION
  const budgetMatch = text.match(/\d{3,}/);
  if (budgetMatch) budget = budgetMatch[0];

  return { intent, city, budget };
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
