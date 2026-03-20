'use client';

import Link from 'next/link';
import { ArrowRight, FileText, Zap, Users, CheckCircle, ChevronRight, Lock, Shield, Eye, Server } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-black">
      {/* Header */}
      <header className="border-b border-black/10 sticky top-0 z-50 bg-white/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <FileText size={16} className="text-white" />
            </div>
            <span className="font-bold text-xl text-black">PaperworkSlayer</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-black/60">
            <a href="#features" className="hover:text-black transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-black transition-colors">How it works</a>
            <a href="#security" className="hover:text-black transition-colors">Security</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-black/60 hover:text-black font-medium transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/subscribe"
              className="text-sm bg-black text-white px-4 py-2 rounded-lg font-medium hover:bg-black/80 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-28 text-center">
        <h1 className="text-5xl md:text-7xl font-black text-black tracking-tight mb-6 leading-tight">
          Kill the paperwork.<br />
          <span className="border-b-4 border-black">Keep the clients.</span>
        </h1>
        <p className="text-xl text-black/50 max-w-2xl mx-auto mb-10 leading-relaxed">
          Upload client documents, let PaperworkSlayer extract every field automatically,
          then populate any template — contracts, forms, reports — in seconds.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link
            href="/subscribe"
            className="flex items-center gap-2 bg-black text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-black/80 transition-all group"
          >
            Get Started
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <a
            href="#how-it-works"
            className="flex items-center gap-2 border border-black/20 text-black/70 px-8 py-4 rounded-xl font-semibold text-lg hover:border-black hover:text-black transition-colors"
          >
            See how it works
          </a>
        </div>

        {/* Hero UI mock */}
        <div className="mt-16 bg-black/[0.03] rounded-2xl border border-black/10 p-8 max-w-4xl mx-auto">
          <div className="flex gap-4">
            {/* Sidebar mock */}
            <div className="w-48 bg-black rounded-xl p-3 flex flex-col gap-2">
              <div className="w-24 h-4 bg-white/20 rounded" />
              <div className="mt-2 space-y-1.5">
                {['Clients', 'Templates', 'Generate'].map((item) => (
                  <div key={item} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/10">
                    <div className="w-3 h-3 bg-white/40 rounded" />
                    <span className="text-white/60 text-xs">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Main content mock */}
            <div className="flex-1 space-y-3">
              <div className="bg-white rounded-xl border border-black/10 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-20 h-3 bg-black/10 rounded" />
                  <div className="w-16 h-3 bg-black/5 rounded" />
                </div>
                <div className="space-y-2">
                  {[0.7, 0.5, 0.6, 0.4].map((w, i) => (
                    <div key={i} className="flex gap-2">
                      <div className="w-16 h-2 bg-black/10 rounded" />
                      <div className="h-2 bg-black/5 rounded" style={{ width: `${w * 100}%` }} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {['Name', 'Email', 'Company'].map((field) => (
                  <div key={field} className="bg-white rounded-lg border border-black/10 p-3">
                    <div className="text-xs text-black/40 mb-1">{field}</div>
                    <div className="h-2 bg-black/10 rounded w-4/5" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="bg-black text-white py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">How it works</h2>
            <p className="text-white/50 text-lg">Three steps to eliminate document busywork</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                icon: Users,
                title: 'Upload client documents',
                desc: 'Import PDFs or Word documents from your clients. PaperworkSlayer automatically extracts names, addresses, dates, and every other field.',
              },
              {
                step: '02',
                icon: Zap,
                title: 'Smart field detection',
                desc: 'Our intelligent parser identifies and maps all fields with visual bounding boxes you can adjust, confirm, and label.',
              },
              {
                step: '03',
                icon: FileText,
                title: 'Generate filled templates',
                desc: 'Select any template, match client fields to placeholders, and download a perfectly filled document instantly.',
              },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="border border-white/10 rounded-2xl p-7 hover:border-white/30 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-4xl font-black text-white/10">{step}</span>
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                    <Icon size={20} className="text-white/70" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-2">{title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-black mb-3">Everything you need</h2>
            <p className="text-black/50 text-lg">Purpose-built for document-heavy workflows</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: 'PDF & Word Support', desc: 'Process both PDF and DOCX files natively — no conversion needed.' },
              { title: 'Visual Field Editor', desc: 'Drag and resize detection boxes directly on the document.' },
              { title: 'Smart Auto-Detection', desc: 'Pattern recognition identifies labels, values, and form fields automatically.' },
              { title: 'Client Management', desc: 'Organize all client documents in a single, searchable workspace.' },
              { title: 'Template Library', desc: 'Build a reusable library of contracts, forms, and reports.' },
              { title: 'Instant Generation', desc: 'Produce a filled, ready-to-send document in under a second.' },
            ].map(({ title, desc }) => (
              <div key={title} className="flex items-start gap-3 p-5 rounded-xl border border-black/10 hover:border-black/30 hover:bg-black/[0.02] transition-colors">
                <CheckCircle size={18} className="text-black flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-black text-sm mb-0.5">{title}</h4>
                  <p className="text-black/50 text-sm">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="security" className="py-24 bg-black/[0.02]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-black mb-3">Your clients&apos; data stays private</h2>
            <p className="text-black/50 text-lg max-w-2xl mx-auto">
              PaperworkSlayer is built on enterprise-grade infrastructure used by thousands of businesses worldwide.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {[
              {
                icon: Lock,
                title: 'Encrypted in transit',
                desc: 'All data sent between you and PaperworkSlayer is protected by TLS encryption — the same standard used by banks.',
              },
              {
                icon: Eye,
                title: 'Strict data isolation',
                desc: 'Your documents and client data are invisible to every other user. Row-level security enforces this at the database level — not just the application.',
              },
              {
                icon: Shield,
                title: 'SOC 2 certified infrastructure',
                desc: 'Built on Supabase and Vercel — both independently audited and SOC 2 certified. Your data lives in infrastructure that meets enterprise compliance standards.',
              },
              {
                icon: Server,
                title: 'Private file storage',
                desc: 'Uploaded documents are stored in a private, access-controlled storage system. Files are never publicly accessible — only you can retrieve them.',
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-4 p-6 rounded-2xl border border-black/10 bg-white">
                <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-black mb-1">{title}</h3>
                  <p className="text-black/50 text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="border border-black/10 rounded-2xl p-6 bg-white text-center max-w-2xl mx-auto">
            <p className="text-black/60 text-sm leading-relaxed">
              PaperworkSlayer does not sell, share, or use your clients&apos; data for any purpose other than providing the service.
              Your documents are yours — we have no access to their contents.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-black text-white py-24">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-black mb-4 leading-tight">Ready to slay the paperwork?</h2>
          <p className="text-white/50 text-lg mb-10">
            Unlimited documents, clients, and templates. One simple plan.
          </p>
          <Link
            href="/subscribe"
            className="inline-flex items-center gap-2 bg-white text-black px-10 py-4 rounded-xl font-bold text-lg hover:bg-white/90 transition-all group"
          >
            Get Started
            <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <p className="text-white/30 text-sm mt-4">Cancel anytime.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-black/10 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-black/40">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-black rounded flex items-center justify-center">
              <FileText size={12} className="text-white" />
            </div>
            <span className="font-semibold text-black">PaperworkSlayer</span>
          </div>
          <p>© 2026 Loophole Media Inc. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-black transition-colors">Privacy</a>
            <a href="#" className="hover:text-black transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
