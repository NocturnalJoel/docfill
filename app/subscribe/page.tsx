'use client';

import Link from 'next/link';
import { CheckCircle, ArrowRight, Shield, Zap, Loader2 } from 'lucide-react';
import { useState } from 'react';

const included = [
  'Unlimited client documents',
  'Unlimited templates',
  'Unlimited clients',
  'PDF support (Word coming soon)',
  'Visual field editor',
  'Smart auto-detection',
  'Instant document generation',
  'Priority support',
];

export default function SubscribePage() {
  const [plan, setPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();

      if (!res.ok || !data.url) {
        setError(data.error ?? 'Something went wrong. Please try again.');
        setIsLoading(false);
        return;
      }

      window.location.href = data.url;
    } catch {
      setError('Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };

  const isYearly = plan === 'yearly';
  const monthlySavings = Math.round(((99 * 12 - 1069) / (99 * 12)) * 100);

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Header */}
      <header className="border-b border-black/10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="PaperworkSlayer" className="w-8 h-8 rounded-lg" />
            <span className="font-bold text-xl text-black">PaperworkSlayer</span>
          </Link>
          <Link href="/login" className="text-sm text-black/50 hover:text-black transition-colors">
            Already a member? Sign in
          </Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black mb-3">One plan. Everything included.</h1>
          <p className="text-black/50 text-lg">No tiers, no surprises. Just one flat rate to slay all your paperwork.</p>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center mb-10">
          <div className="flex items-center gap-1 bg-black/5 rounded-xl p-1">
            <button
              onClick={() => setPlan('monthly')}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                !isYearly ? 'bg-black text-white shadow-sm' : 'text-black/50 hover:text-black'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setPlan('yearly')}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                isYearly ? 'bg-black text-white shadow-sm' : 'text-black/50 hover:text-black'
              }`}
            >
              Yearly
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${isYearly ? 'bg-white/20 text-white' : 'bg-green-100 text-green-700'}`}>
                Save {monthlySavings}%
              </span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-start max-w-3xl mx-auto">
          {/* Plan card */}
          <div className="bg-black text-white rounded-2xl p-8">
            <div className="text-sm font-semibold text-white/50 uppercase tracking-widest mb-4">PaperworkSlayer Pro</div>

            <div className="mb-1">
              {isYearly ? (
                <>
                  <span className="text-6xl font-black">$1,069</span>
                  <span className="text-white/40 text-lg ml-1">CAD/year</span>
                  <div className="text-white/30 text-sm mt-1 line-through">$1,188 CAD/year</div>
                </>
              ) : (
                <>
                  <span className="text-6xl font-black">$99</span>
                  <span className="text-white/40 text-lg ml-1">CAD/month</span>
                </>
              )}
            </div>

            <p className="text-white/40 text-sm mb-8">
              {isYearly ? 'Billed once a year. Cancel anytime.' : 'Billed monthly. Cancel anytime.'}
            </p>

            {error && (
              <div className="bg-white/10 border border-white/20 text-white/80 text-sm rounded-xl p-3 mb-4">
                {error}
              </div>
            )}

            <button
              onClick={handleSubscribe}
              disabled={isLoading}
              className="w-full bg-white text-black py-4 rounded-xl font-bold text-base hover:bg-white/90 transition-colors flex items-center justify-center gap-2 group disabled:opacity-60"
            >
              {isLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  Subscribe Now
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            <div className="mt-6 flex items-center gap-2 text-white/30 text-xs justify-center">
              <Shield size={12} />
              <span>Secure payment via Stripe</span>
            </div>
          </div>

          {/* What's included */}
          <div className="pt-2">
            <div className="flex items-center gap-2 mb-6">
              <Zap size={16} className="text-black" />
              <span className="font-semibold text-sm uppercase tracking-widest text-black/60">What&apos;s included</span>
            </div>
            <ul className="space-y-4">
              {included.map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <CheckCircle size={16} className="text-black flex-shrink-0" />
                  <span className="text-black/80 text-sm">{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 border border-black/10 rounded-xl p-4">
              <p className="text-xs text-black/40 leading-relaxed">
                After payment you&apos;ll create your account and get instant access.
                {' Cancel any time from your account settings — no questions asked.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-black/10 py-6 mt-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-black/30">
          <span>© 2026 Loophole Media Inc. All rights reserved.</span>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-black transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-black transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
