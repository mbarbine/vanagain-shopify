# Editing and Publishing

## Editing Rules

- Prefer existing theme sections, snippets, and settings before adding new abstractions.
- Keep user-facing catalog links pointed at tag collection routes such as `/collections/all/68-79-bus?filter.v.availability=1#ResultsList`; do not reintroduce unreliable `filter.p.tag` query links.
- Keep the all-parts filter panel collapsible so products are visible quickly after filtering.
- Keep product cards readable at mobile, tablet, and desktop widths. Buttons must show complete text.
- Avoid hardcoded fake counts. Product counts should come from Shopify objects or be omitted.
- Keep missing-content fallbacks honest. Do not claim a Shopify page or policy exists if it does not.

## Common Edits

### Product Card Styling

Edit `assets/vanagain-overrides.css`.

Key selectors:

- `body.template-collection .vanagain-collection-results--grid`
- `body.template-collection .vanagain-collection-results--compact`
- `body.template-collection .vanagain-card-actions`
- `body.template-collection .vanagain-card-fitments`

### All Parts Page

Edit:

- `sections/main-collection.liquid`
- `snippets/vanagain-catalog-filters.liquid`
- `templates/collection*.json`

The alternate collection templates power the `view=grid-24`, `view=grid-48`, `view=grid-100`, `view=compact-24`, `view=compact-48`, and `view=compact-100` variants.

### Collections Hub

Edit:

- `sections/vanagain-collections-hub.liquid`
- `templates/list-collections.json`
- `assets/vanagain-overrides.css`

### Contact Page

Edit:

- `sections/vanagain-contact.liquid`
- `templates/page.contact.json`

### SEO, Social Cards, Breadcrumbs, JSON-LD

Edit:

- `snippets/meta-tags.liquid`
- `snippets/vanagain-json-ld.liquid`
- `snippets/vanagain-breadcrumbs.liquid`
- `snippets/vanagain-social-share.liquid`

## Validation Before Publishing

```bash
npm test
npm run theme:check
git diff --check
```

Theme check currently reports existing warnings in upstream theme files and two custom snippets referenced from JSON custom-liquid blocks. It should have zero errors.

## Publish Live

```bash
npm run theme:push:live
```

After publishing, smoke test:

- `/`
- `/collections`
- `/collections/all?filter.v.availability=1#ResultsList`
- `/collections/all/68-79-bus?filter.v.availability=1#ResultsList`
- `/pages/contact`
- `/pages/testimonials`
- `/pages/faq`
- `/blogs/news/the-truth-about-coolant-and-the-vanagon-cooling-system`

## Pulling Live Changes

If the theme was edited in Shopify Admin, pull before local edits:

```bash
npm run theme:pull:live
```

Review pulled diffs carefully because JSON templates can be overwritten by the theme editor.
