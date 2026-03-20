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

You think before responding.

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

  // Handle tool calls safely
  if (res.output && res.output[0] && res.output[0].type === "function_call") {
    const tool: any = res.output[0];
    const result = await executeTool(tool);

    return result.message;
  }

    if (tool.name === "notify_marie") {
      return "Got it. I’ve shared your details with Marie. She’ll reach out shortly.";
    }
  }

  return res.output_text || "Tell me a bit more so I can help.";
}
