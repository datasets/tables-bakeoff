/* Builds the four demo datasets from HM Land Registry price-paid data.
 *
 * Source: pp-2024.csv (162MB, no header row), Open Government Licence.
 * Downloaded once into data-cache/ (gitignored); the Parquet outputs are
 * committed so the site builds with no network access.
 *
 * Parquet writer: hyparquet-writer, by the same authors as the hyparquet
 * reader the demos use, so writer and reader agree on encodings by
 * construction and the extra dependency is one package rather than a native
 * DuckDB binary.
 *
 * Column types are left to the writer's inference, which samples the first
 * 1000 values. That is only safe because the inferred types hold for the whole
 * file: every field is a string except `price`, whose maximum across all of
 * 2024 is 180,000,000 — an order of magnitude inside INT32, so no later row
 * can overflow the type chosen from the first row group.
 */
import { createWriteStream, existsSync, mkdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { parquetWriteRows, fileWriter } from "hyparquet-writer";

const SRC = "http://prod1.publicdata.landregistry.gov.uk.s3-website-eu-west-1.amazonaws.com/pp-2024.csv";
const CACHE = "data-cache/pp-2024.csv";
const OUT_DIR = "public/data";

/** Column order of the Land Registry file, which ships with no header row. */
const COLUMNS = [
  "id", "price", "date", "postcode", "propertyType", "oldNew", "duration",
  "paon", "saon", "street", "locality", "town", "district", "county",
  "ppdCategory", "recordStatus",
];

/** Derived columns for the wide dataset, so horizontal virtualization has
 *  something to virtualize without inventing a second source. */
const METRIC_COLUMNS = Array.from({ length: 64 }, (_, n) => `metric_${String(n + 1).padStart(2, "0")}`);
const WIDE_COLUMNS = [...COLUMNS, ...METRIC_COLUMNS];

/** Codes the raw file uses, expanded so the table is readable by a human. */
const PROPERTY_TYPE = { D: "Detached", S: "Semi-detached", T: "Terraced", F: "Flat", O: "Other" };
const DURATION = { F: "Freehold", L: "Leasehold" };

async function ensureSource() {
  if (existsSync(CACHE)) return;
  mkdirSync("data-cache", { recursive: true });
  console.log("downloading 162MB from Land Registry (once)...");
  // The published URL 301-redirects twice (prod1 -> prod -> prod2).
  const res = await fetch(SRC, { redirect: "follow" });
  if (!res.ok) throw new Error(`source fetch failed: ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(CACHE));
}

/** Minimal RFC4180 parser: the file quotes every field and contains commas
 *  inside address fields, so splitting on "," is not safe. */
function parseLine(line) {
  const out = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQ = false;
      else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

function toRow(fields) {
  const r = {};
  COLUMNS.forEach((name, i) => (r[name] = fields[i] ?? ""));
  return {
    id: r.id.replace(/[{}]/g, ""),
    price: Number(r.price) || 0,
    date: r.date.slice(0, 10),
    postcode: r.postcode,
    propertyType: PROPERTY_TYPE[r.propertyType] ?? r.propertyType,
    oldNew: r.oldNew === "Y" ? "New build" : "Existing",
    duration: DURATION[r.duration] ?? r.duration,
    paon: r.paon,
    saon: r.saon,
    street: r.street,
    locality: r.locality,
    town: r.town,
    district: r.district,
    county: r.county,
    ppdCategory: r.ppdCategory,
    recordStatus: r.recordStatus,
  };
}

/** Wide dataset: the 16 real columns plus 64 derived ones. */
function widen(row, i) {
  const w = { ...row };
  METRIC_COLUMNS.forEach((name, n) => {
    w[name] = Math.round((row.price / 1000) * Math.sin(i + n + 1) * 100) / 100;
  });
  return w;
}

/**
 * Deterministic even-stride sample of `n` rows, yielded one at a time.
 *
 * A generator rather than an array because the writer pulls a row group at a
 * time: only ~100k parsed rows are ever live, so peak memory is set by the row
 * group, not by the 500k-row output. Materializing all four samples up front
 * would cost well over a gigabyte, most of it immediately discarded.
 *
 * The stride is fractional (`i * total / n`) rather than a floored integer so
 * the sample spans the whole year at every size. A floored stride collapses to
 * 1 once n approaches half the file, which would silently reduce `large` to
 * the first five months of 2024.
 */
function* sample(lines, n, transform) {
  const total = lines.length;
  const count = Math.min(n, total);
  for (let i = 0; i < count; i++) {
    const row = toRow(parseLine(lines[Math.round((i * total) / count)]));
    yield transform ? transform(row, i) : row;
  }
}

function writeParquet(path, columnNames, rows) {
  parquetWriteRows({
    writer: fileWriter(path),
    rows,
    columns: columnNames.map((name) => ({ name })),
  });
  console.log(`wrote ${path} (rss ${Math.round(process.memoryUsage().rss / 1e6)}MB)`);
}

async function main() {
  await ensureSource();
  mkdirSync(OUT_DIR, { recursive: true });

  // No reference is kept to the decoded text, only to the split lines, so the
  // 162MB string is collectable while the rows are being written.
  const lines = (await readFile(CACHE, "utf8")).split("\n").filter(Boolean);
  console.log(`parsed ${lines.length.toLocaleString()} source rows`);

  writeParquet(`${OUT_DIR}/small.parquet`, COLUMNS, sample(lines, 1000));
  writeParquet(`${OUT_DIR}/wide.parquet`, WIDE_COLUMNS, sample(lines, 1000, widen));
  writeParquet(`${OUT_DIR}/medium.parquet`, COLUMNS, sample(lines, 50000));
  writeParquet(`${OUT_DIR}/large.parquet`, COLUMNS, sample(lines, 500000));
  console.log("done");
}

main().catch((e) => { console.error(e); process.exit(1); });
