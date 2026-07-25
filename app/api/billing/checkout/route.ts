import { getChatGPTUser } from "../../../chatgpt-auth";
import { ensureCreditAccount, getCreditPackage } from "../../../../lib/billing";
import { requiredSecret, runtime } from "../../../../lib/runtime";

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in is required." }, { status: 401 });

  const body = await request.json().catch(() => null) as { packageId?: string } | null;
  const creditPackage = getCreditPackage(body?.packageId ?? "");
  if (!creditPackage) return Response.json({ error: "Choose a valid credit package." }, { status: 400 });

  const userId = user.email.toLowerCase();
  await ensureCreditAccount(userId, user.email);
  const orderId = crypto.randomUUID();
  const origin = new URL(request.url).origin;
  const params = new URLSearchParams({
    mode: "payment",
    success_url: `${origin}/?payment=success&session_id={CHECKOUT_SESSION_ID}#create`,
    cancel_url: `${origin}/?payment=cancelled#credits`,
    customer_email: user.email,
    client_reference_id: orderId,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": String(creditPackage.amountCents),
    "line_items[0][price_data][product_data][name]": `Practice Lab — ${creditPackage.name}`,
    "line_items[0][price_data][product_data][description]": `$${creditPackage.creditsMicroUsd / 1_000_000} in non-transferable AI usage credits`,
    "metadata[order_id]": orderId,
    "metadata[user_id]": userId,
    "metadata[package_id]": creditPackage.id,
  });

  let secret: string;
  try {
    secret = requiredSecret("STRIPE_SECRET_KEY");
  } catch {
    return Response.json({ error: "Stripe is not connected yet." }, { status: 503 });
  }

  const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Idempotency-Key": orderId,
    },
    body: params,
  });
  const session = await stripeResponse.json() as { id?: string; url?: string; error?: { message?: string } };
  if (!stripeResponse.ok || !session.id || !session.url) {
    return Response.json({ error: session.error?.message ?? "Checkout could not be created." }, { status: 502 });
  }

  await runtime().DB.prepare(
    `INSERT INTO checkout_orders
     (id, user_id, package_id, amount_cents, credits_micro_usd, stripe_session_id, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
  ).bind(orderId, userId, creditPackage.id, creditPackage.amountCents, creditPackage.creditsMicroUsd, session.id, Date.now()).run();

  return Response.json({ checkoutUrl: session.url });
}
