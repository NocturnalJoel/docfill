'use client';

import Link from 'next/link';
import { CheckCircle, Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function SuccessForm() {
  const searchParams = useSearchParams();
  const session_id = searchParams.get('session_id') ?? '';
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id, email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.');
        setIsLoading(false);
        return;
      }

      // Auto sign in after account creation
      const supabase = createClient();
      await supabase.auth.signInWithPassword({ email, password });
      router.push('/dashboard/clients');
    } catch {
      setError('Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };

  if (!session_id) {
    return (
      <div className="text-center">
        <p className="text-black/50 mb-4">No payment session found.</p>
        <Link href="/subscribe" className="text-black font-medium hover:underline">
          Subscribe to get started
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md w-full">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={28} className="text-white" />
        </div>
        <h1 className="text-3xl font-black text-black mb-2">Payment confirmed.</h1>
        <p className="text-black/50">Create your account to start slaying paperwork.</p>
      </div>

      <div className="bg-white rounded-2xl border border-black/10 shadow-sm p-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg p-3 flex items-start gap-2">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
              <span>
                {error}{' '}
                {error.includes('already exists') && (
                  <Link href="/login" className="font-semibold underline">Sign in instead</Link>
                )}
              </span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-black mb-1.5">Email address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-2.5 rounded-lg border border-black/20 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
            <p className="text-xs text-black/30 mt-1">Use the email you paid with.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className="w-full px-4 py-2.5 pr-10 rounded-lg border border-black/20 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 hover:text-black"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-black text-white py-3 rounded-xl font-semibold hover:bg-black/80 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
          >
            {isLoading ? <><Loader2 size={16} className="animate-spin" /> Creating account...</> : 'Create Account & Sign In'}
          </button>
        </form>
      </div>

      <p className="text-center text-xs text-black/30 mt-6">
        Already have an account?{' '}
        <Link href="/login" className="hover:underline hover:text-black/50">Sign in</Link>
      </p>
    </div>
  );
}

export default function SubscribeSuccessPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-black/10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <Link href="/" className="flex items-center gap-2 w-fit">
            <img src="/logo.png" alt="PaperworkSlayer" className="w-8 h-8 rounded-lg" />
            <span className="font-bold text-xl text-black">PaperworkSlayer</span>
          </Link>
        </div>
      </header>
      <div className="flex-1 flex items-center justify-center p-6">
        <Suspense fallback={<Loader2 size={24} className="animate-spin text-black/30" />}>
          <SuccessForm />
        </Suspense>
      </div>
    </div>
  );
}
