import { env } from "cloudflare:workers";

type RuntimeBindings = {
  DB: D1Database;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  GITHUB_TOKEN?: string;
  GITHUB_REPOSITORY?: string;
  GITHUB_DEFAULT_BRANCH?: string;
  AI_PROVIDER_API_KEY?: string;
};

export function runtime(): RuntimeBindings {
  return env as unknown as RuntimeBindings;
}

export function requiredSecret(name: keyof RuntimeBindings): string {
  const value = runtime()[name];
  if (typeof value !== "string" || !value) {
    throw new Error(`${name} is not configured.`);
  }
  return value;
}
