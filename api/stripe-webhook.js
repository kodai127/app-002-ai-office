const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify(payload));
}

function logServerError(context, error) {
  console.error(context, {
    message: error instanceof Error ? error.message : 'Unknown error',
  });
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

function getPlanFromAmount(amountTotal) {
  if (amountTotal === 98000) {
    return 'pro';
  }

  if (amountTotal === 298000) {
    return 'business';
  }

  return 'free';
}

function isPaidStatus(status) {
  return ['active', 'trialing', 'past_due'].includes(status);
}

async function upsertSubscriptionSnapshot(supabaseAdmin, subscription, userId, plan) {
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;
  const priceId = subscription.items?.data?.[0]?.price?.id ?? null;

  if (!userId || !customerId) {
    return;
  }

  await supabaseAdmin.from('subscriptions').upsert({
    id: subscription.id,
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    price_id: priceId,
    plan,
    status: subscription.status,
    current_period_end: subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null,
    updated_at: new Date().toISOString(),
  });
}

async function updateProfileFromSubscription(supabaseAdmin, subscription, fallback = {}) {
  const userId = subscription.metadata?.user_id || fallback.userId;
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;
  const priceId = subscription.items?.data?.[0]?.price?.id;
  const paidPlan = getPlanFromPriceId(priceId);
  const fallbackPlan = fallback.plan || 'free';
  const planFromPrice = paidPlan === 'free' ? fallbackPlan : paidPlan;
  const plan = isPaidStatus(subscription.status) ? planFromPrice : 'free';
  const now = new Date().toISOString();

  if (userId) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, stripe_customer_id')
      .eq('id', userId)
      .maybeSingle();

    if (profile?.stripe_customer_id && customerId && profile.stripe_customer_id !== customerId) {
      throw new Error('Stripe customer does not match profile owner');
    }

    await supabaseAdmin
      .from('profiles')
      .update({
        plan,
        stripe_customer_id: customerId ?? null,
        subscription_status: subscription.status,
        updated_at: now,
      })
      .eq('id', userId);
    await upsertSubscriptionSnapshot(supabaseAdmin, subscription, userId, plan);
    return;
  }

  if (customerId) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle();

    if (!profile?.id) {
      return;
    }

    await supabaseAdmin
      .from('profiles')
      .update({
        plan,
        stripe_customer_id: customerId,
        subscription_status: subscription.status,
        updated_at: now,
      })
      .eq('stripe_customer_id', customerId);
    await upsertSubscriptionSnapshot(supabaseAdmin, subscription, profile.id, plan);
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
    logServerError('Stripe webhook signature verification failed', error);
    return sendJson(response, 400, { error: 'Invalid webhook signature' });
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
      const userId = session.metadata?.user_id || session.client_reference_id;
      const plan = getPlanFromAmount(session.amount_total);

      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await updateProfileFromSubscription(supabaseAdmin, subscription, { plan, userId });
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
    logServerError('Stripe webhook handling failed', error);
    return sendJson(response, 500, { error: 'Webhook handling failed' });
  }
};
