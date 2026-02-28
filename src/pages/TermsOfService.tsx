import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/layout/Header";
import { CONTACT_EMAIL } from "@/lib/constants";

const TermsOfService = () => {
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

        <h1 className="text-3xl font-display font-bold mb-2">Terms of Service</h1>
        <p className="text-muted-foreground text-sm mb-10">
          Last updated: February 2026
        </p>

        <article className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Introduction and Definitions</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">
              These Terms of Service (&quot;Terms&quot;) govern your use of Clasly (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;), a web-based
              platform for creating and delivering interactive presentations and lectures. Key terms:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
              <li><strong>Service</strong> – The Clasly application, website, and related features.</li>
              <li><strong>User / Customer</strong> – Anyone who creates an account or uses the Service to build or present.</li>
              <li><strong>Audience / Participant</strong> – Individuals who join a live lecture (e.g. via QR or link) to answer quizzes, polls, or other interactive elements.</li>
              <li><strong>Presentations / Lectures</strong> – Slide decks and sessions you create and run on Clasly.</li>
              <li><strong>AI Builder</strong> – The conversational interface where you describe what you want and we generate slides using AI.</li>
              <li><strong>Credits (AI tokens)</strong> – Units consumed when using AI to generate or edit slides; amounts depend on your plan.</li>
              <li><strong>Plans</strong> – Free, Standard, and Pro subscription tiers with different limits and features.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Acceptance and Eligibility</h2>
            <p className="text-muted-foreground leading-relaxed">
              By creating an account, using the AI Builder, or otherwise accessing the Service, you agree to these
              Terms. If you do not agree, do not use the Service. You must be at least 13 years old (or the age of
              consent in your jurisdiction) to use Clasly. If you use the Service on behalf of an organization, you
              represent that you have authority to bind that organization to these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Description of the Service</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">
              Clasly lets you create interactive presentations and run live sessions where your audience can respond
              to quizzes, polls, word clouds, scales, and other activities in real time. You can build slides manually
              or use the AI Builder to generate content from a text prompt. Features and limits (including AI token
              allowances and slide types) vary by plan. We may add, change, or discontinue features with reasonable
              notice; we will not materially reduce core functionality during your active subscription period without
              notice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Account and Registration</h2>
            <p className="text-muted-foreground leading-relaxed">
              You register via email or Google sign-in. One account per person; you may not share credentials or
              allow others to use your account. You are responsible for all activity under your account and for
              keeping your login details secure. You must provide accurate information and notify us promptly of
              any unauthorized access.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Acceptable Use</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">
              You will use the Service only in compliance with applicable laws and these Terms. You agree not to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
              <li>Use the Service for harassment, fraud, or any illegal purpose</li>
              <li>Infringe intellectual property or other rights of others</li>
              <li>Upload malware, malicious code, or content that harms others</li>
              <li>Misuse audience or participant data collected through your lectures</li>
              <li>Attempt to gain unauthorized access to our systems or other users&apos; accounts</li>
              <li>Scrape, reverse-engineer, or resell the Service beyond permitted use</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-2">
              We may suspend or terminate your account and access if you breach these Terms or if we reasonably
              believe your use poses a risk to us or others.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. User Content and Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              You keep ownership of the presentations, slides, images, and text you create or upload. By using the
              Service, you grant us a limited, non-exclusive, royalty-free license to store, process, and display
              your content solely to provide and improve the Service. We do not use your content to train
              third-party AI models. Clasly&apos;s platform, design, code, and branding remain our intellectual property;
              you do not obtain any rights to them except the right to use the Service under these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Plans, Credits, and Payment</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">
              We offer Free, Standard, and Pro plans. The Free plan includes a limited number of AI tokens; paid
              plans include higher token allowances and additional features. Payment for paid plans is processed
              via PayPal; you are billed in advance for the chosen period. Fees are non-refundable except where
              required by law or as we explicitly state (e.g. statutory cooling-off periods). You may cancel at any
              time; cancellation takes effect at the end of the current billing period. We may change prices with
              at least 30 days&apos; notice; continued use after the change constitutes acceptance. If you purchase
              credits or upgrade mid-cycle, we may prorate charges as described at the time of purchase.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Service Availability and Modifications</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service is provided &quot;as is&quot; and &quot;as available&quot;. We strive for high availability but do not
              guarantee uninterrupted access. We may perform maintenance, updates, or discontinue features with
              reasonable notice where practicable. We are not liable for downtime, data loss, or issues caused by
              your device, network, or third-party services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Disclaimers</h2>
            <p className="text-muted-foreground leading-relaxed">
              WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A
              PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE
              ERROR-FREE, SECURE, OR THAT AI-GENERATED OUTPUT WILL BE ACCURATE OR SUITABLE FOR YOUR USE.
              YOU ARE RESPONSIBLE FOR REVIEWING AND VERIFYING ALL CONTENT BEFORE USING IT IN A LECTURE OR
              PRESENTATION. WE ARE NOT LIABLE FOR HOW YOU OR YOUR AUDIENCE USE THE SERVICE OR FOR ANY
              CONTENT YOU OR PARTICIPANTS SUBMIT.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE AND OUR AFFILIATES SHALL NOT BE LIABLE FOR ANY
              INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR LOSS OF PROFITS, DATA, OR
              GOODWILL. OUR TOTAL AGGREGATE LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE TWELVE
              MONTHS PRECEDING THE CLAIM (OR TEN USD IF YOU PAID NOTHING). THESE LIMITS APPLY EVEN IF WE HAVE
              BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. SOME JURISDICTIONS DO NOT ALLOW CERTAIN
              LIMITATIONS; IN SUCH CASES OUR LIABILITY IS LIMITED TO THE MAXIMUM EXTENT PERMITTED BY LAW.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Indemnification</h2>
            <p className="text-muted-foreground leading-relaxed">
              You agree to indemnify, defend, and hold harmless Clasly and its officers, directors, employees,
              and agents from and against any claims, damages, losses, liabilities, and expenses (including
              reasonable legal fees) arising from your use of the Service, your content, your lectures or
              audience data practices, or your violation of these Terms or applicable law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">12. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              You may stop using the Service at any time; you may also request account deletion by contacting us.
              We may suspend or terminate your account for breach of these Terms or for any other reason with or
              without notice. Upon termination, your right to access the Service ends. We may retain your data as
              required by law or our Privacy Policy. Sections that by their nature should survive (including
              intellectual property, disclaimers, limitation of liability, indemnification, and governing law)
              will remain in effect after termination.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">13. Governing Law and Disputes</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms are governed by the laws of the State of Israel, without regard to conflict of law
              principles. Before bringing a formal claim, you agree to try to resolve the dispute informally by
              contacting us at {CONTACT_EMAIL}. If the dispute is not resolved within a reasonable time, any
              legal action shall be brought in the courts of Israel. If any provision is held unenforceable, the
              remaining provisions remain in full force and effect.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">14. Changes to the Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update these Terms from time to time. The current version will be posted on the Service with
              an updated &quot;Last updated&quot; date. For material changes we may notify you by email or a prominent
              notice in the Service. Your continued use after the effective date of the changes constitutes
              acceptance. If you do not agree, you must stop using the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">15. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions about these Terms, contact us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </section>
        </article>

        <div className="mt-12 pt-8 border-t border-border">
          <Link to="/privacy" className="text-primary hover:underline text-sm">
            Privacy Policy
          </Link>
        </div>
      </main>
    </div>
  );
};

export default TermsOfService;
