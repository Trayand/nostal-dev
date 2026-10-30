// Post-build step: write out/sw.js with a precache list of every file in out/.
// The cache name is a hash of all file contents, so any change → new version.
import { createHash } from "node:crypto";
import { copyFileSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const OUT = "out";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const SKIP = [/^sw\.js$/, /\.map$/, /^404\//, /^_not-found\//, /(^|\/)\./];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

// Next 16's client prefetches "/practice/__next.practice.__PAGE__.txt", but the
// static export writes it as "/practice/__next.practice/__PAGE__.txt". Add the
// flat copy so prefetches don't 404 on static hosts.
function flattenSegmentPrefetch(dir: string) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (!statSync(full).isDirectory() || name === "_next") continue;
    if (name.startsWith("__next.")) {
      for (const file of readdirSync(full)) {
        const src = path.join(full, file);
        if (statSync(src).isFile()) copyFileSync(src, path.join(dir, `${name}.${file}`));
      }
    } else {
      flattenSegmentPrefetch(full);
    }
  }
}
flattenSegmentPrefetch(OUT);

const hash = createHash("sha256");
const urls: string[] = [];
for (const file of walk(OUT).sort()) {
  const rel = path.relative(OUT, file).split(path.sep).join("/");
  if (SKIP.some((re) => re.test(rel))) continue;
  hash.update(rel).update(readFileSync(file));
  // Pages are requested as "/practice/", not "/practice/index.html".
  const url = rel === "index.html" ? "/" : rel.endsWith("/index.html") ? `/${rel.slice(0, -"index.html".length)}` : `/${rel}`;
  urls.push(basePath + url);
}

const version = hash.digest("hex").slice(0, 12);
const template = readFileSync("src/sw/sw-template.js", "utf8");
const sw = template
  .replace("self.__PRECACHE__", JSON.stringify(urls, null, 0))
  .replace("self.__VERSION__", JSON.stringify(version));
writeFileSync(path.join(OUT, "sw.js"), sw);
console.log(`sw.js written: ${urls.length} files precached, version ${version}`);
