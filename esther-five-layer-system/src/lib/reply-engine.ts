import { getOpenAI } from "@/lib/openai";
import { buildReplyContext } from "@/lib/reply-context";

export async function generateReply(phone: string): Promise<string> {
  const openai = getOpenAI();
  const context = await buildReplyContext(phone);

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: context.systemPrompt,
      },
      ...context.messages,
    ],
    temperature: 0.4,
  });

  return response.choices[0]?.message?.content?.trim() || "Hello. I received your message.";
}
