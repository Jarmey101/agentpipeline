import fs from "node:fs";
import path from "node:path";

const envPath = path.join(process.cwd(), ".env.local");

const required = [
  "OPENAI_API_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_PHONE_NUMBER",
  "INTERNAL_JOB_SECRET"
];

if (!fs.existsSync(envPath)) {
  console.error("Missing .env.local");
  process.exit(1);
}

const raw = fs.readFileSync(envPath, "utf8");

const map = Object.fromEntries(
  raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const i = line.indexOf("=");
      const key = line.slice(0, i).trim();
      const value = line.slice(i + 1).trim();
      return [key, value];
    })
);

const badValues = new Set([
  "",
  "your_openai_api_key_here",
  "your_supabase_url_here",
  "your_supabase_service_role_key_here",
  "your_twilio_account_sid_here",
  "your_twilio_auth_token_here",
  "your_twilio_phone_number_here",
  "your_internal_job_secret_here"
]);

const missing = required.filter((key) => !map[key] || badValues.has(map[key]));

if (missing.length) {
  console.log("Missing or placeholder values in .env.local:");
  for (const key of missing) console.log(`- ${key}`);
  process.exit(2);
}

console.log("Environment file looks complete.");
