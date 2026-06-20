const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify(payload));
}

async function readJsonBody(request) {
  if (request.body && typeof request.body === 'object') {
    return request.body;
  }

  const chunks = [];

  for await (const chunk of request) {
    chunks.push(Buffer.from(chunk));
  }

  const rawBody = Buffer.concat(chunks).toString('utf8');

  return rawBody ? JSON.parse(rawBody) : {};
}

function getPriceId(plan) {
  if (plan === 'pro') {
    return process.env.STRIPE_PRO_PRICE_ID;
  }

  if (plan === 'business') {
    return process.env.STRIPE_BUSINESS_PRICE_ID;
  }

  return null;
}

module.exports = async function handler(request, response) {
  if (request.method !== 'POST') {
    return sendJson(response, 405, { error: 'Method not allowed' });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return sendJson(response, 500, { error: 'STRIPE_SECRET_KEY is not configured' });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.EXPO_PUBLIC_SUPABASE_URL) {
    return sendJson(response, 500, { error: 'Supabase server environment variables are not configured' });
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const body = await readJsonBody(request);
    const plan = body.plan;
    const priceId = getPriceId(plan);

    if (!priceId) {
      return sendJson(response, 400, { error: 'Invalid billing plan or missing Stripe price ID' });
    }

    const authorization = request.headers.authorization || '';
    const accessToken = authorization.replace(/^Bearer\s+/i, '');

    if (!accessToken) {
      return sendJson(response, 401, { error: 'Login is required' });
    }

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
    const siteUrl = (process.env.EXPO_PUBLIC_SITE_URL || 'https://app-002-ai-office.vercel.app').replace(/\/$/, '');
    const now = new Date().toISOString();
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    const customerId = profile?.stripe_customer_id || undefined;
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      client_reference_id: user.id,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        plan,
        user_id: user.id,
      },
      subscription_data: {
        metadata: {
          plan,
          user_id: user.id,
        },
      },
      success_url: `${siteUrl}/settings?checkout=success`,
      cancel_url: `${siteUrl}/settings?checkout=cancel`,
    });

    await supabaseAdmin.from('profiles').upsert({
      id: user.id,
      email: user.email ?? null,
      plan: profile?.plan || 'free',
      stripe_customer_id: customerId || (typeof session.customer === 'string' ? session.customer : null),
      subscription_status: profile?.subscription_status || 'checkout_started',
      created_at: profile?.created_at || now,
      updated_at: now,
    });

    return sendJson(response, 200, { url: session.url });
  } catch (error) {
    return sendJson(response, 500, { error: error instanceof Error ? error.message : 'Checkout failed' });
  }
};
