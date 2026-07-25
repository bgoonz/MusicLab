import { runtime } from "./runtime";

export const CREDIT_PACKAGES = {
  starter: { id: "starter", name: "Starter credits", amountCents: 500, creditsMicroUsd: 5_000_000 },
  practice: { id: "practice", name: "Practice pack", amountCents: 1500, creditsMicroUsd: 15_000_000 },
  studio: { id: "studio", name: "Studio pack", amountCents: 3000, creditsMicroUsd: 30_000_000 },
} as const;

// A 300% markup means provider cost plus 300%, or a 4× retail multiplier.
export const RETAIL_MARKUP = 4;
export const MONTHLY_PROVIDER_LIMIT_MICRO_USD = 5_000_000;

export type CreditPackageId = keyof typeof CREDIT_PACKAGES;

export function getCreditPackage(value: string) {
  return CREDIT_PACKAGES[value as CreditPackageId] ?? null;
}

export async function ensureCreditAccount(userId: string, email: string) {
  const now = Date.now();
  await runtime().DB.prepare(
    `INSERT INTO credit_accounts (user_id, email, balance_micro_usd, created_at, updated_at)
     VALUES (?, ?, 0, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET email = excluded.email, updated_at = excluded.updated_at`,
  ).bind(userId, email, now, now).run();
}

export async function getCreditBalance(userId: string): Promise<number> {
  const row = await runtime().DB.prepare(
    "SELECT balance_micro_usd AS balance FROM credit_accounts WHERE user_id = ?",
  ).bind(userId).first<{ balance: number }>();
  return row?.balance ?? 0;
}

export async function reserveCredits(input: {
  userId: string;
  requestId: string;
  provider: string;
  model: string;
  maximumMicroUsd: number;
  providerMaximumMicroUsd: number;
}) {
  const db = runtime().DB;
  const usageId = crypto.randomUUID();
  const now = Date.now();
  const monthBucket = new Date(now).toISOString().slice(0, 7);
  await db.prepare(
    `INSERT OR IGNORE INTO provider_budgets
     (bucket, reserved_micro_usd, spent_micro_usd, limit_micro_usd, updated_at)
     VALUES (?, 0, 0, ?, ?)`,
  ).bind(monthBucket, MONTHLY_PROVIDER_LIMIT_MICRO_USD, now).run();
  const providerReservation = await db.prepare(
    `UPDATE provider_budgets
     SET reserved_micro_usd = reserved_micro_usd + ?, updated_at = ?
     WHERE bucket = ? AND spent_micro_usd + reserved_micro_usd + ? <= limit_micro_usd`,
  ).bind(input.providerMaximumMicroUsd, now, monthBucket, input.providerMaximumMicroUsd).run();
  if (!providerReservation.meta.changes) throw new Error("The monthly AI safety limit has been reached.");

  const debit = await db.prepare(
    `UPDATE credit_accounts
     SET balance_micro_usd = balance_micro_usd - ?, updated_at = ?
     WHERE user_id = ? AND balance_micro_usd >= ?`,
  ).bind(input.maximumMicroUsd, now, input.userId, input.maximumMicroUsd).run();

  if (!debit.meta.changes) {
    await db.prepare(
      "UPDATE provider_budgets SET reserved_micro_usd = MAX(0, reserved_micro_usd - ?), updated_at = ? WHERE bucket = ?",
    ).bind(input.providerMaximumMicroUsd, Date.now(), monthBucket).run();
    throw new Error("Insufficient AI credits.");
  }

  try {
    await db.batch([
      db.prepare(
        `INSERT INTO ai_usage
         (id, user_id, request_id, provider, model, input_tokens, output_tokens, reserved_micro_usd,
          provider_reserved_micro_usd, status, created_at)
         VALUES (?, ?, ?, ?, ?, 0, 0, ?, ?, 'reserved', ?)`,
      ).bind(usageId, input.userId, input.requestId, input.provider, input.model, input.maximumMicroUsd, input.providerMaximumMicroUsd, now),
      db.prepare(
        `INSERT INTO credit_ledger
         (id, user_id, kind, amount_micro_usd, source_type, source_id, created_at)
         VALUES (?, ?, 'reservation', ?, 'ai_request', ?, ?)`,
      ).bind(crypto.randomUUID(), input.userId, -input.maximumMicroUsd, input.requestId, now),
    ]);
  } catch (error) {
    await db.prepare(
      "UPDATE credit_accounts SET balance_micro_usd = balance_micro_usd + ?, updated_at = ? WHERE user_id = ?",
    ).bind(input.maximumMicroUsd, Date.now(), input.userId).run();
    await db.prepare(
      "UPDATE provider_budgets SET reserved_micro_usd = MAX(0, reserved_micro_usd - ?), updated_at = ? WHERE bucket = ?",
    ).bind(input.providerMaximumMicroUsd, Date.now(), monthBucket).run();
    throw error;
  }

  return usageId;
}

export async function settleCredits(input: {
  usageId: string;
  userId: string;
  inputTokens: number;
  outputTokens: number;
  actualMicroUsd: number;
  providerActualMicroUsd: number;
}) {
  const db = runtime().DB;
  const usage = await db.prepare(
    `SELECT reserved_micro_usd AS reserved, provider_reserved_micro_usd AS providerReserved, created_at AS createdAt
     FROM ai_usage WHERE id = ? AND user_id = ? AND status = 'reserved'`,
  ).bind(input.usageId, input.userId).first<{ reserved: number; providerReserved: number; createdAt: number }>();
  if (!usage) throw new Error("Credit reservation was not found.");
  if (input.actualMicroUsd > usage.reserved) throw new Error("Actual usage exceeded the reserved amount.");

  const refund = usage.reserved - input.actualMicroUsd;
  const now = Date.now();
  const monthBucket = new Date(usage.createdAt).toISOString().slice(0, 7);
  await db.batch([
    db.prepare(
      `UPDATE ai_usage SET input_tokens = ?, output_tokens = ?, actual_micro_usd = ?, provider_actual_micro_usd = ?,
       status = 'settled', settled_at = ?
       WHERE id = ? AND status = 'reserved'`,
    ).bind(input.inputTokens, input.outputTokens, input.actualMicroUsd, input.providerActualMicroUsd, now, input.usageId),
    db.prepare(
      "UPDATE credit_accounts SET balance_micro_usd = balance_micro_usd + ?, updated_at = ? WHERE user_id = ?",
    ).bind(refund, now, input.userId),
    db.prepare(
      `INSERT OR IGNORE INTO credit_ledger
       (id, user_id, kind, amount_micro_usd, source_type, source_id, metadata_json, created_at)
       VALUES (?, ?, 'refund', ?, 'ai_settlement', ?, ?, ?)`,
    ).bind(
      crypto.randomUUID(),
      input.userId,
      refund,
      `settlement:${input.usageId}`,
      JSON.stringify({ actualMicroUsd: input.actualMicroUsd }),
      now,
    ),
    db.prepare(
      `UPDATE provider_budgets
       SET reserved_micro_usd = MAX(0, reserved_micro_usd - ?), spent_micro_usd = spent_micro_usd + ?, updated_at = ?
       WHERE bucket = ?`,
    ).bind(usage.providerReserved, input.providerActualMicroUsd, now, monthBucket),
  ]);
}

export async function releaseCredits(usageId: string, userId: string) {
  const db = runtime().DB;
  const usage = await db.prepare(
    `SELECT reserved_micro_usd AS reserved, provider_reserved_micro_usd AS providerReserved, created_at AS createdAt
     FROM ai_usage WHERE id = ? AND user_id = ? AND status = 'reserved'`,
  ).bind(usageId, userId).first<{ reserved: number; providerReserved: number; createdAt: number }>();
  if (!usage) return;

  const now = Date.now();
  const monthBucket = new Date(usage.createdAt).toISOString().slice(0, 7);
  await db.batch([
    db.prepare(
      "UPDATE ai_usage SET status = 'failed', settled_at = ? WHERE id = ? AND status = 'reserved'",
    ).bind(now, usageId),
    db.prepare(
      "UPDATE credit_accounts SET balance_micro_usd = balance_micro_usd + ?, updated_at = ? WHERE user_id = ?",
    ).bind(usage.reserved, now, userId),
    db.prepare(
      `INSERT OR IGNORE INTO credit_ledger
       (id, user_id, kind, amount_micro_usd, source_type, source_id, created_at)
       VALUES (?, ?, 'refund', ?, 'ai_failure', ?, ?)`,
    ).bind(crypto.randomUUID(), userId, usage.reserved, `failure:${usageId}`, now),
    db.prepare(
      "UPDATE provider_budgets SET reserved_micro_usd = MAX(0, reserved_micro_usd - ?), updated_at = ? WHERE bucket = ?",
    ).bind(usage.providerReserved, now, monthBucket),
  ]);
}
