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

function getPlanFromPriceId(priceId) {
  if (priceId && priceId === process.env.STRIPE_PRO_PRICE_ID) {
    return 'pro';
  }

  if (priceId && priceId === process.env.STRIPE_BUSINESS_PRICE_ID) {
    return 'business';
  }

  return null;
}

function isPaidStatus(status) {
  return ['active', 'trialing', 'past_due'].includes(status);
}

async function findPaidCustomerByEmail(stripe, email) {
  if (!email) {
    return null;
  }

  const customers = await stripe.customers.list({
    email,
    limit: 10,
  });

  for (const customer of customers.data) {
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      limit: 10,
      status: 'all',
    });
    const paidSubscription = subscriptions.data.find((subscription) => isPaidStatus(subscription.status));

    if (paidSubscription) {
      const priceId = paidSubscription.items?.data?.[0]?.price?.id;

      return {
        customerId: customer.id,
        plan: getPlanFromPriceId(priceId) || 'pro',
        subscriptionStatus: paidSubscription.status,
      };
    }
  }

  return null;
}

module.exports = async function handler(request, response) {
  if (request.method !== 'POST') {
    return sendJson(response, 405, { error: 'Method not allowed' });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return sendJson(response, 500, { error: 'Payment configuration is not available' });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.EXPO_PUBLIC_SUPABASE_URL) {
    return sendJson(response, 500, { error: 'Server configuration is not available' });
  }

  try {
    const authorization = request.headers.authorization || '';
    const accessToken = authorization.replace(/^Bearer\s+/i, '');

    if (!accessToken) {
      return sendJson(response, 401, { error: 'Login is required' });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const supabaseAdmin = createClient(
      process.env.EXPO_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(accessToken);

    if (userError || !userData.user) {
      return sendJson(response, 401, { error: 'Invalid login session' });
    }

    const user = userData.user;
    const now = new Date().toISOString();
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    const linkedPaidCustomer = profile?.stripe_customer_id ? null : await findPaidCustomerByEmail(stripe, user.email);
    const customerId = profile?.stripe_customer_id || linkedPaidCustomer?.customerId;
    const plan = linkedPaidCustomer?.plan || profile?.plan || 'free';
    const subscriptionStatus = linkedPaidCustomer?.subscriptionStatus || profile?.subscription_status || 'free';

    if (!customerId) {
      return sendJson(response, 404, {
        error: 'Stripe Customerが見つかりません。先にProまたはBusinessへ登録してください。',
      });
    }

    if (plan !== 'pro' && plan !== 'business') {
      return sendJson(response, 403, { error: 'Customer PortalはPro/Businessユーザーのみ利用できます。' });
    }

    if (linkedPaidCustomer || !profile) {
      await supabaseAdmin.from('profiles').upsert({
        id: user.id,
        email: user.email ?? null,
        plan,
        stripe_customer_id: customerId,
        subscription_status: subscriptionStatus,
        created_at: profile?.created_at || now,
        updated_at: now,
      });
    }

    const siteUrl = (process.env.EXPO_PUBLIC_SITE_URL || 'https://app-002-ai-office.vercel.app').replace(/\/$/, '');
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${siteUrl}/settings?tab=mypage`,
    });

    return sendJson(response, 200, { url: session.url });
  } catch (error) {
    logServerError('Customer Portal session creation failed', error);
    return sendJson(response, 500, { error: 'Customer Portalを開始できませんでした。' });
  }
};
