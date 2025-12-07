import { getStripeSync, getUncachableStripeClient } from './stripeClient';
import { storage } from './storage';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string, uuid: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature, uuid);

    const stripe = await getUncachableStripeClient();
    const event = JSON.parse(payload.toString());

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      if (session.mode === 'subscription' && session.customer && session.subscription) {
        const customerId = session.customer;
        const subscriptionId = session.subscription;

        const customers = await stripe.customers.list({ limit: 100 });
        const customer = customers.data.find((c: any) => c.id === customerId);
        const userId = customer?.metadata?.userId;

        if (userId) {
          await storage.updateUserStripeInfo(userId, {
            stripeSubscriptionId: subscriptionId,
            subscriptionTier: 'pro',
          });
          console.log(`User ${userId} upgraded to Pro`);
        }
      }
    }

    if (event.type === 'customer.subscription.deleted' || 
        event.type === 'customer.subscription.updated') {
      const subscription = event.data.object;
      const customerId = subscription.customer;

      const customers = await stripe.customers.list({ limit: 100 });
      const customer = customers.data.find((c: any) => c.id === customerId);
      const userId = customer?.metadata?.userId;

      if (userId) {
        if (event.type === 'customer.subscription.deleted' ||
            subscription.status === 'canceled' ||
            subscription.status === 'unpaid') {
          await storage.updateUserStripeInfo(userId, {
            stripeSubscriptionId: null as any,
            subscriptionTier: 'free',
          });
          console.log(`User ${userId} downgraded to Free`);
        } else if (subscription.status === 'active') {
          await storage.updateUserStripeInfo(userId, {
            stripeSubscriptionId: subscription.id,
            subscriptionTier: 'pro',
          });
        }
      }
    }
  }
}
