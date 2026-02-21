import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/layout/Header";

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
              Clasly (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) respects your privacy. This policy explains what data we
              collect, how we use it, and your rights. By using our Service, you consent to the practices
              described here.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Data We Collect</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">
              We collect:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
              <li>
                <strong>Account data:</strong> Email, name, profile photo (when you sign in with Google or email)
              </li>
              <li>
                <strong>Content:</strong> Presentations, slides, images you upload, chat messages in the AI builder
              </li>
              <li>
                <strong>Usage data:</strong> Pages visited, features used, session duration (via Microsoft Clarity)
              </li>
              <li>
                <strong>Technical data:</strong> IP address, browser type, device info, cookies
              </li>
              <li>
                <strong>Payment data:</strong> Processed by PayPal; we do not store card numbers
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. How We Use Your Data</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">
              We use your data to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
              <li>Provide, maintain, and improve the Service</li>
              <li>Process your presentations and AI requests</li>
              <li>Authenticate you and manage your account</li>
              <li>Process payments and manage subscriptions</li>
              <li>Send service-related notifications (e.g., password reset)</li>
              <li>Analyze usage to improve the product (Clarity, analytics)</li>
              <li>Comply with legal obligations and prevent fraud</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Data Storage and Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your data is stored on Supabase (database, storage, authentication) and our app is hosted on
              Vercel. We use industry-standard security measures including encryption in transit (HTTPS) and
              at rest. Access is restricted to authorized personnel. We retain your data for as long as your
              account is active or as needed for legal purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Third-Party Services</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">
              We use:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
              <li>
                <strong>Supabase:</strong> Database, authentication, file storage – subject to their privacy policy
              </li>
              <li>
                <strong>Vercel:</strong> Hosting – subject to their privacy policy
              </li>
              <li>
                <strong>Google:</strong> OAuth sign-in – subject to Google&apos;s privacy policy
              </li>
              <li>
                <strong>PayPal:</strong> Payment processing – subject to PayPal&apos;s privacy policy
              </li>
              <li>
                <strong>Microsoft Clarity:</strong> Session recording and heatmaps to improve UX – subject to Microsoft&apos;s privacy policy
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use essential cookies for authentication and session management. Third-party services
              (Clarity, analytics) may set their own cookies. You can control cookies through your browser
              settings; disabling some may affect Service functionality.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Data Sharing</h2>
            <p className="text-muted-foreground leading-relaxed">
              We do not sell your personal data. We may share data with service providers (hosting, payment,
              analytics) who assist in operating the Service under contractual obligations. We may disclose
              data if required by law, to protect our rights, or in connection with a merger or sale.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">
              Depending on your location, you may have the right to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Request correction of inaccurate data</li>
              <li><strong>Deletion:</strong> Request deletion of your data</li>
              <li><strong>Portability:</strong> Receive your data in a structured format</li>
              <li><strong>Object/Restrict:</strong> Object to processing or request restriction</li>
              <li><strong>Withdraw consent:</strong> Where processing is based on consent</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-2">
              To exercise these rights, contact us at{" "}
              <a href="mailto:hello@clasly.app" className="text-primary hover:underline">
                hello@clasly.app
              </a>
              . EU/EEA users may lodge a complaint with their data protection authority.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Children</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service is not intended for children under 13. We do not knowingly collect data from
              children. If you believe we have collected data from a child, please contact us to request deletion.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. International Transfers</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your data may be transferred to and processed in countries other than your own. We ensure
              appropriate safeguards (e.g., standard contractual clauses) for such transfers as required
              by applicable law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Changes</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this policy from time to time. We will notify you of material changes via
              email or a prominent notice in the Service. Continued use after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">12. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              For privacy-related questions or to exercise your rights, contact us at{" "}
              <a href="mailto:hello@clasly.app" className="text-primary hover:underline">
                hello@clasly.app
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
