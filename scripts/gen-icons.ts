// Draws the app icon ("</>") into PNG files without any image library:
// a tiny rasterizer + PNG encoder using Node's built-in zlib.
// Run: npm run icons   (outputs are committed in public/icons/)
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

type Seg = [number, number, number, number];
const BG = [0x17, 0x1a, 0x23];
const ACCENT = [0x8b, 0x97, 0xff];
const GREEN = [0x5f, 0xd3, 0x8d];

// Glyph segments in a 0..1 box (matches public/icon.svg).
const brackets: Seg[] = [
  [0.36, 0.34, 0.22, 0.5], [0.22, 0.5, 0.36, 0.66],
  [0.64, 0.34, 0.78, 0.5], [0.78, 0.5, 0.64, 0.66],
];
const slash: Seg[] = [[0.56, 0.3, 0.44, 0.7]];

function distToSeg(px: number, py: number, [x1, y1, x2, y2]: Seg) {
  const dx = x2 - x1, dy = y2 - y1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function crc32(buf: Buffer) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type: string, data: Buffer) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function render(size: number, { rounded, scale }: { rounded: boolean; scale: number }) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  const radius = rounded ? 0.2 : 0;
  const stroke = 0.035 * scale;
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size, v = (y + 0.5) / size;
      // Rounded-rect background alpha.
      let alpha = 1;
      if (radius) {
        const cx = Math.min(Math.max(u, radius), 1 - radius);
        const cy = Math.min(Math.max(v, radius), 1 - radius);
        const d = Math.hypot(u - cx, v - cy) - radius;
        alpha = Math.max(0, Math.min(1, 0.5 - d * size));
      }
      // Glyph coordinates scaled around the center.
      const gu = 0.5 + (u - 0.5) / scale, gv = 0.5 + (v - 0.5) / scale;
      const cover = (segs: Seg[]) =>
        Math.max(0, Math.min(1, 0.5 - (Math.min(...segs.map((s) => distToSeg(gu, gv, s))) * scale - stroke) * size));
      const a1 = cover(brackets), a2 = cover(slash);
      const px = BG.map((bg, i) => {
        const withAccent = bg + (ACCENT[i] - bg) * a1;
        return Math.round(withAccent + (GREEN[i] - withAccent) * a2);
      });
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = px[0]; raw[o + 1] = px[1]; raw[o + 2] = px[2]; raw[o + 3] = Math.round(alpha * 255);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync("public/icons", { recursive: true });
writeFileSync("public/icons/icon-192.png", render(192, { rounded: true, scale: 1 }));
writeFileSync("public/icons/icon-512.png", render(512, { rounded: true, scale: 1 }));
// Maskable: full-bleed background, glyph inside the 80% safe zone.
writeFileSync("public/icons/maskable-512.png", render(512, { rounded: false, scale: 0.75 }));
writeFileSync("public/icons/apple-touch-icon.png", render(180, { rounded: false, scale: 0.85 }));
console.log("Icons written to public/icons/");
