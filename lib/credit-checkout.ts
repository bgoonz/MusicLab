import { getCreditPackage } from "./billing";
import { runtime } from "./runtime";

export type PaidCheckoutSession = {
  id: string;
  payment_status?: string;
  amount_total?: number;
  metadata?: { order_id?: string; user_id?: string; package_id?: string };
};

export async function creditPaidCheckout(session: PaidCheckoutSession, stripeEventId?: string) {
  const metadata = session.metadata;
  const creditPackage = getCreditPackage(metadata?.package_id ?? "");
  if (
    session.payment_status !== "paid" ||
    !metadata?.order_id ||
    !metadata.user_id ||
    !creditPackage ||
    session.amount_total !== creditPackage.amountCents
  ) {
    throw new Error("Paid session metadata did not match an order.");
  }

  const db = runtime().DB;
  const existingCredit = await db.prepare(
    "SELECT 1 AS credited FROM credit_ledger WHERE source_type = 'stripe_checkout' AND source_id = ?",
  ).bind(session.id).first<{ credited: number }>();
  if (existingCredit) return { credited: false, amountMicroUsd: creditPackage.creditsMicroUsd };

  const order = await db.prepare(
    `SELECT id FROM checkout_orders
     WHERE id = ? AND stripe_session_id = ? AND user_id = ? AND package_id = ? AND amount_cents = ?
       AND status IN ('pending', 'paid')`,
  ).bind(
    metadata.order_id,
    session.id,
    metadata.user_id,
    creditPackage.id,
    creditPackage.amountCents,
  ).first<{ id: string }>();
  if (!order) throw new Error("Matching checkout order was not found.");

  const now = Date.now();
  const statements = [
    db.prepare(
      `UPDATE checkout_orders SET status = 'paid', paid_at = COALESCE(paid_at, ?)
       WHERE id = ? AND stripe_session_id = ? AND user_id = ?`,
    ).bind(now, metadata.order_id, session.id, metadata.user_id),
    db.prepare(
      `UPDATE credit_accounts
       SET balance_micro_usd = balance_micro_usd +
         CASE WHEN NOT EXISTS (
           SELECT 1 FROM credit_ledger WHERE source_type = 'stripe_checkout' AND source_id = ?
         ) THEN ? ELSE 0 END,
         updated_at = ?
       WHERE user_id = ?`,
    ).bind(session.id, creditPackage.creditsMicroUsd, now, metadata.user_id),
    db.prepare(
      `INSERT OR IGNORE INTO credit_ledger
       (id, user_id, kind, amount_micro_usd, source_type, source_id, metadata_json, created_at)
       VALUES (?, ?, 'purchase', ?, 'stripe_checkout', ?, ?, ?)`,
    ).bind(
      crypto.randomUUID(),
      metadata.user_id,
      creditPackage.creditsMicroUsd,
      session.id,
      JSON.stringify({ orderId: metadata.order_id, packageId: creditPackage.id }),
      now,
    ),
  ];
  if (stripeEventId) {
    statements.unshift(
      db.prepare(
        "INSERT OR IGNORE INTO payment_events (stripe_event_id, event_type, processed_at) VALUES (?, 'checkout.session.completed', ?)",
      ).bind(stripeEventId, now),
    );
  }
  await db.batch(statements);
  return { credited: true, amountMicroUsd: creditPackage.creditsMicroUsd };
}
