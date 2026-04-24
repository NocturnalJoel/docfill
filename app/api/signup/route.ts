import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { session_id, email, password } = await request.json();

    if (!session_id || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify Stripe session is actually paid
    const stripe = getStripe();
    let session;
    try {
      session = await stripe.checkout.sessions.retrieve(session_id);
    } catch {
      return NextResponse.json({ error: 'Invalid payment session' }, { status: 400 });
    }

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 });
    }

    // If Stripe collected an email, it must match
    const stripeEmail = session.customer_details?.email?.toLowerCase();
    if (stripeEmail && stripeEmail !== email.trim().toLowerCase()) {
      return NextResponse.json(
        { error: 'Email must match the one used during payment' },
        { status: 400 }
      );
    }

    // Create the confirmed Supabase user
    const admin = createAdminClient();
    const { data: createData, error: createError } = await admin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
    });

    if (createError) {
      if (createError.message.toLowerCase().includes('already')) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Please sign in.' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    // Record the subscription so the dashboard gate can verify access
    if (createData?.user) {
      await admin.from('subscriptions').insert({
        user_id: createData.user.id,
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: session.subscription as string,
        status: 'active',
        plan: session.metadata?.plan ?? 'monthly',
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Signup error:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
