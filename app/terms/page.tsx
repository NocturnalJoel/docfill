import Link from 'next/link';

export default function TermsPage() {
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
        <h1 className="text-4xl font-black mb-2">Terms of Service</h1>
        <p className="text-black/40 text-sm mb-12">Last updated: March 20, 2026</p>

        <div className="prose prose-sm max-w-none space-y-10 text-black/80 leading-relaxed">

          <section>
            <h2 className="text-lg font-bold text-black mb-3">1. Agreement to Terms</h2>
            <p>
              By accessing or using PaperworkSlayer (the &quot;Service&quot;), operated by Loophole Media Inc. (&quot;Company&quot;, &quot;we&quot;, &quot;us&quot;),
              you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-black mb-3">2. The Service</h2>
            <p>
              PaperworkSlayer is a document automation platform that allows subscribers to upload document templates,
              store client information, and automatically generate filled documents. We reserve the right to modify,
              suspend, or discontinue any part of the Service at any time with reasonable notice.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-black mb-3">3. Eligibility</h2>
            <p>
              You must be at least 18 years old and capable of entering a binding contract to use this Service.
              By using PaperworkSlayer, you represent that you meet these requirements.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-black mb-3">4. Accounts</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials and for all activity
              that occurs under your account. Notify us immediately through the PaperworkSlayer website if
              you believe your account has been compromised.
            </p>
            <p className="mt-3">
              You may not share your account with others or create accounts on behalf of someone else without their authorization.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-black mb-3">5. Subscriptions and Billing</h2>
            <p>
              PaperworkSlayer is offered on a subscription basis. By subscribing, you authorize us (via Stripe) to charge
              your payment method on a recurring basis at the rate you selected — either monthly or annually.
            </p>
            <p className="mt-3">
              <span className="font-medium text-black">Cancellation:</span> You may cancel your subscription at any time.
              Your access will continue until the end of the current billing period. We do not offer prorated refunds
              for partial billing periods.
            </p>
            <p className="mt-3">
              <span className="font-medium text-black">Price changes:</span> We will provide at least 30 days notice before
              changing subscription prices. Continued use after the notice period constitutes acceptance of the new price.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-black mb-3">6. Acceptable Use</h2>
            <p>You agree not to use PaperworkSlayer to:</p>
            <ul className="space-y-2 list-disc list-inside mt-3">
              <li>Upload or process documents you do not have rights to use</li>
              <li>Store or process data in violation of applicable privacy laws (e.g., HIPAA, GDPR) without appropriate safeguards</li>
              <li>Attempt to gain unauthorized access to other users&apos; data or our systems</li>
              <li>Reverse engineer, copy, or create derivative works of the Service</li>
              <li>Use the Service for any unlawful purpose</li>
            </ul>
            <p className="mt-4">
              We reserve the right to suspend or terminate accounts that violate these terms without prior notice.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-black mb-3">7. Your Content</h2>
            <p>
              You retain ownership of all documents, templates, and client data you upload to PaperworkSlayer.
              By uploading content, you grant us a limited license to store and process it solely for the purpose of
              providing the Service to you.
            </p>
            <p className="mt-3">
              You are solely responsible for ensuring you have the right to upload and process any data, including
              client information. We are not responsible for the content of your documents.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-black mb-3">8. Privacy</h2>
            <p>
              Your use of the Service is also governed by our{' '}
              <Link href="/privacy" className="font-medium text-black underline hover:no-underline">Privacy Policy</Link>,
              which is incorporated into these Terms by reference.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-black mb-3">9. Disclaimer of Warranties</h2>
            <p>
              The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, express or implied.
              We do not warrant that the Service will be uninterrupted, error-free, or that generated documents will be
              legally valid or suitable for any particular purpose. You are responsible for reviewing all generated documents
              before use.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-black mb-3">10. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Loophole Media Inc. shall not be liable for any indirect, incidental,
              special, consequential, or punitive damages arising from your use of the Service, including but not limited to
              loss of data, loss of revenue, or errors in generated documents.
            </p>
            <p className="mt-3">
              Our total liability to you for any claim arising from these Terms or the Service shall not exceed the amount
              you paid us in the 12 months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-black mb-3">11. Indemnification</h2>
            <p>
              You agree to indemnify and hold harmless Loophole Media Inc. and its officers, directors, and employees
              from any claims, damages, or expenses (including legal fees) arising from your use of the Service,
              your content, or your violation of these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-black mb-3">12. Governing Law</h2>
            <p>
              These Terms are governed by the laws of the province of Quebec, Canada, without regard to conflict of law principles.
              Any disputes shall be resolved in the courts of Quebec.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-black mb-3">13. Changes to Terms</h2>
            <p>
              We may update these Terms from time to time. We will notify you by email of material changes at least 14 days
              before they take effect. Continued use of the Service after changes are effective constitutes your acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-black mb-3">14. Contact</h2>
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
          <Link href="/privacy" className="hover:text-black transition-colors">Privacy Policy</Link>
        </div>
      </footer>
    </div>
  );
}
