// P0 stub — replaced by the real content pipeline in P1.
import { mkdirSync, writeFileSync } from "node:fs";
mkdirSync("public/content", { recursive: true });
writeFileSync("public/content/index.json", JSON.stringify({ version: "empty", tracks: [], questions: [] }));
