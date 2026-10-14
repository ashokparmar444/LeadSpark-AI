// Pure renderer shared by the copy editor and published site snapshot.
// Turns an AI website strategy into a standalone,
// self-contained HTML document. Every value coming from the model or from a
// scraped lead is HTML-escaped — no script tags or event handlers can survive.

export type SiteStrategy = {
  strategy?: string;
  sitemap?: string[];
  sections?: string[];
  hero_headline?: string;
  hero_subheadline?: string;
  cta?: string;
  services?: string[];
  about?: string;
  testimonials?: string[];
  faq?: { q: string; a: string }[];
  contact?: string;
  seo?: string[];
  design_direction?: string;
};

export type SiteBusiness = {
  business_name: string;
  category?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  google_rating?: number | null;
  review_count?: number | null;
  google_maps_url?: string | null;
};

const esc = (value: unknown): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** Only http(s) links are allowed through into the rendered page. */
function safeUrl(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  if (!/^https?:\/\//i.test(raw)) return null;
  return esc(raw);
}

/** Deterministic accent hue derived from the business name. */
function hueFor(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) % 360;
  return hash;
}

export function slugify(value: string): string {
  return (
    String(value ?? "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "site"
  );
}

export function renderSiteHtml(
  business: SiteBusiness,
  strategy: SiteStrategy,
  options: { canonical?: string } = {},
): string {
  const name = business.business_name || "Local business";
  const hue = hueFor(name);
  const locality = [business.city, business.state].filter(Boolean).join(", ");
  const headline = strategy.hero_headline || `${name}`;
  const sub =
    strategy.hero_subheadline ||
    `${business.category ?? "Trusted local service"}${locality ? ` in ${locality}` : ""}.`;
  const cta = strategy.cta || "Get in touch";
  const description = (strategy.strategy || sub).slice(0, 155);
  const services = (strategy.services ?? []).slice(0, 9);
  const testimonials = (strategy.testimonials ?? []).slice(0, 3);
  const faq = (strategy.faq ?? []).slice(0, 6);
  const telHref = business.phone ? String(business.phone).replace(/[^\d+]/g, "") : "";
  const maps = safeUrl(business.google_maps_url);

  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name,
    description,
    telephone: business.phone || undefined,
    email: business.email || undefined,
    address: business.address
      ? {
          "@type": "PostalAddress",
          streetAddress: business.address,
          addressLocality: business.city || undefined,
          addressRegion: business.state || undefined,
          addressCountry: business.country || undefined,
        }
      : undefined,
    aggregateRating:
      business.google_rating && business.review_count
        ? {
            "@type": "AggregateRating",
            ratingValue: business.google_rating,
            reviewCount: business.review_count,
          }
        : undefined,
  }).replace(/</g, "\\u003c");

  const section = (id: string, inner: string) => `<section id="${id}">${inner}</section>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(name)}${locality ? ` — ${esc(locality)}` : ""}</title>
<meta name="description" content="${esc(description)}" />
<meta property="og:type" content="website" />
<meta property="og:title" content="${esc(name)}" />
<meta property="og:description" content="${esc(description)}" />
<meta name="twitter:card" content="summary_large_image" />
${options.canonical ? `<link rel="canonical" href="${esc(options.canonical)}" />` : ""}
<style>
:root{--accent:hsl(${hue} 82% 46%);--accent-soft:hsl(${hue} 82% 96%);--ink:#0d1117;--muted:#5a6472;--line:#e6e9ef}
*{box-sizing:border-box}
body{margin:0;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--ink);background:#fff;line-height:1.6}
a{color:inherit}
.wrap{max-width:1080px;margin:0 auto;padding:0 24px}
header{position:sticky;top:0;background:rgba(255,255,255,.92);backdrop-filter:blur(8px);border-bottom:1px solid var(--line);z-index:10}
header .wrap{display:flex;align-items:center;justify-content:space-between;gap:16px;padding-top:16px;padding-bottom:16px}
.brand{font-weight:700;letter-spacing:-.02em}
nav a{margin-left:20px;text-decoration:none;color:var(--muted);font-size:14px}
.btn{display:inline-block;background:var(--accent);color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:600;font-size:15px}
.btn.ghost{background:var(--accent-soft);color:var(--accent)}
.hero{padding:88px 0 64px;background:linear-gradient(160deg,var(--accent-soft),#fff 70%)}
.hero h1{font-size:clamp(34px,6vw,58px);line-height:1.05;letter-spacing:-.03em;margin:0 0 18px}
.hero p{font-size:clamp(17px,2.4vw,21px);color:var(--muted);max-width:640px;margin:0 0 28px}
.rating{display:inline-flex;gap:8px;align-items:center;font-size:14px;color:var(--muted);margin-bottom:20px}
section{padding:64px 0;border-top:1px solid var(--line)}
h2{font-size:clamp(24px,3.4vw,32px);letter-spacing:-.02em;margin:0 0 24px}
.grid{display:grid;gap:18px;grid-template-columns:repeat(auto-fit,minmax(250px,1fr))}
.card{border:1px solid var(--line);border-radius:16px;padding:22px;background:#fff}
.card h3{margin:0 0 8px;font-size:17px}
.quote{border-left:3px solid var(--accent);padding-left:18px;color:var(--muted);font-style:italic}
dl{margin:0}dt{font-weight:650;margin-top:18px}dd{margin:6px 0 0;color:var(--muted)}
.cta{background:var(--ink);color:#fff;border-radius:24px;padding:48px;text-align:center;margin:64px 0}
.cta h2{margin-bottom:12px}
.cta p{color:#b9c1cc;margin:0 auto 24px;max-width:520px}
footer{padding:36px 0 56px;color:var(--muted);font-size:14px}
.contact{display:flex;flex-wrap:wrap;gap:12px 32px;color:var(--muted)}
@media(max-width:640px){nav{display:none}.cta{padding:32px 20px}}
</style>
<script type="application/ld+json">${jsonLd}</script>
</head>
<body>
<header><div class="wrap">
  <span class="brand">${esc(name)}</span>
  <nav>
    ${services.length ? '<a href="#services">Services</a>' : ""}
    ${strategy.about ? '<a href="#about">About</a>' : ""}
    ${faq.length ? '<a href="#faq">FAQ</a>' : ""}
    <a href="#contact">Contact</a>
  </nav>
</div></header>

<div class="hero"><div class="wrap">
  ${
    business.google_rating
      ? `<div class="rating">★ ${esc(business.google_rating)} · ${esc(business.review_count ?? 0)} Google reviews</div>`
      : ""
  }
  <h1>${esc(headline)}</h1>
  <p>${esc(sub)}</p>
  <a class="btn" href="#contact">${esc(cta)}</a>
  ${telHref ? ` <a class="btn ghost" href="tel:${esc(telHref)}">${esc(business.phone)}</a>` : ""}
</div></div>

<div class="wrap">
${
  services.length
    ? section(
        "services",
        `<h2>What we do</h2><div class="grid">${services
          .map((s) => `<div class="card"><h3>${esc(s)}</h3></div>`)
          .join("")}</div>`,
      )
    : ""
}
${
  strategy.about
    ? section("about", `<h2>About ${esc(name)}</h2><p style="max-width:720px;color:var(--muted)">${esc(strategy.about)}</p>`)
    : ""
}
${
  testimonials.length
    ? section(
        "reviews",
        `<h2>What clients say</h2><div class="grid">${testimonials
          .map((t) => `<div class="card"><p class="quote">${esc(t)}</p></div>`)
          .join("")}</div>`,
      )
    : ""
}
${
  faq.length
    ? section(
        "faq",
        `<h2>Frequently asked</h2><dl>${faq
          .map((f) => `<dt>${esc(f.q)}</dt><dd>${esc(f.a)}</dd>`)
          .join("")}</dl>`,
      )
    : ""
}
<div class="cta">
  <h2>${esc(cta)}</h2>
  <p>${esc(strategy.contact || `Call, email or visit ${name}${locality ? ` in ${locality}` : ""}.`)}</p>
  ${telHref ? `<a class="btn" href="tel:${esc(telHref)}">Call ${esc(business.phone)}</a>` : ""}
  ${business.email ? ` <a class="btn ghost" href="mailto:${esc(business.email)}">Email us</a>` : ""}
</div>
${section(
  "contact",
  `<h2>Find us</h2><div class="contact">
    ${business.address ? `<span>${esc(business.address)}</span>` : ""}
    ${business.phone ? `<span>${esc(business.phone)}</span>` : ""}
    ${business.email ? `<span>${esc(business.email)}</span>` : ""}
    ${maps ? `<a href="${maps}" rel="nofollow noopener" target="_blank">Google Maps</a>` : ""}
  </div>`,
)}
<footer>© ${new Date().getFullYear()} ${esc(name)}. Demo site generated by LeadPilot AI.</footer>
</div>
</body>
</html>`;
}
