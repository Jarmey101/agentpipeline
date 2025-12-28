import { NextResponse } from "next/server";
import { z } from "zod";
import { optEnv } from "@/lib/env";

const Body = z.object({
  context: z.string().min(1).max(4000)
});

export async function POST(req: Request) {
  const key = optEnv("OPENAI_API_KEY");
  if (!key) return NextResponse.json({ error: "AI not configured" }, { status: 400 });

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  // Minimal stub response (no external API call here)
  return NextResponse.json({
    ok: true,
    suggestion: "Follow-up: Hi {FirstName}, checking inâ€”whatâ€™s the best time today to connect about your goals?"
  });
}
