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
]) {
  assert(fs.existsSync(absolute(requiredPath)), `${requiredPath} is missing`);
}

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

const productTemplateText = readText("templates/product.json");
assert(
  productTemplateText.includes("{{ closest.product.description }}"),
  "Product template does not render product.description",
);

const blogTemplateText = readText("templates/blog.json");
assert(blogTemplateText.includes('"type": "main-blog"'), "Blog template does not use the main-blog section");

const articleTemplateText = readText("templates/article.json");
assert(articleTemplateText.includes('"type": "_blog-post-content"'), "Article template does not render article content");

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
