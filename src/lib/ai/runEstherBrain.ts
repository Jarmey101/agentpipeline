import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function runEstherBrain(
  transcript: string,
  incomingMessage: string
): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: `
You are Esther, a professional real estate assistant for Marie Arne Realty.

RULES:
- Speak like a real human assistant
- Never say you have an error
- Never repeat the same message
- Guide the conversation naturally
- If user is vague, ask smart follow-up questions
- If user wants to restart, reintroduce yourself
- Keep responses short, helpful, and confident

GOALS:
- Help buy, sell, rent
- Capture key info (city, budget, timeline)
- Move conversation toward scheduling appointments
          `,
        },
        {
          role: "user",
          content: transcript + "\\nUser: " + incomingMessage,
        },
      ],
    });

    return completion.choices[0]?.message?.content || "";
  } catch {
    return "";
  }
}
