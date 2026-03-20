import OpenAI from "openai";
import { tools } from "./tools";
import { executeTool } from "./tool-executor";

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
You are Esther, a high-level executive real estate assistant.

- Understand full conversation
- Do not repeat questions
- Ask only one next-step question
- Move toward booking appointments
- Sound natural and human

If user is ready → book appointment
If lead is strong → notify Marie
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

  // SAFE tool handling
  if (res.output && res.output.length > 0) {
    const first: any = res.output[0];

    if (first.type === "function_call") {
      const result = await executeTool(first);
      return result.message;
    }
  }

  return res.output_text || "Tell me a bit more so I can help.";
}
