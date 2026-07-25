import { creditPaidCheckout } from "../../../../lib/credit-checkout";
import { requiredSecret } from "../../../../lib/runtime";
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

  try {
    await creditPaidCheckout(event.data.object, event.id);
    return Response.json({ received: true });
  } catch (error) {
    return new Response(error instanceof Error ? error.message : "Checkout could not be credited.", { status: 409 });
  }
}
