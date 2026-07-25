import { getCreditPackage } from "../../../../lib/billing";
import { requiredSecret, runtime } from "../../../../lib/runtime";
import { verifyStripeWebhook } from "../../../../lib/stripe-webhook";

type StripeCheckoutEvent = {
  id: string;
  type: string;
  data: {
    object: {
      id: string;
      payment_status?: string;
      amount_total?: number;
      metadata?: { order_id?: string; user_id?: string; package_id?: string };
    };
  };
};

export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature.", { status: 400 });

  let webhookSecret: string;
  try {
    webhookSecret = requiredSecret("STRIPE_WEBHOOK_SECRET");
  } catch {
    return new Response("Webhook is not configured.", { status: 503 });
  }

  if (!(await verifyStripeWebhook(payload, signature, webhookSecret))) {
    return new Response("Invalid signature.", { status: 400 });
  }

  const event = JSON.parse(payload) as StripeCheckoutEvent;
  if (event.type !== "checkout.session.completed") return Response.json({ received: true });

  const session = event.data.object;
  const metadata = session.metadata;
  const creditPackage = getCreditPackage(metadata?.package_id ?? "");
  if (
    session.payment_status !== "paid" ||
    !metadata?.order_id ||
    !metadata.user_id ||
    !creditPackage ||
    session.amount_total !== creditPackage.amountCents
  ) {
    return new Response("Paid session metadata did not match an order.", { status: 400 });
  }

  const db = runtime().DB;
  const existingCredit = await db.prepare(
    "SELECT 1 AS credited FROM credit_ledger WHERE source_type = 'stripe_checkout' AND source_id = ?",
  ).bind(session.id).first<{ credited: number }>();
  if (existingCredit) return Response.json({ received: true });

  const order = await db.prepare(
    `SELECT id FROM checkout_orders
     WHERE id = ? AND stripe_session_id = ? AND user_id = ? AND package_id = ? AND amount_cents = ? AND status = 'pending'`,
  ).bind(
    metadata.order_id,
    session.id,
    metadata.user_id,
    creditPackage.id,
    creditPackage.amountCents,
  ).first<{ id: string }>();
  if (!order) return new Response("Matching pending order was not found.", { status: 409 });

  const now = Date.now();
  await db.batch([
    db.prepare(
      `INSERT OR IGNORE INTO payment_events (stripe_event_id, event_type, processed_at) VALUES (?, ?, ?)`,
    ).bind(event.id, event.type, now),
    db.prepare(
      `UPDATE checkout_orders SET status = 'paid', paid_at = ?
       WHERE id = ? AND stripe_session_id = ? AND user_id = ? AND status = 'pending'`,
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
  ]);

  return Response.json({ received: true });
}
