import {Stripe} from "stripe";
import * as functions from "firebase-functions";

let stripeInstance: Stripe | undefined;

export class StripeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StripeError";
  }
}

export async function getStripe(): Promise<Stripe> {
  if (stripeInstance) return stripeInstance;

  const stripeKey = functions.config().stripe?.key;
  if (!stripeKey) {
    throw new StripeError("Stripe key not found in config");
  }

  stripeInstance = new Stripe(stripeKey, {
    apiVersion: "2023-10-16", // Latest stable version
    typescript: true,
  });

  return stripeInstance;
}

export async function validateStripeWebhook(
  payload: string | Buffer,
  signature: string,
  webhookSecret: string
): Promise<Stripe.Event> {
  try {
    const stripe = await getStripe();
    return stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret
    );
  } catch (err) {
    throw new StripeError(`Webhook Error: ${err instanceof Error ? err.message : "Unknown error"}`);
  }
}
