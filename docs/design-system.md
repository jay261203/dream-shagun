# Design system (plan)

Decided 24 Nov 2026. The current look is a standard SaaS page: a centred headline, one red button, a card grid, white
and grey. It says nothing about invitations. Tokens are a handful of colours and one font in `web/app/globals.css`, and
the invitation templates carry their own presets in `templates/*/manifest.json`, so the product and the invitations
share nothing.

## Direction

The product should feel like the thing it makes: a well-made printed invitation, on a phone. Photographs and type lead,
not UI chrome.

- **Photographs first.** The home page shows real invitations at phone size, one per occasion type, not an abstract
  hero. Every template card is a live invitation, not a thumbnail of a flower.
- **Type with a point of view.** One expressive serif for headings (used large, with room), one plain sans for
  everything you read or tap. Templates may override both through their font pair.
- **Warm paper, not white.** A warm off-white ground, near-black ink, one accent used for the one main action on a
  screen. The accent is not red by default (red is the generic default and wedding-coded); the colour presets give each
  occasion its own.
- **Quiet motion.** Buttons step on hover and press. One entrance per page. Nothing moves because the page scrolled,
  except inside an invitation template. Reduced motion turns it all off.
- **Phone first.** Every screen is designed at 390 px wide, then widened. 48 px tap targets. The editor's phone preview
  stays beside the form on wide screens.

Decided 28 Nov 2026 (DS-35): the owner chose direction D, a mix of concepts B and C (`docs/home-concepts/`). Product
tokens: linen paper #F3F1EC, surface #E6E2D9, ink #1D2530, muted #5A6270, one harbour-blue accent #2C5877, a dark
ground #1D2530 for the close; Chivo for everything. Set in `web/app/globals.css`; templates keep their own colours.

## Token layers

Three layers, as in the design-system skill. Raw values only in the first.

1. **Primitive** (`--ref-*`): the raw palette and scale. `--ref-paper-50`, `--ref-ink-900`, `--ref-clay-500`, the type
   scale, the spacing scale (4 px base), radii, shadows, durations.
2. **Semantic** (`--color-*`, `--space-*`, `--font-*`): what a value is for. `--color-bg`, `--color-surface`,
   `--color-ink`, `--color-muted`, `--color-line`, `--color-primary`, `--color-on-primary`, `--color-danger`,
   `--font-heading`, `--font-body`. **The invitation templates already use these names**, so a template preset only has
   to set the semantic layer, and the product UI and a template can share one set of component styles.
3. **Component** (`--button-*`, `--field-*`, `--card-*`): decisions for one component, defined once and used by the
   product screens and by the guest form (`rsvp.js`).

Rules: no raw hex or pixel value in a component; the semantic layer is the only thing a theme or a template changes;
the product's own theme and an occasion's template presets are the same shape.

## Components to build once

Button (primary, line, text), field (text, textarea, date, time), segmented choice, chip, stepper, card, status pill,
notice (ok, error), modal-free confirm row, section header, empty state, phone frame (preview), page shell. Today each
screen restyles these by hand with long utility strings; they become small React components with one definition.

## What changes in the repo

- `web/app/globals.css`: the three layers; Tailwind 4 `@theme` reads the semantic layer.
- `web/components/ui/*`: the components above.
- `web/lib/brand.ts`: product name, tagline, footer line, in one place.
- `web/lib/occasions.ts`: occasion types and their wording (see `docs/brand.md`).
- `templates/*/manifest.json`: presets keep the same semantic names; new occasion templates are added as data.
- Home, gallery, template page, login, create, dashboard, editor, publish: rebuilt on the components.
- The guest invitation: stays template-driven; the reply form reads the same component tokens.

## Order of work

1. Brand file, occasion types, tokens and components (no visible change yet).
2. Home, gallery and "try it" flow with real example invitations.
3. Create, dashboard and editor on the components.
4. Occasion-specific templates (birthday, baby shower, anniversary, corporate), each a data folder.
5. Global: time zone per invitation, currency-neutral gifts, translations (see `PROJECT.md`).
