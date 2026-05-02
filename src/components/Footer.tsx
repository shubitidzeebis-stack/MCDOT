import Image from "next/image";
import Link from "next/link";
import { CookiePreferencesLink } from "@/components/CookieBanner";
import { SITE } from "@/lib/site";
import { DICT, type Locale } from "@/lib/i18n";
import { listPosts } from "@/lib/posts";

// Server component — async so we can pull recent posts and surface them
// in the footer for crawl depth + internal linking. Locale comes in from
// pages.
export async function Footer({ locale = "en" as Locale }: { locale?: Locale }) {
  const t = DICT[locale];
  const year = new Date().getFullYear();
  const recentPosts = (await listPosts()).slice(0, 5);

  return (
    <footer className="relative border-t border-white/8 bg-[#0a0a0b] pb-[max(env(safe-area-inset-bottom),1rem)] pt-16 md:pt-20">
      <div className="mx-auto max-w-[1400px] px-5 md:px-6">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1.6fr]">
          <div>
            <Link href="/" className="inline-flex items-center" aria-label={`${SITE.name} — home`}>
              <Image
                src="/brand/logo-on-dark.png"
                alt={SITE.name}
                width={520}
                height={120}
                className="h-9 w-auto"
              />
            </Link>
            <p className="mt-4 max-w-[360px] text-sm leading-relaxed text-white/55">
              {t.footer.description}
            </p>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-white/40">
              Company
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link className="text-white/70 hover:text-white" href="/about">{t.nav.about}</Link></li>
              <li><Link className="text-white/70 hover:text-white" href="/how-it-works">{t.nav.howItWorks}</Link></li>
              <li><Link className="text-white/70 hover:text-white" href="/why-veritor">{t.nav.whyUs}</Link></li>
              <li><Link className="text-white/70 hover:text-white" href="/blog">{t.nav.blog}</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-white/40">
              For sellers
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link className="text-white/70 hover:text-white" href="/requirements">{t.nav.requirements}</Link></li>
              <li><Link className="text-white/70 hover:text-white" href="/faq">{t.nav.faq}</Link></li>
              <li><Link className="text-white/70 hover:text-white" href="/contact">{t.nav.contact}</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-white/40">
              Contact
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <a className="text-white/70 hover:text-white" href={`tel:${SITE.phoneTel}`}>
                  {SITE.phoneDisplay}
                </a>
              </li>
              <li>
                <a className="text-white/70 hover:text-white" href={`mailto:${SITE.email}`}>
                  {SITE.email}
                </a>
              </li>
              <li>
                <a
                  className="text-white/70 hover:text-white"
                  href={`https://wa.me/${SITE.whatsappTel}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WhatsApp
                </a>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-white/40">
              Recent insights
            </p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {recentPosts.map((p) => (
                <li key={p.slug}>
                  <Link
                    href={`/blog/${p.slug}`}
                    className="text-white/70 leading-snug hover:text-white"
                  >
                    {p.title}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/blog"
                  className="text-[#ffb371] hover:text-[#ff8a1a]"
                >
                  See all →
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-white/8 pt-6 text-xs text-white/40 md:flex-row md:items-center">
          <p>
            © {year} {SITE.legalName}. {t.footer.rights}
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link href="/privacy" className="hover:text-white/70">{t.footer.privacy}</Link>
            <Link href="/terms" className="hover:text-white/70">{t.footer.terms}</Link>
            <CookiePreferencesLink className="hover:text-white/70" />
          </div>
        </div>
      </div>
    </footer>
  );
}
