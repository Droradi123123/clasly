import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/layout/Header";

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
            <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using Clasly (&quot;Service&quot;), you agree to be bound by these Terms of Service.
              If you do not agree, do not use the Service. We reserve the right to modify these terms at any time;
              continued use constitutes acceptance of changes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              Clasly provides an AI-powered platform for creating interactive presentations and lectures.
              We offer free and paid tiers with different features and limits. We may change, suspend, or
              discontinue any part of the Service with reasonable notice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Account and Eligibility</h2>
            <p className="text-muted-foreground leading-relaxed">
              You must be at least 13 years old (or the age of consent in your jurisdiction) to use the Service.
              You are responsible for maintaining the confidentiality of your account and for all activities
              under your account. You must provide accurate information and notify us of any unauthorized use.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Acceptable Use</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">
              You agree not to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe on intellectual property rights of others</li>
              <li>Upload malicious code, malware, or harmful content</li>
              <li>Use the Service for harassment, fraud, or illegal activities</li>
              <li>Attempt to gain unauthorized access to our systems or other accounts</li>
              <li>Scrape, copy, or reverse-engineer the Service without permission</li>
              <li>Resell or commercially exploit the Service beyond permitted use</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. User Content and Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              You retain ownership of content you create. By uploading or creating content, you grant us a
              limited, non-exclusive license to store, process, and display it for the purpose of providing
              the Service. We do not claim ownership of your presentations, images, or text. Our platform,
              design, and technology remain our intellectual property.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Payment and Refunds</h2>
            <p className="text-muted-foreground leading-relaxed">
              Paid plans are billed in advance. Fees are non-refundable except as required by law or as
              explicitly stated in our refund policy. You may cancel at any time; cancellation takes effect
              at the end of the billing period. We may change pricing with at least 30 days&apos; notice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Disclaimer of Warranties</h2>
            <p className="text-muted-foreground leading-relaxed">
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND,
              EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY,
              FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE
              WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE AND OUR AFFILIATES SHALL NOT BE LIABLE FOR ANY
              INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS,
              DATA, OR GOODWILL. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE
              TWELVE MONTHS PRECEDING THE CLAIM.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Indemnification</h2>
            <p className="text-muted-foreground leading-relaxed">
              You agree to indemnify, defend, and hold harmless Clasly and its officers, directors,
              employees, and agents from and against any claims, damages, losses, liabilities, and expenses
              (including legal fees) arising from your use of the Service, your content, or your violation
              of these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may suspend or terminate your account at any time for violation of these Terms or for
              any other reason. You may terminate by ceasing use and deleting your account. Upon termination,
              your right to use the Service ceases. Provisions that by their nature should survive (including
              intellectual property, disclaimers, limitation of liability, and indemnification) will survive.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Governing Law and Disputes</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms are governed by the laws of the State of Israel, without regard to conflict of
              law principles. Any disputes shall be resolved in the courts of Israel. If any provision is
              found unenforceable, the remaining provisions remain in effect.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">12. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions about these Terms, contact us at{" "}
              <a href="mailto:hello@clasly.app" className="text-primary hover:underline">
                hello@clasly.app
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
