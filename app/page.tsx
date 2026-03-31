'use client';

import Link from 'next/link';
import { ArrowRight, FileText, Zap, Users, CheckCircle, ChevronRight, Lock, Shield, Eye, Server, ChevronLeft } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-black">
      {/* Header */}
      <header className="border-b border-black/10 sticky top-0 z-50 bg-white/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="PaperworkSlayer" className="w-8 h-8 rounded-lg" />
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
              href="/try"
              className="text-sm border border-black/20 text-black/70 px-4 py-2 rounded-lg font-medium hover:border-black hover:text-black transition-colors"
            >
              Try Free
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
          <span className="border-b-4 border-black">Fill docs in seconds, not hours.</span>
        </h1>
        <p className="text-xl text-black/50 max-w-2xl mx-auto mb-10 leading-relaxed">
          Stop retyping the same client info into every contract, form, and report.
          PaperworkSlayer reads your documents and fills your templates — instantly.
          No AI. No hallucinations. Just your data, mapped perfectly.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link
            href="/subscribe"
            className="flex items-center gap-2 bg-black text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-black/80 transition-all group"
          >
            Get Started
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="/try"
            className="flex items-center gap-2 border border-black/20 text-black/70 px-8 py-4 rounded-xl font-semibold text-lg hover:border-black hover:text-black transition-colors"
          >
            Try it free
          </Link>
        </div>

        {/* Hero preview */}
        <div className="mt-16 max-w-4xl mx-auto rounded-2xl overflow-hidden border border-black/10 shadow-lg">
          <img src="/screenshots/hero-preview.png" alt="PaperworkSlayer in action" className="w-full" />
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="bg-black text-white py-24 overflow-hidden">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-3xl font-bold mb-3">How it works</h2>
            <p className="text-white/50 text-lg">Three steps. No copy-pasting.</p>
          </div>
          <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/10">
            {[
              {
                step: '01',
                icon: Users,
                title: 'Read your client documents',
                desc: 'Drop in a PDF or Word doc. PaperworkSlayer detects every name, address, date, and field automatically — no guessing. See every field highlighted on the document and adjust, rename, or confirm with a click. What you see is what gets used.',
              },
              {
                step: '02',
                icon: Zap,
                title: 'Map your templates',
                desc: 'Upload your own contracts, forms, or reports exactly as they are. PaperworkSlayer detects every blank field and placeholder in your template, just like it does for client documents. Review the detected fields, tweak any placements, and confirm the mapping.',
              },
              {
                step: '03',
                icon: FileText,
                title: 'Generate a filled document',
                desc: 'Pick a client, pick their source document, pick your template. PaperworkSlayer matches every client field to the right placeholder in your template and produces a clean, filled document — ready to download and send in seconds. Unlimited generations on every plan.',
              },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="flex flex-col px-10 py-8 md:py-0 first:pl-0 last:pr-0">
                <span className="text-[7rem] font-black leading-none text-white/20 select-none mb-4">{step}</span>
                <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center mb-6">
                  <Icon size={22} className="text-white" />
                </div>
                <h3 className="text-lg font-bold mb-3">{title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Screenshots */}
      <ScreenshotCarousel />

      {/* Features */}
      <section id="features" className="py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-black mb-3">Everything you need</h2>
            <p className="text-black/50 text-lg">Built for people who spend too much time on paperwork.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-x-20 gap-y-12">
            {[
              { icon: FileText, title: 'PDF & Word Support', desc: 'Works with PDFs and Word docs out of the box. No converting, no reformatting.' },
              { icon: Eye, title: 'Visual Field Editor', desc: 'See exactly what was detected on any document — client or template. Drag and resize fields directly on the page.' },
              { icon: Zap, title: 'Smart Auto-Detection', desc: 'Finds names, dates, addresses, and blank fields automatically — on both client documents and your own templates. No AI involved. Pattern matching only.' },
              { icon: Users, title: 'Client Management', desc: "Every client's documents in one place. Search, filter, done." },
              { icon: Server, title: 'Template Library', desc: 'Upload your contracts, forms, and reports once. Reuse them for every client, forever.' },
              { icon: ArrowRight, title: 'Instant Generation', desc: 'Match a client doc to a template and download a filled document in under a second. Unlimited generations on every plan.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-5">
                <div className="w-11 h-11 rounded-xl bg-black flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon size={18} className="text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-black mb-1">{title}</h4>
                  <p className="text-black/50 text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="security" className="py-24 bg-black text-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-3">Your clients&apos; data never leaves your control.</h2>
            <p className="text-white/50 text-lg max-w-2xl mx-auto">
              Bank-level encryption. Row-level data isolation. You own every document.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 overflow-hidden mb-8">
            {[
              {
                icon: Lock,
                title: 'Encrypted end-to-end',
                desc: 'All data sent between you and PaperworkSlayer is protected by TLS encryption — the same standard used by banks.',
              },
              {
                icon: Eye,
                title: 'Your data is invisible to everyone else',
                desc: 'Your documents and client data are invisible to every other user. Row-level security enforces this at the database level — not just the application.',
              },
              {
                icon: Shield,
                title: 'Enterprise-grade infrastructure',
                desc: 'Built on Supabase and Vercel — both SOC 2 certified. Your data lives in infrastructure that meets enterprise compliance standards.',
              },
              {
                icon: Server,
                title: 'Files are never publicly accessible',
                desc: 'Uploaded documents are stored in a private, access-controlled storage system. Files are never publicly accessible — only you can retrieve them.',
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-center gap-6 px-8 py-6 border-b border-white/10 last:border-b-0 hover:bg-white/5 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Icon size={18} className="text-white" />
                </div>
                <div className="w-56 flex-shrink-0">
                  <h3 className="font-bold text-white text-sm">{title}</h3>
                </div>
                <p className="text-white/50 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          <p className="text-center text-white/30 text-sm">
            We don&apos;t sell, share, or read your clients&apos; data. Ever. Your documents are yours — we just move them for you.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-black text-white py-24">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-black mb-4 leading-tight">Your next client doc takes 30 seconds, not 30 minutes.</h2>
          <p className="text-white/50 text-lg mb-10">
            Unlimited documents. Unlimited clients. Unlimited generations. One flat price.
          </p>
          <Link
            href="/subscribe"
            className="inline-flex items-center gap-2 bg-white text-black px-10 py-4 rounded-xl font-bold text-lg hover:bg-white/90 transition-all group"
          >
            Get Started
            <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-black/10 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-black/40">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="PaperworkSlayer" className="w-6 h-6 rounded" />
            <span className="font-semibold text-black">PaperworkSlayer</span>
          </div>
          <p>© 2026 Loophole Media Inc. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-black transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-black transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

const SLIDES = [
  { src: '/screenshots/clients-fields-detected.png', alt: 'PDF with detected fields highlighted', title: 'Automatic field detection', desc: 'Every field on the document is detected and highlighted — overlaid directly on the PDF.' },
  { src: '/screenshots/clients-fields-list.png', alt: 'Extracted client fields list', title: 'All client fields extracted', desc: 'Every detected value is listed and ready to map — names, dates, addresses, and more.' },
  { src: '/screenshots/generate-step1.png', alt: 'Generate tab — Select Client step', title: 'Pick a client', desc: 'Select the client and their source document in one step.' },
  { src: '/screenshots/generate-step4-dropdown.png', alt: 'Generate tab — Map Fields with dropdown open', title: 'Map fields to your template', desc: 'Each template field is matched to the right client value. Adjust anything with a click.' },
  { src: '/screenshots/generate-step4-filled.png', alt: 'Generate tab — fields filled with client data', title: 'Ready to generate', desc: 'All fields filled. Edit any value before generating — then download in seconds.' },
];

function ScreenshotCarousel() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => setCurrent((c) => (c + 1) % SLIDES.length), []);
  const back = useCallback(() => setCurrent((c) => (c - 1 + SLIDES.length) % SLIDES.length), []);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next, paused]);

  return (
    <section className="py-24 bg-white">
      <div className="mb-12 text-center max-w-6xl mx-auto px-6">
        <h2 className="text-3xl font-bold text-black mb-3">See it in action</h2>
        <p className="text-black/50 text-lg">Real screenshots from the tool — no mockups.</p>
      </div>

      {/* Slider */}
      <div className="max-w-5xl mx-auto px-6">
        <div className="relative rounded-2xl overflow-hidden border border-black/10 shadow-sm" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
          {/* Strip of all slides */}
          <div
            className="flex"
            style={{
              width: `${SLIDES.length * 100}%`,
              transform: `translateX(-${current * (100 / SLIDES.length)}%)`,
              transition: 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {SLIDES.map((slide) => (
              <div key={slide.src} style={{ width: `${100 / SLIDES.length}%` }} className="flex-shrink-0">
                <img src={slide.src} alt={slide.alt} className="w-full h-auto block" />
              </div>
            ))}
          </div>

          {/* Prev arrow */}
          <button
            onClick={back}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 border border-black/10 shadow-md flex items-center justify-center hover:bg-black hover:text-white transition-colors z-10"
            aria-label="Previous screenshot"
          >
            <ChevronLeft size={18} />
          </button>

          {/* Next arrow */}
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 border border-black/10 shadow-md flex items-center justify-center hover:bg-black hover:text-white transition-colors z-10"
            aria-label="Next screenshot"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Caption + dots */}
      <div className="max-w-5xl mx-auto px-6 mt-6 flex items-center justify-between">
        <div>
          <p className="text-2xl font-semibold text-black">{SLIDES[current].title}</p>
          <p className="text-base text-black/50 mt-1.5">{SLIDES[current].desc}</p>
        </div>
        <div className="flex gap-2 ml-6 flex-shrink-0">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-2 h-2 rounded-full transition-colors ${i === current ? 'bg-black' : 'bg-black/20'}`}
              aria-label={`Go to screenshot ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

