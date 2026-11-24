import Handlebars from "handlebars";
import QRCode from "qrcode";

import { guestScriptVersion } from "@/lib/guest-script";

import { cssVars, rewriteAssets, themeParts } from "./render";
import type { LoadedTemplate, WeddingData } from "./types";

const esc = Handlebars.Utils.escapeExpression;
const LANG = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/;

export type GiftSide = { side: "bride" | "groom"; host: string; wish: string | null; upi_id: string; payee_name: string; link: string };
export type GiftData = { mode: "link" | "private"; sides: GiftSide[] };

async function card(s: GiftSide): Promise<string> {
  // The QR code is drawn here, so no outside service ever sees the UPI ID.
  const qr = await QRCode.toDataURL(s.link, { margin: 1, width: 240, errorCorrectionLevel: "M" });
  return `<section class="gift__card" aria-labelledby="gift-${esc(s.side)}">
  <h2 id="gift-${esc(s.side)}">${esc(s.host)}'s side</h2>
  ${s.wish ? `<p class="gift__wish">${esc(s.wish)}</p>` : ""}
  <img class="gift__qr" src="${esc(qr)}" alt="QR code to pay ${esc(s.payee_name)}" width="200" height="200">
  <p class="muted gift__who">Pays ${esc(s.payee_name)}. You choose the amount in your UPI app.</p>
  <a class="btn gift__open" href="${esc(s.link)}">Open my UPI app</a>
  <p class="gift__id"><span class="muted">UPI ID</span> <code>${esc(s.upi_id)}</code></p>
  <button type="button" class="gift__copy" data-copy="${esc(s.upi_id)}" hidden>Copy UPI ID</button>
</section>`;
}

/** The gift page: the hosts' UPI details, no amounts asked, and an optional "I sent a gift" note. Looks like the invitation. */
export async function renderGiftPage(template: LoadedTemplate, data: WeddingData, gift: GiftData, options: { origin: string }): Promise<string> {
  const { manifest } = template;
  const { preset, pair, fontLinks } = themeParts(template, data);
  const title = `Gifts · ${data.bride_name} & ${data.groom_name}`;
  const lang = LANG.test(data.languages[0] ?? "") ? data.languages[0] : "en";
  const back = `/w/${encodeURIComponent(data.slug)}`;
  const cards = await Promise.all(gift.sides.map(card));
  const config = JSON.stringify({ slug: data.slug, sides: gift.sides.map((s) => ({ side: s.side, host: s.host })) });

  const body = gift.sides.length
    ? `${cards.join("\n")}
<section class="gift__note" aria-labelledby="gift-note-title">
  <h2 id="gift-note-title">Tell the hosts you sent one</h2>
  <p class="muted">Optional. It is only a note. The hosts check their own account.</p>
  <div data-slot="gift-note" data-config="${esc(config)}"></div>
</section>`
    : `<p class="gift__empty">The hosts have not added gift details yet.</p>`;

  return `<!doctype html>
<html lang="${esc(lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="robots" content="noindex">
<meta name="color-scheme" content="light">
<meta name="theme-color" content="${esc(preset.vars["--color-primary"] ?? "#ffffff")}">
<link rel="canonical" href="${esc(`${options.origin.replace(/\/$/, "")}/w/${encodeURIComponent(data.slug)}/gift`)}">
${fontLinks}
<style>:root{color-scheme:light;${cssVars(preset.vars)}${cssVars(pair.vars)}}
${rewriteAssets(manifest.id, template.css)}</style>
</head>
<body data-wedding="${esc(data.slug)}" data-template="${esc(manifest.id)}">
<main class="giftpage block">
  <div class="wrap">
    <p class="gift__back"><a href="${esc(back)}">Back to the invitation</a></p>
    <h1 class="gift__title">Gifts</h1>
    <p class="muted gift__intro">Nothing is expected. If you would like to send one, you can do it here.</p>
    ${body}
  </div>
</main>
${gift.sides.length ? `<script src="/guest/gift.js?v=${guestScriptVersion("gift")}" defer></script>` : ""}
</body>
</html>
`;
}
