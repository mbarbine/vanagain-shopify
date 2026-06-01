# VanAgain Shopify Theme

Shopify theme for VanAgain, a specialty ecommerce store for VW Vanagon, VW Bus, and Eurovan parts. The theme focuses on fast product discovery by fitment, system/category, stock status, SKU, and support content.

## Current Live Theme

- Store: `van-again.myshopify.com`
- Live theme id: `162678505728`
- Live theme name: `VanAgain catalog parity 2026-05-22`
- Primary catalog route: `/collections/all`

## What This Theme Owns

- Storefront layout, navigation, breadcrumbs, JSON-LD, Open Graph/Twitter metadata, footer, product cards, and collection browsing UX.
- Custom catalog shortcuts for vehicle year ranges and part systems.
- Fallback content for migrated pages and legacy blog articles when Shopify content records are blank.
- Local validation tests for theme structure, migrated content, required snippets, social metadata, and key user-facing routes.

## Repository Layout

- `assets/vanagain-overrides.css`: VanAgain visual system, responsive UI, collection/product/page overrides.
- `sections/`: Shopify sections, including VanAgain custom contact and collections hub sections.
- `snippets/`: Shared Liquid snippets for breadcrumbs, JSON-LD, product card actions, fallbacks, and social share links.
- `templates/`: Shopify JSON templates for home, product, collection, blog, article, page, and collection view variants.
- `csv-export/`: Source export files used to reconcile migrated product, blog, and testimonial content.
- `scripts/validate-shopify-artifacts.mjs`: Local artifact and content validation.
- `docs/`: Operator documentation, testing, roadmap, cutover issues, and growth recommendations.

## Quick Start

```bash
cd /Users/bwm.barbinewarnermichael/Documents/github/vanagain-shopify
npm test
npm run theme:check
```

The validation script uses only Node built-ins. Shopify commands require the Shopify CLI and a valid store/theme session.

## Publishing

```bash
npm run theme:push:live
```

This pushes to the current live theme. Use it only after `npm test` and `npm run theme:check` pass.

## Important Shopify Admin Gap

Theme code can style and fallback-render missing pages, but it cannot create Shopify Admin records such as policies, pages, redirects, menus, markets, shipping zones, tax settings, products, variants, or app configuration without Admin API/store authentication. The missing `/policies/terms-of-service` policy must be created in Shopify Admin or via authenticated Admin API before it can become a true policy route.

## Documentation

- [Editing and Publishing](docs/EDITING_AND_PUBLISHING.md)
- [Testing](docs/TESTING.md)
- [Roadmap](docs/ROADMAP.md)
- [Cutover Issues](docs/CUTOVER_ISSUES.md)
- [Ecommerce Growth Recommendations](docs/ECOMMERCE_GROWTH_RECOMMENDATIONS.md)
- [Internationalization and Markets](docs/INTERNATIONALIZATION.md)
