'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FileText, Eye, EyeOff, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(authError.message);
      setIsLoading(false);
      return;
    }

    router.push('/dashboard/clients');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <img src="/logo.png" alt="PaperworkSlayer" className="w-10 h-10 rounded-xl" />
            <span className="font-bold text-2xl text-black">PaperworkSlayer</span>
          </Link>
          <h1 className="text-2xl font-bold text-black">Welcome back</h1>
          <p className="text-black/50 mt-1">Sign in to your account</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-black/10 shadow-sm p-8">
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg p-3">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-black mb-1.5">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-black/20 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 pr-10 rounded-lg border border-black/20 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                  placeholder="••••••••"
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
              className="w-full bg-black text-white py-3 rounded-lg text-sm font-semibold hover:bg-black/80 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              {isLoading && <Loader2 size={14} className="animate-spin" />}
              Sign In
            </button>
          </form>

          <p className="text-center text-sm text-black/50 mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/subscribe" className="text-black font-medium hover:underline">
              Subscribe to get started
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-black/30 mt-6">
          <Link href="/" className="hover:underline">← Back to homepage</Link>
        </p>
      </div>
    </div>
  );
}
