import type { Request, Response } from 'express';
import crypto from 'crypto';
import { storage } from './storage';

interface LemonSqueezyWebhookPayload {
  meta: {
    event_name: string;
    custom_data?: {
      user_id?: string;
    };
  };
  data: {
    id: string;
    type: string;
    attributes: {
      status: string;
      first_order_item?: {
        product_id: number;
        product_name: string;
      };
    };
  };
}

function verifyWebhookSignature(rawBody: Buffer | string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(rawBody).digest('hex');
  
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
  } catch {
    return false;
  }
}

export async function handleLemonSqueezyWebhook(req: Request, res: Response): Promise<void> {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  
  if (!secret) {
    console.error('LEMONSQUEEZY_WEBHOOK_SECRET is not configured');
    res.status(500).json({ error: 'Webhook secret not configured' });
    return;
  }

  const signature = req.headers['x-signature'] as string;
  
  if (!signature) {
    console.error('Missing webhook signature');
    res.status(401).json({ error: 'Missing signature' });
    return;
  }

  const rawBody = req.rawBody as Buffer | undefined;
  
  if (!rawBody) {
    console.error('Missing raw body for signature verification');
    res.status(500).json({ error: 'Request processing error' });
    return;
  }
  
  if (!verifyWebhookSignature(rawBody, signature, secret)) {
    console.error('Invalid webhook signature');
    res.status(401).json({ error: 'Invalid signature' });
    return;
  }

  const payload = req.body as LemonSqueezyWebhookPayload;
  const eventName = payload.meta?.event_name;

  console.log(`Received Lemon Squeezy webhook: ${eventName}`);

  try {
    if (eventName === 'order_created') {
      const userId = payload.meta?.custom_data?.user_id;
      
      if (!userId) {
        console.error('No user_id found in webhook custom data');
        res.status(400).json({ error: 'Missing user_id' });
        return;
      }

      console.log(`Upgrading user ${userId} to pro tier`);
      await storage.updateUserStripeInfo(userId, { subscriptionTier: 'pro' });
      
      res.status(200).json({ success: true, message: 'User upgraded to pro' });
      return;
    }

    res.status(200).json({ success: true, message: 'Event acknowledged' });
  } catch (error) {
    console.error('Error processing Lemon Squeezy webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
