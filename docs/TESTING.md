# Testing

## Local Test Commands

```bash
npm test
npm run theme:check
git diff --check
```

## What `npm test` Covers

`scripts/validate-shopify-artifacts.mjs` validates:

- Required theme folders and key custom files exist.
- Shopify JSON/JSONC templates, sections, config, and locale files parse.
- Home, collection, product, article, page, contact, footer, breadcrumbs, JSON-LD, and social metadata hooks are present.
- Collection filter links use tag collection paths and jump to `#ResultsList`.
- The all-parts catalog has grid/compact layout controls and 24/48/100 page-size views.
- The `/collections` page uses the VanAgain collections hub.
- Product CSV rows have primary handles, titles, descriptions, and expected content.
- Blog CSV rows have titles, slugs, and descriptions.
- Testimonials render from the migrated testimonial snippet without duplicating generic page blocks.
- Favicon and touch icon assets have expected dimensions.

## Manual Browser Smoke Tests

Run these after every live push:

1. Home page: hero, navigation, dropdowns, footer, breadcrumbs, and JSON-LD render without Liquid errors.
2. All products: `/collections/all?filter.v.availability=1#ResultsList` lands near products, not at a heavy filter wall.
3. Layout controls: grid, compact, 24, 48, 100, and sort preserve filters and show complete card buttons.
4. Vehicle filters: `68-79 Bus`, `80-83 Air Cooled Vanagon`, and Eurovan shortcuts return product results.
5. Product page: gallery zoom control is visible, Add to Cart text is visible, social share links have canonical URLs.
6. Contact page: contact info cards are horizontal on desktop and stacked on mobile.
7. Testimonials: only the polished testimonial grid appears.
8. Footer: no PayPal donation block and no broken Terms link when Shopify policy is missing.
9. Blog fallback: legacy article bodies render when Shopify article content is blank.
10. Mobile: header, filters, product cards, buttons, forms, and footer have no clipped text.

## Recommended Future Automated Tests

- Add Playwright smoke tests against a Shopify theme preview URL.
- Add screenshot checks for mobile 390px, tablet 768px, desktop 1440px, and wide desktop.
- Add URL checks for important migrated pages and policy routes.
- Add structured-data validation using a JSON-LD parser against rendered HTML.
- Add social-card validation for product, article, collection, and home pages.
