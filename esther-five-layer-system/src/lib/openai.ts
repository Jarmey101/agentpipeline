import OpenAI from "openai";
import { env } from "@/lib/env";

export function getOpenAI() {
  return new OpenAI({ apiKey: env.openAiKey() });
}
