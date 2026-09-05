/* Minimal DuckDB-WASM setup for the query-demo prototype. Loads its worker
 * and WASM binary from jsDelivr rather than bundling them locally — this is
 * a spike, not a bakeoff entry (see GitHub issue #6), so it deliberately
 * skips the asset-pipeline work self-hosting would need. */
import * as duckdb from "@duckdb/duckdb-wasm";

let dbPromise = null;

function initDB() {
  return (async () => {
    const bundles = duckdb.getJsDelivrBundles();
    const bundle = await duckdb.selectBundle(bundles);
    const workerUrl = URL.createObjectURL(
      new Blob([`importScripts("${bundle.mainWorker}");`], { type: "text/javascript" })
    );
    const worker = new Worker(workerUrl);
    const logger = new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING);
    const db = new duckdb.AsyncDuckDB(logger, worker);
    await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
    URL.revokeObjectURL(workerUrl);
    return db;
  })();
}

/** Registers one of the site's own Parquet fixtures (small/wide/medium/large)
 *  as a DuckDB virtual file so it can be queried with `FROM <key>`. Fetches
 *  and registers the file once per key even across repeated calls. */
const registered = new Set();

export async function registerDataset(key) {
  if (!dbPromise) dbPromise = initDB();
  const db = await dbPromise;
  if (registered.has(key)) return db;

  const res = await fetch(`/data/${key}.parquet`);
  if (!res.ok) throw new Error(`could not fetch /data/${key}.parquet (${res.status})`);
  const buf = new Uint8Array(await res.arrayBuffer());
  await db.registerFileBuffer(`${key}.parquet`, buf);

  // A view named after the key, not just a registered file, so example
  // queries can say `FROM small` instead of `FROM read_parquet('small.parquet')`.
  const conn = await db.connect();
  try {
    await conn.query(`CREATE OR REPLACE VIEW ${key} AS SELECT * FROM read_parquet('${key}.parquet')`);
  } finally {
    await conn.close();
  }
  registered.add(key);
  return db;
}

/** Runs `sql` and returns { columns, rows } in the same shape the harness's
 *  own dataset loader produces, so query results can go straight into a
 *  reused TanStackTable. `align`/`type` are inferred from the Arrow result
 *  schema, not hand-declared per dataset the way the bakeoff's fixed four are. */
export async function runQuery(sql) {
  if (!dbPromise) dbPromise = initDB();
  const db = await dbPromise;
  const conn = await db.connect();
  try {
    const result = await conn.query(sql);
    const rows = result.toArray().map((row) => row.toJSON());
    const columns = result.schema.fields.map((f) => {
      const typeId = f.type?.typeId;
      // Arrow typeId 2 = Int, 3 = Float/Decimal-ish numerics we care about here.
      const isNumeric = typeId === 2 || typeId === 3;
      return { name: f.name, type: isNumeric ? "number" : "string", align: isNumeric ? "right" : "left" };
    });
    return { columns, rows };
  } finally {
    await conn.close();
  }
}
