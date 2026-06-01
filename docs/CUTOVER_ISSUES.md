# Known and Potential Cutover Issues

## Known Issues

- `/policies/terms-of-service` is not a real Shopify policy route until the policy is created in Shopify Admin or via authenticated Admin API.
- Theme fallbacks can display content for missing page/policy URLs, but they do not change the underlying HTTP status if Shopify has no content record.
- The local environment previously lacked stored Shopify Admin app authentication, so page and policy records could not be created programmatically.
- Shopify theme editor changes may overwrite JSON template files. Pull live changes before editing if Admin edits occurred.
- Custom snippets referenced from JSON custom-liquid blocks can appear as orphaned snippet warnings in Shopify Theme Check.

## Potential Cutover Risks

- Missing 301 redirects from legacy URLs can reduce organic traffic and create customer confusion.
- Imported products may have inconsistent tags, fitment names, SKUs, images, variant availability, or descriptions.
- Search & Discovery filters can fail if tag names, collections, and Shopify filter settings drift.
- International checkout may fail customer expectations if markets, currencies, shipping zones, taxes, and duties are not configured together.
- Payment method changes can affect conversion if accelerated checkout, cards, PayPal, Shop Pay, or wallet options are not tested end to end.
- Empty Shopify page/blog records can override otherwise good fallback content once records exist but contain blank content.
- Theme assets and large product images can slow collection pages if image dimensions or lazy loading are changed.
- Third-party apps can inject CSS or JavaScript that affects product cards, filters, cart, or localization.

## Cutover Checklist

- Create Shopify policies: Terms of Service, Privacy, Refund, Shipping.
- Create Shopify pages: FAQ, Testimonials, Submit Testimonial, About, Contact.
- Add redirects for legacy page, blog, and product URLs.
- Confirm all header/footer/nav links return 200 status.
- Confirm `/collections`, `/collections/all`, and vehicle/system collection paths return useful results.
- Confirm shipping rates for USA, U.S. territories, Canada, Mexico, Europe, and Australia.
- Confirm currency display and checkout currency behavior by market.
- Confirm Google Search Console sitemap submission and canonical URLs.
- Confirm product feed, merchant center, and analytics events after launch.
