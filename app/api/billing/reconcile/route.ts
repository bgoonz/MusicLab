import { getChatGPTUser } from "../../../chatgpt-auth";
import { creditPaidCheckout, PaidCheckoutSession } from "../../../../lib/credit-checkout";
import { getCreditBalance } from "../../../../lib/billing";
import { requiredSecret } from "../../../../lib/runtime";

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in is required." }, { status: 401 });
  const body = await request.json().catch(() => null) as { sessionId?: string } | null;
  const sessionId = body?.sessionId ?? "";
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) {
    return Response.json({ error: "The checkout session is invalid." }, { status: 400 });
  }

  let stripeSecret: string;
  try {
    stripeSecret = requiredSecret("STRIPE_SECRET_KEY");
  } catch {
    return Response.json({ error: "Stripe is not connected." }, { status: 503 });
  }

  const stripeResponse = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    headers: { Authorization: `Bearer ${stripeSecret}` },
  });
  const session = await stripeResponse.json().catch(() => ({})) as PaidCheckoutSession & { error?: { message?: string } };
  if (!stripeResponse.ok) {
    return Response.json({ error: session.error?.message ?? "Stripe could not verify the payment." }, { status: 502 });
  }

  const userId = user.email.toLowerCase();
  if (session.metadata?.user_id !== userId) {
    return Response.json({ error: "This payment belongs to a different account." }, { status: 403 });
  }

  try {
    await creditPaidCheckout(session);
    const balanceMicroUsd = await getCreditBalance(userId);
    return Response.json({ balanceUsd: balanceMicroUsd / 1_000_000 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "The payment could not be credited." }, { status: 409 });
  }
}
