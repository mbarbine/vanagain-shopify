# Internationalization and Markets

## Current Theme Support

- The theme uses Shopify locale files in `locales/`.
- The header and mobile drawer can render Shopify localization selectors when multiple countries or languages are enabled.
- SEO metadata includes the current locale and market/currency signals.
- Organization JSON-LD declares primary service regions: United States, U.S. territories, Canada, Mexico, Europe, and Australia.

## Shopify Admin Requirements

Theme code does not configure Markets, currencies, tax, duties, or shipping rates. Configure these in Shopify Admin:

- Markets: USA, U.S. territories, Canada, Mexico, Europe, Australia, and any additional supported destinations.
- Currencies: confirm whether checkout uses local currency or USD by market.
- Languages: enable and review translated storefront languages before exposing language selectors.
- Duties and taxes: decide whether international duties are collected at checkout or paid by the customer on delivery.
- Shipping: confirm live rates and packaging logic by destination.

## Content Recommendations

- Add market-aware FAQ copy for Canada, Mexico, Europe, Australia, and U.S. territories.
- Keep technical content in English until translated pages can be reviewed by a human or trusted localization workflow.
- Avoid machine-translating fitment-critical product titles without review.
- Use simple international shipping language: quote availability, carrier limits, duties, taxes, and oversize restrictions.

## QA Checklist

- Country selector works on desktop and mobile.
- Prices and currencies match the selected market.
- Cart and checkout show available shipping methods for test addresses in each primary market.
- Product pages, collection pages, and policy pages retain canonical URLs and social images.
- No hidden or broken language links are exposed for disabled languages.
