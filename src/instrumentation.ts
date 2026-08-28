// Optional error monitoring. To enable:
//   1. npm install @sentry/nextjs
//   2. set SENTRY_DSN in the environment
// If either is missing, this is a no-op — the app runs normally.

// Typed as string (not a literal) so the build doesn't try to resolve the
// module when the package isn't installed.
const SENTRY_PKG: string = "@sentry/nextjs";

export async function register() {
  if (!process.env.SENTRY_DSN) return;
  try {
    const Sentry = await import(SENTRY_PKG);
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0.1,
      environment: process.env.NODE_ENV,
    });
  } catch {
    // package not installed — skip quietly
  }
}

// Capture server-side request errors (Next.js 15 hook).
export async function onRequestError(...args: unknown[]) {
  if (!process.env.SENTRY_DSN) return;
  try {
    const Sentry = await import(SENTRY_PKG);
    if (typeof Sentry.captureRequestError === "function") {
      Sentry.captureRequestError(...args);
    }
  } catch {
    // skip quietly
  }
}
