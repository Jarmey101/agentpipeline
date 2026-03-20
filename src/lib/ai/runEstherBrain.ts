import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

function detectIntent(msg: string) {
  const m = msg.toLowerCase();

  if (m.includes("buy")) return "buyer";
  if (m.includes("sell")) return "seller";
  if (m.includes("rent")) return "renter";

  return "unknown";
}

function hasInfo(text: string, keyword: string) {
  return text.toLowerCase().includes(keyword);
}

export async function runEstherBrain(
  transcript: string,
  incomingMessage: string
): Promise<string> {
  try {
    const intent = detectIntent(transcript + incomingMessage);

    const alreadyAskedCity = hasInfo(transcript, "city");
    const alreadyAskedBudget = hasInfo(transcript, "budget");

    const systemPrompt = `
You are Esther, a real estate assistant.

STRICT RULES:
- NEVER repeat a question already asked
- NEVER loop
- If user is vague → ask ONE specific next question only
- If user gave info → move forward, do NOT ask again
- Speak naturally like a human assistant
- Keep replies short

FLOW:
- Identify intent (buy, sell, rent)
- Ask only missing info
- Move toward scheduling

KNOWN STATE:
City asked: ${alreadyAskedCity}
Budget asked: ${alreadyAskedBudget}
Intent: ${intent}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.6,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: transcript + "\nUser: " + incomingMessage,
        },
      ],
    });

    return completion.choices[0]?.message?.content || "";
  } catch {
    return "";
  }
}
