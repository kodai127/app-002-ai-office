const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify(payload));
}

async function readRawBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

function getPlanFromPriceId(priceId) {
  if (priceId && priceId === process.env.STRIPE_PRO_PRICE_ID) {
    return 'pro';
  }

  if (priceId && priceId === process.env.STRIPE_BUSINESS_PRICE_ID) {
    return 'business';
  }

  return 'free';
}

function isPaidStatus(status) {
  return ['active', 'trialing', 'past_due'].includes(status);
}

async function updateProfileFromSubscription(supabaseAdmin, subscription) {
  const userId = subscription.metadata?.user_id;
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;
  const priceId = subscription.items?.data?.[0]?.price?.id;
  const paidPlan = getPlanFromPriceId(priceId);
  const plan = isPaidStatus(subscription.status) ? paidPlan : 'free';
  const now = new Date().toISOString();

  if (userId) {
    await supabaseAdmin
      .from('profiles')
      .update({
        plan,
        stripe_customer_id: customerId ?? null,
        subscription_status: subscription.status,
        updated_at: now,
      })
      .eq('id', userId);
    return;
  }

  if (customerId) {
    await supabaseAdmin
      .from('profiles')
      .update({
        plan,
        stripe_customer_id: customerId,
        subscription_status: subscription.status,
        updated_at: now,
      })
      .eq('stripe_customer_id', customerId);
  }
}

module.exports = async function handler(request, response) {
  if (request.method !== 'POST') {
    return sendJson(response, 405, { error: 'Method not allowed' });
  }

  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return sendJson(response, 500, { error: 'Stripe webhook environment variables are not configured' });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.EXPO_PUBLIC_SUPABASE_URL) {
    return sendJson(response, 500, { error: 'Supabase server environment variables are not configured' });
  }

  const signature = request.headers['stripe-signature'];
  const rawBody = await readRawBody(request);
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  let event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    return sendJson(response, 400, { error: `Webhook signature verification failed: ${error.message}` });
  }

  const supabaseAdmin = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;

      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await updateProfileFromSubscription(supabaseAdmin, subscription);
      }
    }

    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      await updateProfileFromSubscription(supabaseAdmin, event.data.object);
    }

    return sendJson(response, 200, { received: true });
  } catch (error) {
    return sendJson(response, 500, { error: error instanceof Error ? error.message : 'Webhook handling failed' });
  }
};
