import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white text-black">
      <header className="border-b border-black/10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="PaperworkSlayer" className="w-8 h-8 rounded-lg" />
            <span className="font-bold text-lg text-black">PaperworkSlayer</span>
          </Link>
          <Link href="/" className="text-sm text-black/40 hover:text-black transition-colors">← Back to home</Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-black mb-2">Privacy Policy</h1>
        <p className="text-black/40 text-sm mb-12">Last updated: March 20, 2026</p>

        <div className="prose prose-sm max-w-none space-y-10 text-black/80 leading-relaxed">

          <section>
            <h2 className="text-lg font-bold text-black mb-3">1. Who We Are</h2>
            <p>
              PaperworkSlayer is a document automation service operated by Loophole Media Inc. (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;).
              We help professionals fill templates with client data quickly and securely.
              This Privacy Policy explains what information we collect, how we use it, and your rights regarding your data.
            </p>
            <p className="mt-3">
              If you have questions, contact us through the PaperworkSlayer website.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-black mb-3">2. Information We Collect</h2>
            <p className="font-medium text-black mb-2">Account information</p>
            <p>When you create an account, we collect your email address and a hashed password. We do not store your password in plain text.</p>

            <p className="font-medium text-black mb-2 mt-4">Documents and files</p>
            <p>
              Files you upload (client documents and templates) are stored in a private, encrypted storage bucket. They are only
              accessible to your account and are never shared with other users or third parties.
            </p>

            <p className="font-medium text-black mb-2 mt-4">Client data</p>
            <p>
              Information you enter about your clients (names, emails, companies, and field values extracted from documents)
              is stored in your private database and is only accessible to your account.
            </p>

            <p className="font-medium text-black mb-2 mt-4">Billing information</p>
            <p>
              We use Stripe to process payments. We never see or store your credit card number.
              Stripe handles all payment data under their own privacy policy and PCI-DSS compliance program.
            </p>

            <p className="font-medium text-black mb-2 mt-4">Usage data</p>
            <p>
              We may collect basic usage information such as pages visited and features used, to improve the product.
              This data is anonymized and not linked to your identity.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-black mb-3">3. How We Use Your Information</h2>
            <ul className="space-y-2 list-disc list-inside">
              <li>To provide and operate the PaperworkSlayer service</li>
              <li>To authenticate your account and keep it secure</li>
              <li>To process subscription payments via Stripe</li>
              <li>To respond to support requests</li>
              <li>To improve the product based on anonymized usage patterns</li>
            </ul>
            <p className="mt-4">We do not sell your data. We do not use your data for advertising.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-black mb-3">4. Data Storage and Security</h2>
            <p>
              Your data is stored on Supabase infrastructure, which is SOC 2 Type II compliant and encrypts data at rest and in transit.
              File uploads are stored in private buckets with access restricted by row-level security policies — only your account
              can read or write your files.
            </p>
            <p className="mt-3">
              We use HTTPS for all data transmission. Authentication tokens are managed via secure, HTTP-only cookies.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-black mb-3">5. Data Retention</h2>
            <p>
              We retain your data for as long as your account is active. If you cancel your subscription and delete your account,
              we will delete your files and client data within 30 days. Billing records may be retained longer as required by law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-black mb-3">6. Third-Party Services</h2>
            <p>We use the following third-party services to operate PaperworkSlayer:</p>
            <ul className="space-y-2 list-disc list-inside mt-3">
              <li><span className="font-medium text-black">Supabase</span> — database, file storage, and authentication</li>
              <li><span className="font-medium text-black">Stripe</span> — payment processing</li>
              <li><span className="font-medium text-black">Vercel</span> — application hosting</li>
            </ul>
            <p className="mt-3">Each of these providers has their own privacy policy and security practices.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-black mb-3">7. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="space-y-2 list-disc list-inside mt-3">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your account and all associated data</li>
              <li>Export your data in a portable format</li>
            </ul>
            <p className="mt-4">To exercise any of these rights, contact us through the PaperworkSlayer website.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-black mb-3">8. Cookies</h2>
            <p>
              We use a single session cookie to keep you logged in. We do not use tracking cookies or advertising cookies.
              You can clear cookies at any time through your browser settings, which will log you out.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-black mb-3">9. Changes to This Policy</h2>
            <p>
              We may update this policy from time to time. If we make material changes, we will notify you by email.
              Continued use of PaperworkSlayer after changes are posted constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-black mb-3">10. Contact</h2>
            <p>
              Loophole Media Inc.<br />
              Website: paperworkslayer.com
            </p>
          </section>
        </div>
      </div>

      <footer className="border-t border-black/10 py-6 mt-8">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-between text-xs text-black/30">
          <span>© 2026 Loophole Media Inc.</span>
          <Link href="/terms" className="hover:text-black transition-colors">Terms of Service</Link>
        </div>
      </footer>
    </div>
  );
}
