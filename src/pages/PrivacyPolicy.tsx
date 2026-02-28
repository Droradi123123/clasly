import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/layout/Header";
import { CONTACT_EMAIL } from "@/lib/constants";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16 px-4 sm:px-6 max-w-3xl mx-auto">
        <Button variant="ghost" size="sm" asChild className="mb-8">
          <Link to="/">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Link>
        </Button>

        <h1 className="text-3xl font-display font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground text-sm mb-10">
          Last updated: February 2026
        </p>

        <article className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              Clasly (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy
              explains what personal and other data we collect when you use our website and application, create
              interactive presentations or lectures, use the AI Builder, or participate as an audience member, and
              how we use, store, and protect that data. By using the Service, you consent to the practices
              described here. If you do not agree, please do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Data We Collect</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">
              We collect the following categories of data:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
              <li>
                <strong>Account data:</strong> Email address, display name, and profile photo when you sign in
                with Google or email/password.
              </li>
              <li>
                <strong>Content:</strong> Presentations and slides you create; images you upload; messages you
                send in the AI Builder chat; and (when you run a lecture) responses and answers submitted by
                your audience participants.
              </li>
              <li>
                <strong>Usage data:</strong> Pages and features you use, session duration, and similar
                analytics, including via Microsoft Clarity (session recordings and heatmaps) to improve the
                product.
              </li>
              <li>
                <strong>Technical data:</strong> IP address, browser type, device information, and cookies or
                similar identifiers.
              </li>
              <li>
                <strong>Payment data:</strong> Payment and subscription actions are processed by PayPal. We
                do not store your full card or bank details; we receive only what is necessary to confirm
                payments and manage your plan.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. How We Use Your Data</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">
              We use your data to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
              <li>Provide, maintain, and improve the Service (e.g. creating and delivering lectures, AI slide generation)</li>
              <li>Authenticate you and manage your account and subscription</li>
              <li>Process payments and manage credits (AI tokens) and plan upgrades</li>
              <li>Send service-related communications (e.g. password reset, important notices)</li>
              <li>Analyze usage patterns to improve usability and fix issues (including via Clarity)</li>
              <li>Comply with legal obligations, enforce our Terms, and protect our rights and safety</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Legal Basis for Processing</h2>
            <p className="text-muted-foreground leading-relaxed">
              Where applicable law requires a legal basis: we process your data to perform our contract with
              you (providing the Service), based on your consent where we ask for it (e.g. optional analytics),
              for our legitimate interests (security, product improvement, fraud prevention), and to comply with
              legal obligations. You may withdraw consent where it applies without affecting the lawfulness of
              processing before withdrawal.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Data Sharing</h2>
            <p className="text-muted-foreground leading-relaxed">
              We do not sell your personal data. We share data only as needed with service providers that help
              us operate the Service (e.g. Supabase for database and auth, Vercel for hosting, Google for
              sign-in, PayPal for payments, Microsoft Clarity for analytics), under contracts that require
              them to protect your data. We may disclose data if required by law, to protect our or others&apos;
              rights or safety, or in connection with a merger, sale, or restructuring of our business.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. International Transfers</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your data may be stored and processed in countries other than your own. We ensure appropriate
              safeguards (such as standard contractual clauses or equivalent mechanisms) for such transfers as
              required by applicable data protection laws.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your data for as long as your account is active and as needed to provide the Service.
              After you delete your account or request deletion, we remove or anonymize your data within a
              reasonable period, except where we must retain it for legal, regulatory, or legitimate business
              purposes (e.g. resolving disputes, enforcing agreements).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use industry-standard measures to protect your data, including encryption in transit (HTTPS)
              and at rest where applicable, access controls, and secure infrastructure (Supabase, Vercel). No
              method of transmission or storage is completely secure; we cannot guarantee absolute security
              but we work to protect your data from unauthorized access, loss, or misuse.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use essential cookies for authentication and session management so the Service can function
              correctly. Third-party services we use (such as Microsoft Clarity) may set their own cookies for
              analytics and product improvement. You can control or block cookies through your browser
              settings; disabling certain cookies may affect the functionality of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">
              Depending on your location, you may have the right to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
              <li><strong>Access:</strong> Request a copy of the personal data we hold about you</li>
              <li><strong>Correction:</strong> Request correction of inaccurate or incomplete data</li>
              <li><strong>Deletion:</strong> Request deletion of your data, subject to legal exceptions</li>
              <li><strong>Portability:</strong> Receive your data in a structured, machine-readable format</li>
              <li><strong>Object or restrict:</strong> Object to certain processing or request restriction</li>
              <li><strong>Withdraw consent:</strong> Where we rely on consent, you may withdraw it at any time</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-2">
              To exercise these rights, contact us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
                {CONTACT_EMAIL}
              </a>
              . We will respond within the time required by applicable law. If you are in the EU/EEA or UK, you
              may also lodge a complaint with your local data protection supervisory authority.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Children</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service is not directed at children under 13. We do not knowingly collect personal data from
              children under 13. If you believe we have collected data from a child under 13, please contact
              us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
                {CONTACT_EMAIL}
              </a>{" "}
              and we will delete it promptly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">12. Changes</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. The current version will be posted on the
              Service with an updated &quot;Last updated&quot; date. For material changes we may notify you by email or
              a prominent notice in the Service. Your continued use after the effective date of the changes
              constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">13. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              For privacy-related questions or to exercise your rights, contact us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </section>
        </article>

        <div className="mt-12 pt-8 border-t border-border">
          <Link to="/terms" className="text-primary hover:underline text-sm">
            Terms of Service
          </Link>
        </div>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
