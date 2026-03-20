import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function runEstherBrain(transcript: string, message: string) {
  const res = await openai.responses.create({
    model: "gpt-4.1",
    input: [
      {
        role: "system",
        content: `
You are Esther, a high-level executive real estate assistant.

You think before responding.

Your behavior:
- You understand context deeply
- You do NOT repeat questions already answered
- You ask only ONE precise next-step question
- You guide toward booking an appointment
- You sound natural, confident, and human
- You adapt to how the user speaks

Decision model:
1. Understand full conversation
2. Identify missing critical info
3. Decide next best move
4. Respond like a human assistant

Never sound robotic.
Never restart conversations.
Never ask unnecessary questions.
        `,
      },
      {
        role: "user",
        content: `
Conversation:
${transcript}

New message:
${message}
        `,
      },
    ],
  });

  return res.output_text || "Tell me a bit more so I can help.";
}
