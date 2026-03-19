'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FileText, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('demo@docfill.app');
  const [password, setPassword] = useState('demo');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TODO: Replace with Supabase Auth
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 500));

    if (!email || !password) {
      setError('Please enter email and password');
      setIsLoading(false);
      return;
    }

    // Set mock session cookie
    document.cookie = `mock_session=authenticated; path=/; max-age=${60 * 60 * 24 * 7}`; // 7 days

    router.push('/dashboard/clients');
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 300));
    document.cookie = `mock_session=authenticated; path=/; max-age=${60 * 60 * 24 * 7}`;
    router.push('/dashboard/clients');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
              <FileText size={20} className="text-white" />
            </div>
            <span className="font-bold text-2xl text-gray-900">DocFill</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-gray-500 mt-1">Sign in to your account</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          {/* Demo banner */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
            <p className="text-sm text-blue-700 font-medium mb-2">Demo Mode</p>
            <p className="text-xs text-blue-600 mb-3">
              Authentication is not yet enabled. Click below to try the app with demo access.
            </p>
            <button
              onClick={handleDemoLogin}
              disabled={isLoading}
              className="w-full bg-blue-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? <Loader2 size={14} className="animate-spin" /> : null}
              Try Demo →
            </button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs text-gray-400">
              <span className="bg-white px-3">or sign in with email</span>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg p-3">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <a href="#" className="text-xs text-blue-500 hover:underline">Forgot password?</a>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 pr-10 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gray-900 text-white py-3 rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              {isLoading && <Loader2 size={14} className="animate-spin" />}
              Sign In
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don&apos;t have an account?{' '}
            <a href="#" className="text-blue-500 font-medium hover:underline">
              Sign up (coming soon)
            </a>
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          <Link href="/" className="hover:underline">← Back to homepage</Link>
        </p>
      </div>
    </div>
  );
}
