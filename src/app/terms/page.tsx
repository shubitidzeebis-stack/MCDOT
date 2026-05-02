import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SITE, formatAddressOneLine } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: `Terms of use for the ${SITE.name} website — eligibility, accuracy of submissions, intellectual property, disclaimers, limitation of liability, indemnification, governing law, and arbitration.`,
  alternates: { canonical: "/terms" },
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  const address = formatAddressOneLine();
  return (
    <>
      <Header locale="en" />
      <main id="main" className="relative pt-16">
        <section className="bg-[#0a0a0b] py-20 md:py-28">
          <div className="mx-auto max-w-[820px] px-5 md:px-6">
            <p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.42em] text-[#ff8a1a] md:text-[11px]">
              Legal
            </p>
            <h1 className="text-[2rem] font-semibold leading-[1.05] tracking-[-0.035em] text-white sm:text-4xl md:text-5xl">
              Terms of Use
            </h1>
            <p className="mt-3 text-sm text-white/40">
              Effective date: {SITE.legal.lastUpdated}
            </p>

            <div className="blog-body mt-10">
              <p>
                These Terms of Use (&ldquo;Terms&rdquo;) govern your access to and use of the
                website operated by {SITE.legalName} (&ldquo;{SITE.name},&rdquo; &ldquo;we,&rdquo;
                &ldquo;us,&rdquo; or &ldquo;our&rdquo;), located at the domain on which these
                Terms are hosted (the &ldquo;Site&rdquo;). By accessing or using the Site, or
                submitting any information through it, you agree to be bound by these Terms
                and by our{" "}
                <Link href="/privacy" className="text-[#ffb371] hover:text-[#ff8a1a]">
                  Privacy Policy
                </Link>
                . If you do not agree to these Terms, do not use the Site.
              </p>
              <p>
                <strong>
                  Please read Section 13 carefully. It contains a binding arbitration agreement
                  and a class-action waiver that affect your legal rights.
                </strong>
              </p>

              <h2>1. Eligibility</h2>
              <p>
                You must be at least 18 years old to use the Site. By submitting information
                about a logistics LLC or other business through the Site, you represent and
                warrant that (a) you are at least 18 years old; (b) you are an owner, member,
                manager, or duly authorized representative of the LLC or business you are
                describing; (c) you have the legal authority to share the information you
                submit; and (d) the information you submit is accurate and complete to the
                best of your knowledge.
              </p>

              <h2>2. The Site and our services</h2>
              <p>
                The Site provides general information about {SITE.name}&rsquo;s acquisition
                business and a means for prospective sellers to enquire about a potential
                transaction. {SITE.name} is not a broker, broker-dealer, investment adviser,
                financial planner, lawyer, accountant, tax adviser, or insurance agent.
                Nothing on the Site constitutes investment, legal, tax, accounting, or
                financial advice. You should consult your own qualified advisers before making
                any decision regarding the sale of your LLC or any other business.
              </p>

              <h2>3. No offer; no securities</h2>
              <p>
                Nothing on the Site is, or should be construed as, an offer to buy or sell any
                LLC, security, asset, or interest. Any actual purchase or sale will be governed
                solely by a separate written purchase agreement signed by both parties.
                Pricing examples, valuation discussions, and timeline references on the Site
                are illustrative and non-binding.
              </p>

              <h2>4. Submissions you make</h2>
              <p>
                <strong>Accuracy.</strong> When you submit information through any form on the
                Site, you confirm that the information is accurate, complete, and not
                misleading to the best of your knowledge. You will promptly correct any
                information that becomes inaccurate.
              </p>
              <p>
                <strong>License to your submissions.</strong> You grant {SITE.legalName} a
                worldwide, non-exclusive, royalty-free, perpetual, irrevocable license to use,
                store, reproduce, and process the information you submit solely for the
                purposes described in our{" "}
                <Link href="/privacy" className="text-[#ffb371] hover:text-[#ff8a1a]">
                  Privacy Policy
                </Link>
                , including evaluating your enquiry, communicating with you, performing
                diligence, completing a transaction, and complying with our legal obligations.
                You retain all other rights in your information.
              </p>
              <p>
                <strong>No confidential information without an NDA.</strong> Unless we have
                signed a written non-disclosure agreement with you, do not submit information
                you consider confidential or proprietary. We will treat your enquiry
                confidentially as described in our Privacy Policy, but absent a signed NDA we
                make no contractual confidentiality commitment beyond that policy.
              </p>

              <h2>5. Acceptable use</h2>
              <p>
                You agree not to do any of the following while using the Site:
              </p>
              <ul>
                <li>Submit information that is false, misleading, or fraudulent;</li>
                <li>Submit information about a business you do not have authority to represent;</li>
                <li>
                  Use the Site to transmit malware, viruses, or other harmful code, or to
                  interfere with the Site&rsquo;s normal operation;
                </li>
                <li>
                  Scrape, harvest, or systematically extract data from the Site, including by
                  use of bots, crawlers, or other automated means, except as expressly
                  permitted by our robots.txt file or with our prior written consent;
                </li>
                <li>
                  Attempt to gain unauthorized access to any portion of the Site or to any
                  systems or networks connected to the Site;
                </li>
                <li>
                  Reverse engineer, decompile, or disassemble any portion of the Site, except
                  as permitted by applicable law notwithstanding this restriction;
                </li>
                <li>
                  Use the Site in any manner that violates any applicable federal, state,
                  local, or international law or regulation, or to engage in conduct that
                  restricts or inhibits any other party&rsquo;s use of the Site.
                </li>
              </ul>

              <h2>6. Intellectual property</h2>
              <p>
                The Site and its contents — including text, graphics, logos, images,
                photographs, audio and video, page layouts, design, source code, and the
                selection and arrangement thereof — are owned by {SITE.legalName} or our
                licensors and are protected by United States and international copyright,
                trademark, and other intellectual-property laws. The {SITE.name} name and
                logo are trademarks of {SITE.legalName}. We grant you a limited, revocable,
                non-exclusive, non-transferable license to access and use the Site for your
                personal, non-commercial purposes consistent with these Terms. All other
                rights are reserved.
              </p>

              <h2>7. Privacy</h2>
              <p>
                Our collection, use, and sharing of personal information is described in our{" "}
                <Link href="/privacy" className="text-[#ffb371] hover:text-[#ff8a1a]">
                  Privacy Policy
                </Link>
                , which is incorporated into these Terms by reference.
              </p>

              <h2>8. Electronic communications and signatures</h2>
              <p>
                By providing your email address, phone number, or other contact information
                through the Site, you consent to receive electronic communications from us at
                those contact points, including transactional confirmations, follow-up
                messages, and (if you provide consent) marketing communications. You agree
                that all agreements, notices, disclosures, and other communications we provide
                electronically satisfy any legal requirement that such communications be in
                writing. Where applicable, you agree that an electronic signature, including
                clicking a &ldquo;Submit&rdquo; button or typing your name, has the same legal
                effect as a handwritten signature under the federal Electronic Signatures in
                Global and National Commerce Act (E-SIGN) and applicable state laws.
              </p>

              <h2>9. Disclaimers</h2>
              <p>
                THE SITE AND ALL CONTENT, MATERIALS, AND SERVICES MADE AVAILABLE THROUGH IT
                ARE PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT
                WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. TO THE MAXIMUM EXTENT
                PERMITTED BY APPLICABLE LAW, {SITE.legalName.toUpperCase()} DISCLAIMS ALL
                WARRANTIES, INCLUDING THE IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
                PARTICULAR PURPOSE, NON-INFRINGEMENT, AND ANY WARRANTIES ARISING OUT OF COURSE
                OF DEALING OR USAGE OF TRADE.
              </p>
              <p>
                We do not warrant that the Site will be uninterrupted, secure, or error-free,
                that defects will be corrected, or that the Site or its servers are free of
                viruses or other harmful components. We do not warrant the accuracy,
                completeness, or timeliness of any information available through the Site.
              </p>

              <h2>10. Limitation of liability</h2>
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT WILL{" "}
                {SITE.legalName.toUpperCase()}, ITS AFFILIATES, OFFICERS, DIRECTORS,
                EMPLOYEES, AGENTS, OR LICENSORS BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
                SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR FOR ANY LOSS OF
                PROFITS, REVENUES, DATA, BUSINESS OPPORTUNITY, OR GOODWILL, ARISING OUT OF OR
                RELATING TO YOUR USE OF THE SITE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH
                DAMAGES.
              </p>
              <p>
                IN ALL CASES, OUR AGGREGATE LIABILITY ARISING OUT OF OR RELATING TO THESE
                TERMS OR YOUR USE OF THE SITE IS LIMITED TO THE GREATER OF (A) THE AMOUNT YOU
                PAID US TO USE THE SITE (WHICH WILL TYPICALLY BE ZERO) OR (B) ONE HUNDRED US
                DOLLARS (US $100). Some jurisdictions do not allow the exclusion or limitation
                of certain damages, so some of the above limitations may not apply to you.
              </p>

              <h2>11. Indemnification</h2>
              <p>
                You agree to defend, indemnify, and hold harmless {SITE.legalName} and our
                affiliates, officers, directors, employees, agents, and licensors from and
                against any claims, liabilities, damages, judgments, awards, losses, costs,
                expenses, and fees (including reasonable attorneys&rsquo; fees) arising out of
                or relating to (a) your breach of these Terms; (b) your submission of
                inaccurate, false, or misleading information through the Site; (c) your
                violation of any third-party right, including intellectual property or privacy
                rights; or (d) your violation of any applicable law.
              </p>

              <h2>12. Termination</h2>
              <p>
                We may suspend or terminate your access to the Site at any time, with or
                without notice, for any reason, including if we believe you have violated
                these Terms. The provisions of these Terms that by their nature should survive
                termination — including Sections 4, 6, 9, 10, 11, 12, 13, and 14 — will so
                survive.
              </p>

              <h2 id="arbitration">13. Governing law and dispute resolution</h2>
              <p>
                <strong>Governing law.</strong> These Terms and any dispute arising out of or
                relating to them or your use of the Site are governed by the laws of the State
                of {SITE.legal.governingState}, USA, without regard to its conflict-of-laws
                principles, and by applicable federal law.
              </p>
              <p>
                <strong>Informal resolution first.</strong> Before filing any claim against
                us, you agree to try in good faith to resolve the dispute informally by
                contacting us at{" "}
                <a href={`mailto:${SITE.email}`}>{SITE.email}</a>. We will try in good faith to
                resolve the dispute. If we cannot resolve it within 60 days, either of us may
                bring a formal proceeding subject to the rules below.
              </p>
              <p>
                <strong>Binding arbitration.</strong> Except for claims that may be brought in
                small-claims court and except for claims for injunctive or equitable relief
                related to intellectual property or unauthorized access to the Site, any
                dispute, claim, or controversy arising out of or relating to these Terms or
                your use of the Site will be resolved exclusively by binding individual
                arbitration administered by JAMS or the American Arbitration Association under
                their then-current consumer rules. The arbitration will be held in the State
                of {SITE.legal.governingState} or, at your election, by telephone or video
                conference. The arbitrator&rsquo;s decision is final and may be entered as a
                judgment in any court of competent jurisdiction. The Federal Arbitration Act
                governs the interpretation and enforcement of this arbitration agreement.
              </p>
              <p>
                <strong>Class-action waiver.</strong> You and we agree that any dispute will
                be resolved on an individual basis only. You and we waive the right to bring,
                or participate in, any class, collective, or representative action, including
                under any private-attorney-general statute. If a court determines that this
                class-action waiver is unenforceable as to any claim, that claim must be
                severed from the arbitration and brought in court, and all other claims will
                be arbitrated.
              </p>
              <p>
                <strong>Opt-out of arbitration.</strong> You may opt out of this arbitration
                agreement by mailing a written opt-out notice to us at the address in Section
                14 within 30 days after you first use the Site. The notice must include your
                full name, address, and a clear statement that you wish to opt out of the
                arbitration agreement.
              </p>
              <p>
                <strong>Exclusive venue if arbitration does not apply.</strong> Where
                arbitration does not apply, you and we agree that the exclusive venue for any
                action will be the state or federal courts located in{" "}
                {SITE.legal.governingState}, and we both consent to the personal jurisdiction
                of those courts.
              </p>

              <h2>14. Miscellaneous</h2>
              <p>
                <strong>Entire agreement.</strong> These Terms, together with our Privacy
                Policy and any other agreements we sign with you in writing, constitute the
                entire agreement between you and {SITE.legalName} concerning the Site and
                supersede all prior or contemporaneous communications.
              </p>
              <p>
                <strong>Severability.</strong> If any provision of these Terms is held
                unenforceable, that provision will be enforced to the maximum extent
                permissible and the remaining provisions will remain in full force and effect.
              </p>
              <p>
                <strong>No waiver.</strong> Our failure to enforce any right or provision of
                these Terms is not a waiver of that right or provision.
              </p>
              <p>
                <strong>Assignment.</strong> You may not assign or transfer these Terms or any
                rights under them without our prior written consent. We may assign these Terms
                without notice to you, including in connection with a merger, acquisition, or
                sale of assets.
              </p>
              <p>
                <strong>Force majeure.</strong> We are not liable for any failure or delay in
                performance caused by events beyond our reasonable control, including acts of
                God, natural disasters, war, terrorism, civil unrest, labor disputes,
                pandemics, government action, internet or utility outages, or third-party
                service failures.
              </p>
              <p>
                <strong>Third-party links and services.</strong> The Site may contain links to
                third-party websites or services we do not control. We are not responsible for
                the content, accuracy, or practices of those services.
              </p>
              <p>
                <strong>Changes to these Terms.</strong> We may update these Terms from time
                to time. When we make material changes we will update the &ldquo;Effective
                date&rdquo; at the top and, where appropriate, provide additional notice. Your
                continued use of the Site after changes take effect constitutes acceptance of
                the updated Terms.
              </p>
              <p>
                <strong>Contact.</strong> Questions about these Terms can be sent to{" "}
                <a href={`mailto:${SITE.email}`}>{SITE.email}</a> or by mail to:{" "}
                {SITE.legalName}, {address}.
              </p>
            </div>

            <p className="mt-12 text-xs text-white/40">
              Need our{" "}
              <Link href="/privacy" className="text-[#ffb371] hover:text-[#ff8a1a]">
                Privacy Policy
              </Link>
              ?
            </p>
          </div>
        </section>
      </main>
      <Footer locale="en" />
    </>
  );
}
