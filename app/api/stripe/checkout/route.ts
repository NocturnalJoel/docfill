import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get('origin') ?? 'http://localhost:3000';
    const body = await request.json().catch(() => ({}));
    const plan = body.plan === 'yearly' ? 'yearly' : 'monthly';

    const priceId = plan === 'yearly'
      ? process.env.STRIPE_PRICE_ID_YEARLY!
      : process.env.STRIPE_PRICE_ID!;

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/subscribe`,
      allow_promotion_codes: true,
      metadata: { plan },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
