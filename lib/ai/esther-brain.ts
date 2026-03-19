import OpenAI from "openai";
import { tools } from "./tools";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function runEstherBrain(transcript: string, message: string) {
  const res = await openai.responses.create({
    model: "gpt-4.1",
    tools: tools as any,
    input: [
      {
        role: "system",
        content: `
You are Esther, a real estate executive assistant.

You can take actions.

When appropriate:
- book appointments
- notify Marie

If user is ready → call book_appointment
If lead is qualified → call notify_marie

Otherwise:
- continue conversation naturally
        `,
      },
      {
        role: "user",
        content: `
${transcript}

New message:
${message}
        `,
      },
    ],
  });

  // Handle tool calls (basic)
  if (res.output[0]?.type === "function_call") {
    const tool = res.output[0];

    if (tool.function.name === "book_appointment") {
      return "Perfect, I’ve got that scheduled. Marie will follow up shortly.";
    }

    if (tool.function.name === "notify_marie") {
      return "Got it. I’ve shared your details with Marie. She’ll reach out shortly.";
    }
  }

  return res.output_text || "Tell me a bit more.";
}
