function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  openAiKey: () => requireEnv("OPENAI_API_KEY"),
  supabaseUrl: () => requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseServiceRoleKey: () => requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  internalJobSecret: () => requireEnv("INTERNAL_JOB_SECRET"),
  appBaseUrl: () => requireEnv("APP_BASE_URL"),
};
