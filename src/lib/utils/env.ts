function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export function getSupabaseUrl(): string {
  return getEnvVar("NEXT_PUBLIC_SUPABASE_URL");
}

export function getSupabasePublishableKey(): string {
  return getEnvVar("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
}

export function getDatabaseUrl(): string {
  return getEnvVar("DATABASE_URL");
}
