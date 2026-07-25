import { runtime } from "./runtime";

export const CREDIT_PACKAGES = {
  starter: { id: "starter", name: "Starter credits", amountCents: 500, creditsMicroUsd: 5_000_000 },
  practice: { id: "practice", name: "Practice pack", amountCents: 1500, creditsMicroUsd: 15_000_000 },
  studio: { id: "studio", name: "Studio pack", amountCents: 3000, creditsMicroUsd: 30_000_000 },
} as const;

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
}) {
  const db = runtime().DB;
  const usageId = crypto.randomUUID();
  const now = Date.now();
  const debit = await db.prepare(
    `UPDATE credit_accounts
     SET balance_micro_usd = balance_micro_usd - ?, updated_at = ?
     WHERE user_id = ? AND balance_micro_usd >= ?`,
  ).bind(input.maximumMicroUsd, now, input.userId, input.maximumMicroUsd).run();

  if (!debit.meta.changes) throw new Error("Insufficient AI credits.");

  try {
    await db.batch([
      db.prepare(
        `INSERT INTO ai_usage
         (id, user_id, request_id, provider, model, input_tokens, output_tokens, reserved_micro_usd, status, created_at)
         VALUES (?, ?, ?, ?, ?, 0, 0, ?, 'reserved', ?)`,
      ).bind(usageId, input.userId, input.requestId, input.provider, input.model, input.maximumMicroUsd, now),
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
}) {
  const db = runtime().DB;
  const usage = await db.prepare(
    "SELECT reserved_micro_usd AS reserved FROM ai_usage WHERE id = ? AND user_id = ? AND status = 'reserved'",
  ).bind(input.usageId, input.userId).first<{ reserved: number }>();
  if (!usage) throw new Error("Credit reservation was not found.");
  if (input.actualMicroUsd > usage.reserved) throw new Error("Actual usage exceeded the reserved amount.");

  const refund = usage.reserved - input.actualMicroUsd;
  const now = Date.now();
  await db.batch([
    db.prepare(
      `UPDATE ai_usage SET input_tokens = ?, output_tokens = ?, actual_micro_usd = ?, status = 'settled', settled_at = ?
       WHERE id = ? AND status = 'reserved'`,
    ).bind(input.inputTokens, input.outputTokens, input.actualMicroUsd, now, input.usageId),
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
  ]);
}
