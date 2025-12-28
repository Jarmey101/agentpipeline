import { NextResponse } from "next/server";
import { z } from "zod";
import { setAdminCookies } from "@/lib/auth";
import { mustEnv } from "@/lib/env";

const Body = z.object({ password: z.string().min(1) });

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  if (parsed.data.password !== mustEnv("APP_ADMIN_PASSWORD")) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  const cookies = setAdminCookies();
  res.headers.append("Set-Cookie", cookies[0]);
  res.headers.append("Set-Cookie", cookies[1]);
  return res;
}
