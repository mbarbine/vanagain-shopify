import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const warnings = [];
const stats = {};

function absolute(relPath) {
  return path.join(rootDir, relPath);
}

function readText(relPath) {
  return fs.readFileSync(absolute(relPath), "utf8");
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function warn(condition, message) {
  if (!condition) warnings.push(message);
}

function stripJsonComments(source) {
  let output = "";
  let inString = false;
  let escaping = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (inString) {
      output += char;
      if (escaping) {
        escaping = false;
      } else if (char === "\\") {
        escaping = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      output += char;
    } else if (char === "/" && next === "/") {
      while (index < source.length && source[index] !== "\n") index += 1;
      output += "\n";
    } else if (char === "/" && next === "*") {
      index += 2;
      while (index < source.length && !(source[index] === "*" && source[index + 1] === "/")) index += 1;
      index += 1;
    } else {
      output += char;
    }
  }

  return output;
}

function stripTrailingCommas(source) {
  let output = "";
  let inString = false;
  let escaping = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];

    if (inString) {
      output += char;
      if (escaping) {
        escaping = false;
      } else if (char === "\\") {
        escaping = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      output += char;
      continue;
    }

    if (char === ",") {
      let lookahead = index + 1;
      while (/\s/.test(source[lookahead] ?? "")) lookahead += 1;
      if (source[lookahead] === "}" || source[lookahead] === "]") continue;
    }

    output += char;
  }

  return output;
}

function normalizeShopifyJson(source) {
  return stripTrailingCommas(stripJsonComments(source.replace(/^\uFEFF/, ""))).trimStart();
}

function parseShopifyJson(relPath) {
  try {
    return JSON.parse(normalizeShopifyJson(readText(relPath)));
  } catch (error) {
    failures.push(`${relPath} is not valid JSON/JSONC after Shopify comment removal: ${error.message}`);
    return undefined;
  }
}

function walkJsonFiles(dirRelPath) {
  const dir = absolute(dirRelPath);
  if (!fs.existsSync(dir)) return [];

  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryRelPath = path.join(dirRelPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkJsonFiles(entryRelPath));
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      files.push(entryRelPath);
    }
  }
  return files;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function readCsvRecords(relPath) {
  const rows = parseCsv(readText(relPath).replace(/^\uFEFF/, ""));
  const header = rows.shift() ?? [];

  return rows
    .filter((row) => row.some((cell) => String(cell).trim() !== ""))
    .map((row) => Object.fromEntries(header.map((name, index) => [name, row[index] ?? ""])));
}

function readPngDimensions(buffer) {
  const signature = buffer.subarray(0, 8).toString("hex");
  if (signature !== "89504e470d0a1a0a") return undefined;
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function assertPngDimensions(relPath, width, height) {
  const buffer = fs.readFileSync(absolute(relPath));
  const dimensions = readPngDimensions(buffer);
  assert(Boolean(dimensions), `${relPath} is not a PNG file`);
  if (dimensions) {
    assert(
      dimensions.width === width && dimensions.height === height,
      `${relPath} is ${dimensions.width}x${dimensions.height}; expected ${width}x${height}`,
    );
  }
}

function assertIco(relPath) {
  const buffer = fs.readFileSync(absolute(relPath));
  const isIco =
    buffer.length >= 6 &&
    buffer.readUInt16LE(0) === 0 &&
    buffer.readUInt16LE(2) === 1 &&
    buffer.readUInt16LE(4) > 0;
  assert(isIco, `${relPath} is not a valid ICO file`);
  assert(!buffer.subarray(0, 128).toString("utf8").includes("<!DOCTYPE html>"), `${relPath} contains HTML`);
}

for (const requiredPath of [
  "assets",
  "blocks",
  "config",
  "layout",
  "locales",
  "sections",
  "snippets",
  "templates",
  "csv-export/shopify-products-import.csv",
  "csv-export/blogs.csv",
  "templates/index.json",
  "templates/product.json",
  "templates/blog.json",
  "templates/article.json",
  "templates/page.contact.json",
  "package.json",
  "README.md",
  "docs/EDITING_AND_PUBLISHING.md",
  "docs/TESTING.md",
  "docs/ROADMAP.md",
  "docs/CUTOVER_ISSUES.md",
  "docs/ECOMMERCE_GROWTH_RECOMMENDATIONS.md",
  "docs/INTERNATIONALIZATION.md",
  "templates/collection.grid-24.json",
  "templates/collection.grid-48.json",
  "templates/collection.grid-100.json",
  "templates/collection.compact-24.json",
  "templates/collection.compact-48.json",
  "templates/collection.compact-100.json",
  "sections/vanagain-contact.liquid",
  "sections/vanagain-collections-hub.liquid",
  "snippets/vanagain-breadcrumbs.liquid",
  "snippets/vanagain-blog-card-fallback-image.liquid",
  "snippets/vanagain-json-ld.liquid",
  "snippets/vanagain-page-fallback.liquid",
  "snippets/vanagain-testimonials-list.liquid",
]) {
  assert(fs.existsSync(absolute(requiredPath)), `${requiredPath} is missing`);
}

const themeLayoutText = readText("layout/theme.liquid");
assert(themeLayoutText.includes("template-{{ request.page_type"), "Theme body does not emit request.page_type template classes");
assert(themeLayoutText.includes('rel="preconnect" href="https://cdn.shopify.com"'), "Theme layout does not preconnect to Shopify CDN");
assert(themeLayoutText.includes("vanagain-json-ld"), "Theme layout does not render VanAgain JSON-LD");
assert(themeLayoutText.includes("vanagain-breadcrumbs"), "Theme layout does not render breadcrumbs");

const overridesText = readText("assets/vanagain-overrides.css");
assert(overridesText.includes(".vanagain-breadcrumbs ol"), "Breadcrumbs are not styled as a horizontal list");
assert(overridesText.includes(".vanagain-contact-info"), "Contact information section styles are missing");
assert(overridesText.includes(".vanagain-collections-hub__vehicle-grid"), "Collections hub styles are missing");
assert(overridesText.includes("body.template-policy .shopify-policy__body table"), "Policy table formatting styles are missing");
assert(
  overridesText.includes("body.template-policy .shopify-policy__body .rte .grid") &&
    overridesText.includes(".sm\\:grid-cols-3") &&
    overridesText.includes("overflow-wrap: normal"),
  "Policy pages do not repair migrated Tailwind-style shipping content",
);
assert(
  overridesText.includes(".vanagain-collection-results--compact .product-grid") &&
    overridesText.includes("repeat(auto-fill, minmax(10.75rem, 1fr))"),
  "Compact product layout does not support dense desktop/tablet grids",
);
assert(
    overridesText.includes(".section.product-grid-container.vanagain-all-catalog") &&
    overridesText.includes("width: min(100%, 96rem)") &&
    overridesText.includes("overflow-x: clip") &&
    overridesText.includes("repeat(2, minmax(0, 1fr)) !important"),
  "Mobile all-products catalog is still not using the full available browsing width",
);
assert(
  overridesText.includes("body.template-collection .product-grid__item .quick-add") &&
    overridesText.includes("display: none !important"),
  "Collection product cards still expose the blank quick-add overlay",
);
assert(
  overridesText.includes("transform: scale(1.045)"),
  "Collection product images do not have the restored hover zoom affordance",
);
assert(
  overridesText.includes("body.template-product .product-media-container__zoom-button") &&
    overridesText.includes(".vanagain-social-share"),
  "Product page zoom/share UI styles are missing",
);

for (const relPath of [
  ...walkJsonFiles("templates"),
  ...walkJsonFiles("sections"),
  ...walkJsonFiles("config"),
  ...walkJsonFiles("locales"),
]) {
  parseShopifyJson(relPath);
  stats.jsonFilesParsed = (stats.jsonFilesParsed ?? 0) + 1;
}

const indexText = readText("templates/index.json");
assert(!indexText.includes("12,000+ Parts"), "Homepage still contains the unverified 12,000+ Parts count");
assert(!indexText.includes("AI-powered 24/7"), "Homepage still contains the unverified AI-powered 24/7 claim");
assert(indexText.includes("/collections/all"), "Homepage does not link to /collections/all");
assert(indexText.includes("/collections"), "Homepage does not link to /collections");

const listCollectionsTemplate = readText("templates/list-collections.json");
assert(
  listCollectionsTemplate.includes('"type": "vanagain-collections-hub"'),
  "Collections page does not use the VanAgain collections hub section",
);
const collectionsHubText = readText("sections/vanagain-collections-hub.liquid");
assert(collectionsHubText.includes("Shop by year range and model"), "Collections hub is missing vehicle browse content");
assert(collectionsHubText.includes("Browse common service categories"), "Collections hub is missing part-system browse content");
assert(collectionsHubText.includes("filter.v.availability=1#ResultsList"), "Collections hub does not link into in-stock catalog results");

const desktopNavText = readText("snippets/vanagain-desktop-nav-additions.liquid");
const mobileNavText = readText("snippets/vanagain-mobile-nav-additions.liquid");
assert(desktopNavText.includes(">Parts<"), "Desktop navigation does not include the Parts menu");
assert(mobileNavText.includes(">Parts<"), "Mobile navigation does not include the Parts menu");
assert(!desktopNavText.includes("/pages/privacy-terms"), "Desktop navigation still links to missing privacy-terms page");
assert(!mobileNavText.includes("/pages/privacy-terms"), "Mobile navigation still links to missing privacy-terms page");

const catalogFiltersText = readText("snippets/vanagain-catalog-filters.liquid");
assert(!catalogFiltersText.includes(">Uncategorized<"), "Catalog filter still exposes the zero-count Uncategorized part type");
assert(catalogFiltersText.includes("Search parts"), "Catalog filter search label is not parts-specific");
assert(!/<strong>\s*\d/.test(catalogFiltersText), "Catalog filter still renders hardcoded numeric counts");
assert(catalogFiltersText.includes("View in-stock catalog"), "Catalog filter primary CTA is too generic");
assert(mobileNavText.includes("Coolant System"), "Mobile Parts navigation does not include system shortcuts");
assert(!catalogFiltersText.includes("filter.p.tag="), "Catalog filter links still use unreliable native tag query filters");
assert(catalogFiltersText.includes("#ResultsList"), "Catalog filter links do not jump to product results");

const collectionSectionText = readText("sections/main-collection.liquid");
assert(collectionSectionText.includes("vanagain-catalog-filter-panel"), "All-products catalog does not use a collapsible filter panel");
assert(collectionSectionText.includes("vanagain-collection-results"), "All-products catalog results are not wrapped beside filters");
assert(collectionSectionText.includes("scrollIntoView"), "Filtered catalog URLs do not auto-focus product results");
assert(!collectionSectionText.includes("behavior: 'instant'"), "Collection auto-scroll uses non-standard instant behavior");
assert(collectionSectionText.includes("data-vanagain-layout-link"), "Collection toolbar is missing grid/compact layout controls");
assert(collectionSectionText.includes("data-vanagain-page-size-select"), "Collection toolbar is missing 24/48/100 page-size controls");
assert(collectionSectionText.includes("nextUrl.searchParams.set('view'"), "Collection toolbar does not preserve controls through Shopify alternate views");

for (const [templateName, layout, pageSize] of [
  ["collection.grid-24.json", "grid", 24],
  ["collection.grid-48.json", "grid", 48],
  ["collection.grid-100.json", "grid", 100],
  ["collection.compact-24.json", "compact", 24],
  ["collection.compact-48.json", "compact", 48],
  ["collection.compact-100.json", "compact", 100],
]) {
  const collectionTemplate = parseShopifyJson(`templates/${templateName}`);
  assert(
    collectionTemplate?.sections?.main?.settings?.vanagain_catalog_layout === layout,
    `${templateName} does not set the ${layout} catalog layout`,
  );
  assert(
    collectionTemplate?.sections?.main?.settings?.products_per_page === pageSize,
    `${templateName} does not set ${pageSize} products per page`,
  );
  assert(
    collectionTemplate?.sections?.main?.settings?.product_grid_width === "full-width",
    `${templateName} does not use the full-width product grid for mobile/tablet browsing`,
  );
}

const baseCollectionTemplate = parseShopifyJson("templates/collection.json");
assert(
  baseCollectionTemplate?.sections?.main?.settings?.product_grid_width === "full-width",
  "Base collection template does not use the full-width product grid",
);

const footerText = readText("sections/footer.liquid");
assert(!/paypal/i.test(footerText), "Footer still includes PayPal donation copy or links");
assert(footerText.includes("vanagain-footer__topline"), "Footer is missing the fitment-help support row");
assert(!footerText.includes('assign terms_url = \'/policies/terms-of-service\''), "Footer still falls back to the missing Terms policy route");
assert(
  overridesText.includes(".vanagain-footer__bottom-inner") &&
    overridesText.includes("padding-inline: 0.6rem"),
  "Mobile footer gutter is not aligned with the all-products catalog gutter",
);

const contactTemplateText = readText("templates/page.contact.json");
assert(contactTemplateText.includes('"type": "vanagain-contact"'), "Contact page does not use the custom VanAgain contact section");
const contactSectionText = readText("sections/vanagain-contact.liquid");
assert(contactSectionText.includes("vanagain-contact-info"), "Contact page does not render a dedicated contact info section");
assert(contactSectionText.includes("{% form 'contact'"), "Contact page does not render the Shopify contact form");

const main404Text = readText("sections/main-404.liquid");
assert(main404Text.includes("/pages/faq"), "404 fallback does not cover the FAQ page path");
assert(main404Text.includes("/pages/submit-testimonial"), "404 fallback does not cover the submit testimonial page path");
assert(main404Text.includes("/policies/terms-of-service"), "404 fallback does not cover the terms policy path");

const mainPageText = readText("sections/main-page.liquid");
assert(
  mainPageText.indexOf("{% render 'vanagain-testimonials-list' %}") < mainPageText.indexOf("{% content_for 'blocks' %}"),
  "Testimonials page still renders Shopify page blocks before the migrated testimonial grid",
);

const productTemplateText = readText("templates/product.json");
assert(
  productTemplateText.includes("{{ closest.product.description }}"),
  "Product template does not render product.description",
);
assert(productTemplateText.includes("vanagain-social-share"), "Product template does not render social share links");
const metaTagsText = readText("snippets/meta-tags.liquid");
assert(metaTagsText.includes("twitter:image"), "Meta tags do not include Twitter share images");
assert(metaTagsText.includes("og:locale"), "Meta tags do not include Open Graph locale data");
assert(metaTagsText.includes("shipping-destinations"), "Meta tags do not describe primary shipping destinations");
const jsonLdText = readText("snippets/vanagain-json-ld.liquid");
assert(jsonLdText.includes("areaServed"), "Organization JSON-LD does not describe primary markets served");
assert(jsonLdText.includes("knowsAbout"), "Organization JSON-LD does not describe VanAgain topical expertise");

const blogTemplateText = readText("templates/blog.json");
assert(blogTemplateText.includes('"type": "main-blog"'), "Blog template does not use the main-blog section");
const blogHeaderText = readText("sections/vanagain-blog-header.liquid");
assert(blogHeaderText.includes("is-active"), "Blog header does not mark active blog filters");
assert(blogHeaderText.includes("Shop parts by repair topic"), "Blog header does not expose repair-topic category shortcuts");
const blogCardText = readText("blocks/_blog-post-card.liquid");
const blogImageText = readText("blocks/_blog-post-image.liquid");
const blogFallbackImageText = readText("snippets/vanagain-blog-card-fallback-image.liquid");
assert(blogCardText.includes("vanagain-blog-card-fallback-image"), "Blog post cards do not render fallback thumbnails");
assert(blogImageText.includes('loading="lazy"'), "Blog list images are not lazy-loaded");
assert(blogImageText.includes('fetchpriority="auto"'), "Blog list images still use high fetch priority");
assert(blogFallbackImageText.includes("vanagain-hero.jpg"), "Blog fallback thumbnail does not use a real VanAgain visual asset");

const articleTemplateText = readText("templates/article.json");
assert(articleTemplateText.includes('"type": "_blog-post-content"'), "Article template does not render article content");
const blogPostContentText = readText("blocks/_blog-post-content.liquid");
const legacyArticleFallbackText = readText("snippets/vanagain-legacy-article-fallback.liquid");
assert(
  blogPostContentText.includes("vanagain-legacy-article-fallback"),
  "Article content block does not render the legacy fallback for blank Shopify article bodies",
);
assert(
  legacyArticleFallbackText.includes("the-truth-about-coolant-and-the-vanagon-cooling-system"),
  "Legacy blog fallback is missing the coolant article reported empty on the live storefront",
);

assertIco("assets/favicon.ico");
assertPngDimensions("assets/favicon-16x16.png", 16, 16);
assertPngDimensions("assets/favicon-32x32.png", 32, 32);
assertPngDimensions("assets/apple-touch-icon.png", 180, 180);

const productRows = readCsvRecords("csv-export/shopify-products-import.csv");
const primaryProductRows = productRows.filter((row) => row.Title?.trim());
const mediaRows = productRows.length - primaryProductRows.length;
const productDescriptionBlanks = primaryProductRows.filter((row) => !row.Description?.trim());
const productHandleBlanks = primaryProductRows.filter((row) => !row.Handle?.trim());
const productSkuBlanks = primaryProductRows.filter((row) => !row.SKU?.trim());

assert(primaryProductRows.length > 0, "Product CSV has no primary product rows");
assert(productDescriptionBlanks.length === 0, "One or more primary product rows have blank descriptions");
assert(productHandleBlanks.length === 0, "One or more primary product rows have blank handles");
warn(productSkuBlanks.length === 0, `${productSkuBlanks.length} primary product rows have blank SKUs`);

const blogRows = readCsvRecords("csv-export/blogs.csv");
assert(blogRows.length > 0, "Blog CSV has no article rows");
assert(blogRows.every((row) => row.title?.trim()), "One or more blog rows have blank titles");
assert(blogRows.every((row) => row.slug?.trim()), "One or more blog rows have blank slugs");
assert(blogRows.every((row) => row.description?.trim()), "One or more blog rows have blank descriptions");

stats.productCsvRows = productRows.length;
stats.primaryProductRows = primaryProductRows.length;
stats.productMediaRows = mediaRows;
stats.blogRows = blogRows.length;

if (failures.length > 0) {
  console.error("VanAgain Shopify artifact validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  if (warnings.length > 0) {
    console.error("Warnings:");
    for (const warning of warnings) console.error(`- ${warning}`);
  }
  process.exit(1);
}

console.log("VanAgain Shopify artifact validation passed.");
console.log(JSON.stringify({ stats, warnings }, null, 2));
