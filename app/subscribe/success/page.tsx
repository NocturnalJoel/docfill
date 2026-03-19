import Link from 'next/link';
import { FileText, CheckCircle } from 'lucide-react';

export default function SubscribeSuccessPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="border-b border-black/10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <Link href="/" className="flex items-center gap-2 w-fit">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <FileText size={16} className="text-white" />
            </div>
            <span className="font-bold text-xl text-black">PaperworkSlayer</span>
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-black rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={36} className="text-white" />
          </div>

          <h1 className="text-3xl font-black text-black mb-3">You&apos;re in.</h1>
          <p className="text-black/50 text-lg mb-8">
            Payment confirmed. Create your account to start slaying paperwork.
          </p>

          <Link
            href="/signup"
            className="inline-flex items-center justify-center gap-2 w-full bg-black text-white py-4 rounded-xl font-bold text-base hover:bg-black/80 transition-colors"
          >
            Create Your Account
          </Link>

          <p className="text-black/30 text-xs mt-6">
            A receipt has been sent to your email by Stripe.
          </p>
        </div>
      </div>
    </div>
  );
}
