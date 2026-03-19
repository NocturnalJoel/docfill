'use client';

import Link from 'next/link';
import { ArrowRight, FileText, Zap, Users, CheckCircle, Star, ChevronRight } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 sticky top-0 z-50 bg-white/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <FileText size={16} className="text-white" />
            </div>
            <span className="font-bold text-xl text-gray-900">DocFill</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-gray-600">
            <a href="#features" className="hover:text-gray-900 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-gray-900 transition-colors">Pricing</a>
            <a href="#how-it-works" className="hover:text-gray-900 transition-colors">How it works</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/login"
              className="text-sm bg-blue-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-600 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1.5 rounded-full mb-6 border border-blue-100">
          <Star size={12} />
          Trusted by 500+ businesses
        </div>
        <h1 className="text-5xl md:text-7xl font-bold text-gray-900 tracking-tight mb-6 leading-tight">
          Fill documents with<br />
          <span className="text-blue-500">client data automatically</span>
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          Upload client documents, let DocFill extract all their information, then instantly
          populate any template — contracts, forms, reports — in seconds.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link
            href="/login"
            className="flex items-center gap-2 bg-blue-500 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-blue-600 transition-all hover:shadow-lg hover:shadow-blue-200 group"
          >
            Try Demo
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <a
            href="#how-it-works"
            className="flex items-center gap-2 bg-gray-100 text-gray-700 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-200 transition-colors"
          >
            See how it works
          </a>
        </div>

        {/* Hero image placeholder */}
        <div className="mt-16 bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl border border-gray-200 p-8 max-w-4xl mx-auto">
          <div className="flex gap-4">
            {/* Sidebar mock */}
            <div className="w-48 bg-[#1e2130] rounded-xl p-3 flex flex-col gap-2">
              <div className="w-24 h-4 bg-white/20 rounded" />
              <div className="mt-2 space-y-1.5">
                {['Clients', 'Templates', 'Generate'].map((item) => (
                  <div key={item} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/10">
                    <div className="w-3 h-3 bg-blue-400/60 rounded" />
                    <span className="text-white/60 text-xs">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Main content mock */}
            <div className="flex-1 space-y-3">
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-20 h-3 bg-gray-200 rounded" />
                  <div className="w-16 h-3 bg-blue-100 rounded" />
                </div>
                <div className="space-y-2">
                  {[0.7, 0.5, 0.6, 0.4].map((w, i) => (
                    <div key={i} className="flex gap-2">
                      <div className="w-16 h-2 bg-gray-100 rounded" />
                      <div className="h-2 bg-blue-50 rounded" style={{ width: `${w * 100}%` }} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {['Name', 'Email', 'Company'].map((field, i) => (
                  <div key={field} className="bg-white rounded-lg border border-gray-200 p-3">
                    <div className="text-xs text-gray-400 mb-1">{field}</div>
                    <div
                      className="h-2 rounded"
                      style={{
                        backgroundColor: ['#3B82F6', '#10B981', '#F59E0B'][i] + '40',
                        width: '80%',
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">How DocFill works</h2>
            <p className="text-gray-500 text-lg">Three steps to automate your document workflow</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                icon: Users,
                title: 'Upload client documents',
                desc: 'Import PDFs or Word documents from your clients. DocFill automatically extracts names, addresses, dates, and any other fields.',
                color: 'blue',
              },
              {
                step: '02',
                icon: Zap,
                title: 'Smart field detection',
                desc: 'Our intelligent parser identifies and maps all fields with visual bounding boxes you can adjust, confirm, and label.',
                color: 'violet',
              },
              {
                step: '03',
                icon: FileText,
                title: 'Generate filled templates',
                desc: 'Select any template, match client fields to template placeholders, and download a perfectly filled document instantly.',
                color: 'emerald',
              },
            ].map(({ step, icon: Icon, title, desc, color }) => (
              <div key={step} className="bg-white rounded-2xl border border-gray-200 p-7 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-4xl font-black text-gray-100">{step}</span>
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center`}
                    style={{ backgroundColor: color === 'blue' ? '#eff6ff' : color === 'violet' ? '#f5f3ff' : '#f0fdf4' }}
                  >
                    <Icon
                      size={20}
                      style={{ color: color === 'blue' ? '#3b82f6' : color === 'violet' ? '#8b5cf6' : '#10b981' }}
                    />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Everything you need</h2>
            <p className="text-gray-500 text-lg">Purpose-built for document-heavy workflows</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: 'PDF & Word Support', desc: 'Process both PDF and DOCX files natively' },
              { title: 'Visual Field Editor', desc: 'Drag and resize detection boxes on the document' },
              { title: 'Smart Auto-Detection', desc: 'AI-powered pattern recognition for labels and values' },
              { title: 'Client Management', desc: 'Organize all client documents in one place' },
              { title: 'Template Library', desc: 'Store and reuse document templates' },
              { title: 'Instant Generation', desc: 'Generate filled documents in under a second' },
            ].map(({ title, desc }) => (
              <div key={title} className="flex items-start gap-3 p-5 rounded-xl border border-gray-100 hover:border-blue-100 hover:bg-blue-50/30 transition-colors">
                <CheckCircle size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm mb-0.5">{title}</h4>
                  <p className="text-gray-500 text-sm">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Simple, transparent pricing</h2>
            <p className="text-gray-500 text-lg">Start free, scale as you grow</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* Starter */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8">
              <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Starter</div>
              <div className="text-4xl font-black text-gray-900 mb-1">
                $29 <span className="text-lg font-normal text-gray-400">/mo</span>
              </div>
              <p className="text-gray-500 text-sm mb-6">Perfect for small businesses</p>
              <ul className="space-y-3 mb-8 text-sm text-gray-600">
                {['50 documents/month', '5 templates', '10 clients', 'PDF & Word support'].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-emerald-500" />
                    {f}
                  </li>
                ))}
              </ul>
              <button className="w-full py-3 rounded-xl bg-gray-100 text-gray-500 font-medium text-sm cursor-not-allowed">
                Coming Soon
              </button>
            </div>

            {/* Pro */}
            <div className="bg-blue-500 rounded-2xl p-8 text-white relative overflow-hidden">
              <div className="absolute top-4 right-4 bg-white/20 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                Popular
              </div>
              <div className="text-sm font-semibold text-blue-100 uppercase tracking-wide mb-2">Pro</div>
              <div className="text-4xl font-black mb-1">
                $99 <span className="text-lg font-normal text-blue-200">/mo</span>
              </div>
              <p className="text-blue-200 text-sm mb-6">For growing teams</p>
              <ul className="space-y-3 mb-8 text-sm text-blue-100">
                {['Unlimited documents', 'Unlimited templates', 'Unlimited clients', 'Priority support', 'API access'].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-blue-200" />
                    {f}
                  </li>
                ))}
              </ul>
              <button className="w-full py-3 rounded-xl bg-white/20 text-white font-medium text-sm cursor-not-allowed">
                Coming Soon
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to automate your documents?</h2>
          <p className="text-gray-500 text-lg mb-8">No credit card required. Start filling documents in minutes.</p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-blue-500 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-blue-600 transition-all hover:shadow-lg hover:shadow-blue-200 group"
          >
            Try DocFill Free
            <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center">
              <FileText size={12} className="text-white" />
            </div>
            <span className="font-semibold text-gray-600">DocFill</span>
          </div>
          <p>© 2026 DocFill. Built for businesses.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-gray-600 transition-colors">Privacy</a>
            <a href="#" className="hover:text-gray-600 transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
