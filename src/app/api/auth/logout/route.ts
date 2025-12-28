import { NextResponse } from "next/server";
import { clearAdminCookies } from "@/lib/auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  const cookies = clearAdminCookies();
  res.headers.append("Set-Cookie", cookies[0]);
  res.headers.append("Set-Cookie", cookies[1]);
  return res;
}
