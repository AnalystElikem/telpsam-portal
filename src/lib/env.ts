// Fail fast, with a clear message, when a required environment variable is
// missing — instead of a confusing runtime error deep in a Supabase call.
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable "${name}". ` +
        `Copy .env.local.example to .env.local and fill it in.`
    );
  }
  return value;
}
