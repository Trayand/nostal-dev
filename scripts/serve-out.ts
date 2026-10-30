// Minimal static server for the built site (out/). Used by `npm run preview`
// and the Playwright smoke test. Mirrors what Vercel/Pages/GitHub Pages do.
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve("out");
const PORT = Number(process.env.PORT || 4173);
const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".webmanifest": "application/manifest+json", ".wasm": "application/wasm",
  ".png": "image/png", ".svg": "image/svg+xml", ".txt": "text/plain; charset=utf-8", ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  let file = path.join(ROOT, urlPath);
  if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
  if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, "index.html");
  else if (!existsSync(file) && existsSync(`${file}.html`)) file = `${file}.html`;
  if (!existsSync(file)) {
    const notFound = path.join(ROOT, "404.html");
    res.writeHead(404, { "content-type": TYPES[".html"] }).end(existsSync(notFound) ? readFileSync(notFound) : "Not found");
    return;
  }
  res.writeHead(200, {
    "content-type": TYPES[path.extname(file)] || "application/octet-stream",
    "cache-control": file.endsWith("sw.js") ? "no-cache" : "public, max-age=0",
  }).end(readFileSync(file));
}).listen(PORT, () => console.log(`Serving out/ at http://localhost:${PORT}`));
