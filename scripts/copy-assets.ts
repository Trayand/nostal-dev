// Copies sql.js (SQLite compiled to WebAssembly) into public/ so the SQL
// worker can load it as a static file. Runs before dev/build.
import { copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const dist = path.dirname(require.resolve("sql.js/dist/sql-wasm.js"));
mkdirSync("public/sqljs", { recursive: true });
for (const f of ["sql-wasm.js", "sql-wasm.wasm"]) copyFileSync(path.join(dist, f), path.join("public/sqljs", f));
console.log("sql.js copied to public/sqljs/");
