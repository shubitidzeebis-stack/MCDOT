import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SITE, formatAddressOneLine } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${SITE.name} collects, uses, shares, and protects your personal information — including your rights under US state privacy laws (CCPA/CPRA, VCDPA, CPA, CTDPA, UCPA), TCPA consent for phone contact, and CAN-SPAM compliance for email.`,
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
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
              Privacy Policy
            </h1>
            <p className="mt-3 text-sm text-white/40">
              Effective date: {SITE.legal.lastUpdated}
            </p>

            <div className="blog-body mt-10">
              <p>
                {SITE.legalName} (&ldquo;{SITE.name},&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or
                &ldquo;our&rdquo;) is committed to protecting your privacy. This Privacy Policy
                describes the categories of personal information we collect, how we use and
                share it, the choices and rights you have, and how to contact us. By using our
                website at the domain on which this policy is hosted (the &ldquo;Site&rdquo;) or
                submitting information through our forms, you acknowledge that you have read
                and understood this Policy.
              </p>

              <h2>1. Who we are</h2>
              <p>
                {SITE.legalName} is a US-based acquirer of logistics LLCs and Amazon Relay
                carriers. We operate this Site as the controller of personal information you
                provide. Our business address is: {address}.
              </p>

              <h2>2. Information we collect</h2>
              <p>
                We collect information directly from you, automatically when you use the Site,
                and in limited cases from third parties. The categories below correspond to the
                taxonomy used by the California Consumer Privacy Act (CCPA) and similar US
                state privacy laws.
              </p>

              <h3>2.1 Information you provide</h3>
              <ul>
                <li>
                  <strong>Identifiers</strong> — your full name, email address, phone number,
                  postal address (if provided), and any account or contact identifiers you
                  share.
                </li>
                <li>
                  <strong>Commercial / business information</strong> — the LLC&rsquo;s name, MC
                  number, DOT number, insurance status, Amazon Relay status, state of
                  registration, equipment information, outstanding loan information (if you
                  disclose it), and any other details you submit about the business you wish
                  to discuss.
                </li>
                <li>
                  <strong>Communications</strong> — the content of any messages, notes, or
                  attachments you send us via the Site, email, phone, SMS, or WhatsApp.
                </li>
              </ul>

              <h3>2.2 Information collected automatically</h3>
              <ul>
                <li>
                  <strong>Internet or network activity</strong> — IP address, user agent /
                  browser type, device type, referring URL, pages viewed, timestamps, and
                  general interaction with the Site.
                </li>
                <li>
                  <strong>Approximate location</strong> — derived from IP address (country
                  and region level only).
                </li>
                <li>
                  <strong>Cookies and similar technologies</strong> — see{" "}
                  <a href="#cookies">Section 9</a>.
                </li>
              </ul>

              <h3>2.3 Information from third parties</h3>
              <p>
                We may receive information about your LLC from publicly available government
                sources (for example FMCSA SAFER for MC / DOT records). When you click on our
                ads on third-party platforms (such as Google or Meta), those platforms may share
                aggregated or hashed identifiers with us subject to their own privacy practices.
              </p>

              <h3>2.4 Sensitive personal information</h3>
              <p>
                We do not intentionally collect sensitive personal information (Social Security
                numbers, government IDs, financial-account credentials, precise geolocation,
                health information, or biometric data) through this Site. If you choose to
                include any such information in a free-text field, we will treat it confidentially
                but request that you do not submit such information through the Site.
              </p>

              <h2>3. How we use your information</h2>
              <p>We use the information we collect for the following purposes:</p>
              <ul>
                <li>To evaluate whether your LLC fits our acquisition criteria;</li>
                <li>
                  To contact you with a valuation, follow-up questions, a written offer, or
                  other communications about a potential transaction;
                </li>
                <li>
                  To negotiate, document, and (if both parties agree) close a purchase
                  transaction, including diligence, lender coordination, insurance re-binding,
                  and post-close transfer steps;
                </li>
                <li>
                  To send you related transactional and marketing communications consistent
                  with the consents you provide (see <a href="#tcpa">Section 6</a> on phone /
                  SMS and <a href="#email">Section 7</a> on email);
                </li>
                <li>
                  To operate, maintain, secure, and improve the Site, including detecting
                  abuse, fraud, and unauthorized access;
                </li>
                <li>
                  To comply with applicable law, respond to legal requests, and enforce our
                  agreements (including our Terms of Use); and
                </li>
                <li>For aggregated and de-identified analytics that do not identify you.</li>
              </ul>

              <h2>4. How we share your information</h2>
              <p>
                We do not sell your personal information for monetary value, and we do not
                share your personal information with third parties for cross-context behavioral
                advertising, except as described below. We share information only as follows:
              </p>
              <ul>
                <li>
                  <strong>Service providers / processors</strong> — we share information with
                  vendors that help us operate the business under written contracts limiting
                  their use to our instructions. These currently include: our hosting and
                  database provider (Vercel and Neon), our transactional email provider
                  (Resend), our analytics provider (Vercel Analytics), and from time to time
                  legal, accounting, and tax advisors.
                </li>
                <li>
                  <strong>Counterparties to a transaction</strong> — if you and we proceed
                  toward a closing, your information may be shared with our legal counsel,
                  insurance underwriters, lenders for loan-payoff coordination, and government
                  agencies (e.g., FMCSA) as required to consummate the transfer.
                </li>
                <li>
                  <strong>Advertising partners</strong> — if and when we run paid advertising
                  on Google, Meta, or similar platforms, those platforms may receive limited
                  conversion-event data (such as a hashed email or a page-view event)
                  consistent with the platforms&rsquo; own policies. You can opt out of
                  cross-platform tracking through your browser settings, the Network
                  Advertising Initiative (<a href="https://optout.networkadvertising.org" target="_blank" rel="noopener noreferrer">optout.networkadvertising.org</a>),
                  the Digital Advertising Alliance (<a href="https://optout.aboutads.info" target="_blank" rel="noopener noreferrer">optout.aboutads.info</a>),
                  or by contacting us directly.
                </li>
                <li>
                  <strong>Legal compliance and protection</strong> — we may disclose
                  information when required by law, subpoena, or court order, or when we
                  believe in good faith that disclosure is necessary to protect rights,
                  property, or safety.
                </li>
                <li>
                  <strong>Business transfers</strong> — if {SITE.legalName} is involved in a
                  merger, acquisition, financing, reorganization, or sale of assets, your
                  information may be transferred as part of that transaction, subject to this
                  Policy.
                </li>
              </ul>
              <p>
                <strong>Confidentiality regarding your transaction.</strong> Outside the
                channels described above, we do not disclose seller identity to drivers,
                dispatchers, brokers, factoring companies, or competitors. NDAs are available
                on request.
              </p>

              <h2>5. Data retention</h2>
              <p>
                We retain your personal information for as long as we have an active
                relationship with you and for a reasonable period thereafter to (a) complete
                or close out a potential transaction, (b) comply with our legal, accounting,
                and tax obligations, and (c) enforce our agreements and resolve disputes.
                Typical retention periods:
              </p>
              <ul>
                <li>
                  Enquiries that do not progress: deleted or anonymized within 24 months of
                  your last interaction, unless retained to comply with legal obligations.
                </li>
                <li>
                  Enquiries that progress to a transaction: retained for 7 years following
                  closing or the end of the engagement, consistent with US tax and corporate
                  recordkeeping requirements.
                </li>
                <li>
                  Server logs: retained for up to 90 days for security and anti-abuse
                  purposes.
                </li>
              </ul>
              <p>You can request earlier deletion as described in <a href="#rights">Section 8</a>.</p>

              <h2 id="tcpa">6. Phone and SMS communications (TCPA)</h2>
              <p>
                <strong>By providing your phone number on the Site, you expressly consent to
                receive calls, voicemails, text messages, and WhatsApp messages from{" "}
                {SITE.name} regarding your enquiry and a potential transaction.</strong> These
                communications may be sent using automated technology. Consent is not a
                condition of any purchase. Message and data rates may apply.
              </p>
              <p>
                <strong>How to opt out.</strong> You can opt out of phone or SMS communications
                at any time by replying STOP to a text message, telling us during a call,
                emailing <a href={`mailto:${SITE.legal.privacyEmail}`}>{SITE.legal.privacyEmail}</a>,
                or by contacting us at the address in Section 13. We honor opt-out requests
                promptly and within timeframes required by law. After opt-out we may still
                send transactional messages necessary to a transaction in progress.
              </p>

              <h2 id="email">7. Email communications (CAN-SPAM)</h2>
              <p>
                We send transactional emails (such as confirmation of your enquiry) and may
                send commercial follow-ups. Every commercial email we send identifies us as
                the sender, includes our postal address, and contains an unsubscribe link.
                Our postal address for CAN-SPAM purposes is: {address}. You may unsubscribe
                from commercial emails at any time by clicking the unsubscribe link in any
                email or by emailing{" "}
                <a href={`mailto:${SITE.legal.privacyEmail}`}>{SITE.legal.privacyEmail}</a>.
                We honor opt-out requests within 10 business days as required by federal law.
              </p>

              <h2>8. Data security</h2>
              <p>
                We use commercially reasonable administrative, technical, and physical
                safeguards designed to protect personal information from unauthorized access,
                alteration, disclosure, or destruction. These include encryption in transit
                (HTTPS / TLS), encryption at rest for our database, role-based access controls
                for authorized personnel, IP-based rate limiting on our forms, and logging.
                No method of transmission or storage is perfectly secure, however, and we
                cannot guarantee absolute security. If a security incident materially
                affecting your information occurs, we will notify you and applicable
                regulators as required by law.
              </p>

              <h2 id="rights">9. Your rights and choices</h2>

              <h3>9.1 General rights (all users)</h3>
              <p>You may at any time:</p>
              <ul>
                <li>Ask us what personal information we hold about you;</li>
                <li>Request that we correct inaccurate information;</li>
                <li>Request that we delete your information;</li>
                <li>Withdraw consent for marketing communications; and</li>
                <li>
                  Opt out of phone, SMS, email, or WhatsApp contact (see Sections 6 and 7).
                </li>
              </ul>
              <p>
                To exercise any of these rights, email{" "}
                <a href={`mailto:${SITE.legal.privacyEmail}`}>{SITE.legal.privacyEmail}</a>{" "}
                or write to us at the address in Section 13. We respond within 45 days
                (extendable by an additional 45 days where necessary, with notice).
              </p>

              <h3>9.2 California residents (CCPA / CPRA)</h3>
              <p>
                If you are a California resident, you have additional rights under the
                California Consumer Privacy Act, as amended by the California Privacy Rights
                Act:
              </p>
              <ul>
                <li>
                  <strong>Right to know.</strong> The categories and specific pieces of
                  personal information we have collected, the sources, the business purposes
                  for collection, and the categories of third parties with whom we share it.
                </li>
                <li>
                  <strong>Right to delete</strong> personal information we have collected
                  from you, subject to certain exceptions.
                </li>
                <li>
                  <strong>Right to correct</strong> inaccurate personal information we hold.
                </li>
                <li>
                  <strong>Right to opt out of sale or sharing.</strong> We do not sell or
                  share personal information for cross-context behavioral advertising. If
                  this changes, we will provide a clear opt-out method on the Site labeled
                  &ldquo;Do Not Sell or Share My Personal Information.&rdquo;
                </li>
                <li>
                  <strong>Right to limit use of sensitive personal information.</strong> We
                  do not use sensitive personal information for purposes other than those
                  permitted under CPRA.
                </li>
                <li>
                  <strong>Right to non-discrimination</strong> for exercising any of these
                  rights.
                </li>
              </ul>
              <p>
                To exercise these rights, contact us using the information in Section 13. We
                will verify your identity using information we already hold (such as your
                email and phone number on file). You may use an authorized agent to submit a
                request on your behalf, subject to our verification of the agent&rsquo;s
                authority.
              </p>

              <h3>9.3 Other US state residents</h3>
              <p>
                If you are a resident of Virginia, Colorado, Connecticut, Utah, Texas, Oregon,
                Montana, Iowa, Indiana, Tennessee, Delaware, or other US states with
                comprehensive privacy laws, you have similar rights to those described above,
                including the right to access, correct, delete, and obtain a portable copy of
                your personal information, and the right to opt out of targeted advertising,
                sale of personal information, or certain profiling. To exercise these rights,
                contact us using the information in Section 13. If we deny your request, you
                have the right to appeal that decision; instructions will be included in our
                response.
              </p>

              <h3>9.4 Visitors outside the United States</h3>
              <p>
                Our Site and services are intended for users located in the United States. If
                you access the Site from outside the US, you do so at your own initiative and
                are responsible for compliance with local laws. By using the Site you consent
                to the transfer, processing, and storage of your information in the United
                States.
              </p>

              <h2 id="cookies">10. Cookies and similar technologies</h2>
              <p>
                We use a small number of cookies and similar technologies for essential
                Site functionality, security, and anonymous analytics. Specifically:
              </p>
              <ul>
                <li>
                  <strong>Strictly necessary</strong> — used by Vercel (our hosting provider)
                  for security, fraud prevention, and load balancing.
                </li>
                <li>
                  <strong>Analytics</strong> — Vercel Analytics counts page views and
                  measures performance using a privacy-respecting approach that does not use
                  third-party cookies and does not track individuals across other sites.
                </li>
                <li>
                  <strong>Advertising</strong> — if and when we run paid advertising, we may
                  use Google Ads conversion tracking, Meta Pixel, or similar tags. When that
                  happens we will update this section and provide an in-product cookie
                  consent banner where required.
                </li>
              </ul>
              <p>
                You can control cookies through your browser settings. Disabling certain
                cookies may degrade Site functionality.
              </p>

              <h2>11. Children&rsquo;s privacy</h2>
              <p>
                The Site is not directed to children under 16 and we do not knowingly collect
                personal information from children under 16. If you believe a child has
                provided us with personal information, please contact us using the information
                in Section 13 and we will delete it.
              </p>

              <h2>12. Third-party links</h2>
              <p>
                The Site may contain links to third-party websites and services we do not
                control. This Policy does not apply to those services. We encourage you to
                review the privacy policies of any third party before submitting personal
                information.
              </p>

              <h2>13. How to contact us / updates to this Policy</h2>
              <p>
                For privacy questions or to exercise any of the rights described above:
              </p>
              <ul>
                <li>Email: <a href={`mailto:${SITE.legal.privacyEmail}`}>{SITE.legal.privacyEmail}</a></li>
                <li>Phone: <a href={`tel:${SITE.phoneTel}`}>{SITE.phoneDisplay}</a></li>
                <li>Mail: {SITE.legalName}, {address}</li>
              </ul>
              <p>
                We may update this Policy from time to time. When we make material changes
                we will update the &ldquo;Effective date&rdquo; at the top of the Policy and,
                where appropriate, provide a more prominent notice (such as an email or an
                in-product banner). Your continued use of the Site after changes take effect
                constitutes acceptance of the updated Policy.
              </p>
            </div>

            <p className="mt-12 text-xs text-white/40">
              Need our <Link href="/terms" className="text-[#ffb371] hover:text-[#ff8a1a]">Terms of Use</Link>?
            </p>
          </div>
        </section>
      </main>
      <Footer locale="en" />
    </>
  );
}
