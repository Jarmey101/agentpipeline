import { serialize, parse } from "cookie";
import crypto from "crypto";
import { mustEnv } from "./env";

const COOKIE_NAME = "ap_admin";
const SIG_NAME = "ap_admin_sig";

function sign(value: string) {
  const secret = mustEnv("APP_COOKIE_SECRET");
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

export function setAdminCookies() {
  const value = "1";
  const sig = sign(value);
  const c1 = serialize(COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 60 * 60 * 24 * 14
  });
  const c2 = serialize(SIG_NAME, sig, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 60 * 60 * 24 * 14
  });
  return [c1, c2];
}

export function clearAdminCookies() {
  const c1 = serialize(COOKIE_NAME, "", { path: "/", maxAge: 0 });
  const c2 = serialize(SIG_NAME, "", { path: "/", maxAge: 0 });
  return [c1, c2];
}

export function isAdminFromCookie(cookieHeader?: string | null) {
  if (!cookieHeader) return false;
  const cookies = parse(cookieHeader);
  const value = cookies[COOKIE_NAME];
  const sig = cookies[SIG_NAME];
  if (!value || !sig) return false;
  return sign(value) === sig && value === "1";
}
