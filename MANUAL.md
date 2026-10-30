# Manual Programming Hub

Panduan praktis untuk pemilik aplikasi: menjalankan, memakai, menambah soal, merawat.
Semua perintah dijalankan dari folder proyek (`pro_hub/`).

**Daftar isi**
1. [Menjalankan di komputer](#1-menjalankan-di-komputer)
2. [Deploy gratis](#2-deploy-gratis)
3. [Pasang di HP (PWA)](#3-pasang-di-hp-pwa)
4. [Cara memakai setiap layar](#4-cara-memakai-setiap-layar)
5. [Membuat soal baru dengan Claude Code](#5-membuat-soal-baru-dengan-claude-code)
6. [Menulis soal secara manual](#6-menulis-soal-secara-manual)
7. [Validasi & build konten](#7-validasi--build-konten)
8. [Menambah track, mengubah level, mengatur profile.json](#8-menambah-track-mengubah-level-mengatur-profilejson)
9. [Backup: ekspor & impor progres](#9-backup-ekspor--impor-progres)
10. [Tantangan desktop (Go)](#10-tantangan-desktop-go)
11. [Troubleshooting](#11-troubleshooting)
12. [Rutinitas perawatan](#12-rutinitas-perawatan)

---

## 1. Menjalankan di komputer

Butuh **Node.js 22** (cek: `node -v`).

```bash
npm install          # sekali saja (atau setelah package.json berubah)
npm run dev          # mode pengembangan → http://localhost:3000
```

Mode `dev` **tidak** memakai service worker (supaya perubahan langsung terlihat).
Untuk mencoba versi produksi (offline, bisa di-install):

```bash
npm run build        # validasi + bundel konten → next build → buat sw.js
npm run preview      # sajikan folder out/ di http://localhost:4173
```

Perintah lain yang berguna:

| Perintah | Fungsi |
|---|---|
| `npm test` | Unit test (Vitest) |
| `npm run test:e2e` | Smoke test di browser (Playwright, jalankan `npm run build` dulu) |
| `npm run typecheck` | Cek tipe TypeScript |
| `npm run content:validate` | Validasi semua soal |
| `npm run content:build` | Bundel soal yang lolos ke `public/content/` |
| `npm run content:review` | Daftar soal non-eksekusi untuk direview |

> Playwright pertama kali butuh browser: `npx playwright install chromium`. Kalau unduhan
> lambat, pakai Chrome/Edge yang sudah terpasang: `PW_CHANNEL=chrome npm run test:e2e`
> (PowerShell: `$env:PW_CHANNEL="chrome"; npm run test:e2e`).

## 2. Deploy gratis

Hasil build adalah situs statis di folder `out/`. Pilih salah satu:

### Vercel
1. Push repo ke GitHub, lalu di vercel.com → **Add New Project** → pilih repo.
2. Framework: Next.js (terdeteksi otomatis). Build command: `npm run build`.
   Output directory: `out`.
3. Deploy. Setiap push ke `main` otomatis ter-deploy ulang.

### Cloudflare Pages
1. dash.cloudflare.com → Workers & Pages → **Create** → Pages → hubungkan repo.
2. Build command: `npm run build`, Build output directory: `out`.
3. Environment variable: `NODE_VERSION` = `22`.

### GitHub Pages
Repo sudah berisi workflow `.github/workflows/deploy-pages.yml`.
1. Repo → **Settings → Pages → Source: GitHub Actions**.
2. Push ke `main`. Workflow menjalankan test, build dengan
   `NEXT_PUBLIC_BASE_PATH=/<nama-repo>`, lalu deploy.
3. Buka `https://<username>.github.io/<nama-repo>/`.

> Base path hanya perlu untuk GitHub Pages (situs ada di sub-folder). Vercel/Cloudflare tidak perlu.
> File `public/.nojekyll` wajib ada agar GitHub tidak menyembunyikan folder `_next/`.

## 3. Pasang di HP (PWA)

Buka URL aplikasi (hasil deploy) **sekali saat online**, tunggu halaman termuat penuh.

- **Android (Chrome):** menu ⋮ → **Instal aplikasi** / **Tambahkan ke layar utama**.
  Atau buka **Setelan → Pasang aplikasi → Instal sekarang** di dalam app.
- **iPhone (Safari):** tombol **Bagikan** → **Tambahkan ke Layar Utama**.
- **Desktop (Chrome/Edge):** ikon instal di address bar.

Setelah itu aplikasi berjalan **offline**. Di **Setelan → Tentang** akan muncul
"✓ Siap dipakai offline". Progres tersimpan di perangkat (IndexedDB) — lihat bagian Backup.

## 4. Cara memakai setiap layar

Navigasi bawah: **Hari ini · Latihan · Kartu · Progres · Setelan**.

### Hari ini
- **Streak** 🔥: jumlah hari berturut-turut kamu berlatih.
- **Kartu jatuh tempo**: soal/kartu yang dijadwalkan ulang oleh spaced repetition.
- **Target harian**: menit latihan hari ini vs target (ubah di Setelan).
- **Mulai sesi harian**: ±10–15 menit campuran — ±40% ulasan (SRS), ±30% topik lemah, sisanya soal
  baru di level kamu saat ini. Kalau sesi terputus, tombol berubah jadi **Lanjutkan sesi**.
- **Topik yang perlu dilatih**: ketuk untuk latihan khusus topik itu.
- Pintasan ke setiap track (dengan level kamu) dan ke **Tantangan desktop**.

### Latihan
Pilih **track → level → topik** (opsional) → **Mulai latihan** (maks. 10 soal).
Tanda ★ = level kamu saat ini, plus progres naik level (mis. `7/10, target 80% × 10`).

### Layar soal
- Bagian atas: tombol ✕ (tutup sesi) dan progres sesi.
- Bar bawah (selalu terlihat): **💡 Petunjuk** (maks. 2, bertahap), **Lihat solusi**
  (dihitung **salah**), dan **Cek** / **Jalankan tes**.
- Setelah menjawab: hasil + **Penjelasan**, lalu **Lanjut**.
- Format soal:
  - **Pilihan ganda** dan **Tebak output** (pilih opsi atau ketik output persis).
  - **Cari bug**: ketuk baris yang salah; setelah dicek, perbaikannya ditampilkan.
  - **Isi titik-titik**: ketuk kotak kosong, lalu ketuk jawaban dari bank kata.
  - **Susun kode (parsons)**: pakai tombol ↑ ↓ untuk mengurutkan baris.
  - **Flashcard**: **Tampilkan jawaban**, lalu nilai dirimu: *Lagi / Sulit / Bisa / Mudah*.
  - **Kode (singkat/penuh)**: editor dengan toolbar simbol (`Tab { } ( ) [ ] ; => " ' : = < >`,
    undo/redo). **Jalankan tes** menampilkan hasil per tes (diharapkan vs didapat, console).
    Boleh diperbaiki dan dijalankan ulang sampai lulus. Kode tersimpan otomatis sebagai draft;
    **Reset kode** mengembalikan starter. Soal besar memberi saran "lebih nyaman di desktop".
    Di layar lebar, soal kode tampil dua kolom (soal kiri, editor kanan).
- Naik level ditampilkan sebagai notifikasi ⬆️.

### Kartu
Antrian spaced repetition untuk flashcard konsep. **Mulai ulasan** untuk kartu jatuh tempo,
**Pelajari kartu baru** untuk 10 kartu yang belum pernah dilihat.

### Progres
Kalender streak 12 minggu, akurasi per track & level, topik lemah, dan 20 riwayat terakhir.

### Setelan
Tema (gelap default / terang / ikut sistem), bahasa UI (Indonesia/English), target harian,
**Ekspor/Impor progres**, **Reset**, panduan instal, versi konten.

### Tantangan desktop
Soal Go dan soal besar. Lihat [bagian 10](#10-tantangan-desktop-go).

## 5. Membuat soal baru dengan Claude Code

Buka Claude Code di folder proyek, lalu pakai perintah berikut.

### `/gen-questions <track> <level> <jumlah> [topik]`
Contoh:
```
/gen-questions javascript 2 10
/gen-questions sql 3 6 sql-joins
/gen-questions concepts 1 15 git
/gen-questions go 3 5 channels
```
Yang dilakukan Claude:
1. Membaca `profile.json` (bahasa, topik fokus, area lemah), aturan di
   `docs/CONTENT-AUTHORING.md`, dan soal yang sudah ada (menghindari duplikat).
2. Menulis soal baru ke `content/<track>/l<level>/<nama>-<tanggal>.json` dengan status `draft`.
3. Menjalankan validator, memperbaiki yang gagal (maks. 3 putaran), menghapus yang tetap gagal.
4. Mereview sendiri soal yang tidak bisa dieksekusi, lalu menandai yang lolos jadi `verified`.
5. Melaporkan hasilnya. Kamu cukup cek laporannya, jalankan aplikasi, dan commit.

### `/review-content [track]`
Review tahap kedua untuk soal non-eksekusi (pilihan ganda, cari bug, flashcard, Go).
Claude memperbaiki kesalahan fakta, memberi cap `reviewed`, atau mengembalikan soal meragukan ke `draft`.

### `/add-track <id> ["Judul"] [bahasa]`
Membuat track baru (folder, `content/tracks.json`, dokumentasi). Contoh: `/add-track git "Git" text`.

## 6. Menulis soal secara manual

Soal disimpan di `content/<track>/l<level>/<nama>.json` — isinya **array JSON**. Satu file bisa berisi
banyak soal (satu "batch"). Referensi lengkap (bahasa Inggris): `docs/CONTENT-AUTHORING.md`.

### Field umum (semua format)
```json
{
  "id": "js-closures-004",
  "track": "javascript",
  "level": 2,
  "format": "multiple-choice",
  "topic": "closures",
  "tags": ["scope"],
  "title": "Judul singkat",
  "prompt": "Teks soal (markdown).",
  "data": { },
  "answer": { },
  "hints": ["Petunjuk 1 (dorongan)", "Petunjuk 2 (hampir jawabannya)"],
  "explanation": "Kenapa jawabannya benar (markdown).",
  "estimatedMinutes": 2,
  "source": { "model": "manual", "date": "2026-10-25" },
  "status": "draft"
}
```
- `id` unik, huruf kecil-strip. Folder harus cocok dengan `track` dan `level`.
- `status`: `draft` → (lolos validasi) → `verified`. Hanya `verified`/`published` yang masuk aplikasi.
- Field yang tidak dikenal = error (mencegah typo seperti `explaination`).

### Contoh per format (hanya bagian yang berbeda)

**multiple-choice**
```json
"format": "multiple-choice",
"data": { "options": ["`map`", "`forEach`", "`filter`"], "code": "opsional", "language": "javascript" },
"answer": { "index": 0 }
```

**predict-output** (JS/TS dieksekusi validator; output harus persis)
```json
"format": "predict-output",
"data": { "language": "javascript", "code": "console.log([1, 2].map(x => x * 2))", "options": ["[ 2, 4 ]", "[2,4]"] },
"answer": { "output": "[ 2, 4 ]" }
```
Format output mengikuti console Node satu baris: `[ 1, 2 ]`, `{ a: 1 }`, string bersarang pakai `'...'`.
`options` opsional (tanpa opsi, pengguna mengetik output).

**find-bug**
```json
"format": "find-bug",
"data": { "language": "javascript", "code": "baris 1\nbaris 2\nbaris 3" },
"answer": { "line": 2, "fixedLine": "baris 2 yang benar" }
```

**fill-blank** (`{{blank}}` untuk setiap kotak; `entry` + `tests` membuatnya diverifikasi)
```json
"format": "fill-blank",
"data": { "language": "javascript", "template": "function sum(nums) {\n  return nums.{{blank}}((a, b) => a + b, {{blank}});\n}",
          "choices": ["reduce", "map", "filter", "0", "1"], "entry": "sum" },
"answer": { "blanks": [["reduce"], ["0"]] },
"tests": [{ "input": [[1, 2, 3]], "expected": 6 }]
```

**parsons** (baris dalam urutan BENAR; aplikasi yang mengacak)
```json
"format": "parsons",
"data": { "language": "javascript", "entry": "max" },
"answer": { "lines": ["function max(a, b) {", "  if (a > b) return a;", "  return b;", "}"] },
"tests": [{ "input": [3, 5], "expected": 5 }]
```

**flashcard** (`prompt` = sisi depan)
```json
"format": "flashcard",
"answer": { "back": "Jawaban sisi belakang (markdown)." }
```

**code-short / code-full — JavaScript/TypeScript**
```json
"format": "code-short",
"data": { "language": "javascript", "starter": "function double(n) {\n  // tulis kodemu\n}", "entry": "double" },
"tests": [{ "name": "positif", "input": [2], "expected": 4 }, { "input": [0], "expected": 0 }],
"referenceSolution": "function double(n) {\n  return n * 2;\n}"
```
Validator memastikan `referenceSolution` lulus semua tes **dan** `starter` gagal.

**code-short / code-full — SQL (SQLite)**
```json
"format": "code-short",
"data": { "language": "sql", "starter": "-- tulis query di sini\n",
          "schema": "CREATE TABLE t (name TEXT, score INTEGER);",
          "seed": "INSERT INTO t VALUES ('Ani', 90), ('Budi', 70);" },
"tests": [
  { "expected": { "columns": ["name"], "rows": [["Ani"]] }, "ordered": false },
  { "name": "tanpa data", "setup": "DELETE FROM t;", "expected": { "columns": ["name"], "rows": [] } }
],
"referenceSolution": "SELECT name FROM t WHERE score > 80;"
```

**desktop** (Go / soal besar, tidak dieksekusi validator)
```json
"format": "desktop",
"data": {
  "language": "go",
  "command": "go test ./...",
  "files": [
    { "path": "go.mod", "kind": "other", "content": "module sum\n\ngo 1.22\n" },
    { "path": "sum.go", "kind": "starter", "content": "package sum\n\nfunc Sum(xs []int) int { return 0 }\n" },
    { "path": "sum_test.go", "kind": "test", "content": "package sum\n\nimport \"testing\"\n\nfunc TestSum(t *testing.T) { if Sum([]int{1, 2}) != 3 { t.Fatal(\"want 3\") } }\n" }
  ]
},
"referenceSolution": "func Sum(xs []int) int {\n\ttotal := 0\n\tfor _, x := range xs {\n\t\ttotal += x\n\t}\n\treturn total\n}"
```

Track `go` tidak boleh memakai `code-short`/`code-full` (tidak ada eksekusi Go di browser).

## 7. Validasi & build konten

```bash
npm run content:validate                                  # semua soal
npm run content:validate -- --track sql                   # satu track
npm run content:validate -- --file content/sql/l2/x.json  # satu file
npm run content:validate -- --file content/sql/l2/x.json --promote   # lolos → verified
npm run content:validate -- --no-exec                     # cek struktur saja (cepat)
npm run content:build                                     # bundel ke public/content/
npm run content:review                                    # checklist review manual
```
- Laporan: `reports/validation-report.md`, `reports/build-report.md`, `reports/review-checklist.md`.
- `npm run build` dan `npm run dev` otomatis menjalankan `content:build`.
- Soal yang gagal **tidak pernah** dikirim ke aplikasi, walaupun statusnya `verified`.

Yang diperiksa validator: skema, aturan antar-field, id duplikat, judul mirip (peringatan),
folder cocok, solusi referensi lulus tes, starter gagal tes, output predict-output benar,
hasil query SQL sesuai.

## 8. Menambah track, mengubah level, mengatur profile.json

### Track baru
Pakai `/add-track`, atau manual:
1. Tambah entri di `content/tracks.json`:
   `{ "id": "git", "title": "Git", "description": "…", "language": "text", "icon": "🌿" }`.
   `language`: `javascript`/`typescript`/`sql` (bisa soal kode) atau `go`/`text` (non-eksekusi).
2. Buat folder `content/git/l1` … `l5`.
3. Tambah soal, validasi, build. Track tanpa soal disembunyikan di aplikasi.

### `profile.json`
```json
{
  "lang": "id",
  "focusTopics": ["async", "closures", "array-methods", "sql-joins", "typescript-generics"],
  "weakAreas": ["recursion", "promises"],
  "dailyGoalMinutes": 15,
  "levelThresholds": { "windowSize": 10, "levelUpAccuracy": 0.8 }
}
```
| Field | Efek |
|---|---|
| `lang` | Bahasa default UI dan bahasa soal yang dibuat `/gen-questions` |
| `focusTopics` | Topik/tag yang sedikit lebih sering muncul (×1.3) dan diprioritaskan saat membuat soal |
| `weakAreas` | Topik/tag yang lebih sering muncul (×1.5) |
| `dailyGoalMinutes` | Target harian default (bisa diubah per perangkat di Setelan) |
| `levelThresholds.windowSize` | Berapa percobaan terakhir di level saat ini yang dihitung |
| `levelThresholds.levelUpAccuracy` | Akurasi minimal untuk naik level (0.8 = 80%) |

`profile.json` dibundel saat build → setelah mengubahnya, jalankan `npm run build` / deploy ulang.

Level: L1 Pemanasan, L2 Dasar, L3 Menengah, L4 Lanjut, L5 Interview. Naik level otomatis bila
akurasi ≥ ambang pada N percobaan terakhir di level itu. Tidak ada turun level otomatis; kamu bisa
memilih level mana pun di layar Latihan.

## 9. Backup: ekspor & impor progres

Progres hanya ada di perangkat itu (belum ada sinkronisasi di fase 1).

- **Ekspor:** Setelan → **Ekspor progres (JSON)** → file `programming-hub-backup-<tanggal>.json`.
  Simpan di Google Drive / laptop.
- **Impor:** Setelan → pilih mode → **Impor progres** → pilih file.
  - **Gabungkan**: riwayat digabung, data lain diambil yang paling baru. Cocok untuk memindahkan
    progres dari HP ke laptop tanpa kehilangan apa pun.
  - **Ganti semua**: progres di perangkat ini diganti total dengan isi file.
- **Reset**: menghapus semua progres di perangkat ini (ekspor dulu!).

Rutinitas yang disarankan: ekspor **seminggu sekali**, dan selalu sebelum menghapus data browser,
ganti HP, atau reinstall aplikasi.

## 10. Tantangan desktop (Go)

Go tidak dijalankan di browser. Soal Go berformat non-eksekusi (pilihan ganda, cari bug, dll.) bisa
dikerjakan di HP; soal penuh dikerjakan di komputer:

1. Pasang Go (https://go.dev/dl, versi ≥ 1.22). Cek: `go version`.
2. Di aplikasi: **Latihan → Tantangan desktop** (atau dari Hari ini) → buka soal →
   **Unduh starter (.zip)**.
3. Ekstrak, lalu di folder itu:
   ```bash
   go test ./...
   ```
   Awalnya tes **gagal** — itu normal. Edit file starter sampai semua tes lulus (`ok`).
4. Kembali ke aplikasi → **Tandai selesai**. Solusi referensi bisa dilihat setelahnya.

ZIP berisi `go.mod`, file starter, file `_test.go`, dan `README.md` berisi soal.

## 11. Troubleshooting

### Validator error
| Pesan | Artinya / perbaikan |
|---|---|
| `Unrecognized key: "explaination"` | Typo nama field. Skema strict. |
| `referenceSolution fails its tests — test 2: expected 6, got 5` | Solusi referensi atau `expected` salah. Perbaiki yang keliru, jangan lemahkan tes. |
| `starter code already passes all tests` | Starter sudah benar atau tes terlalu lemah. Kosongkan starter / tambah tes. |
| `answer.output does not match real output` | Output yang disimpan beda dengan hasil eksekusi. Pakai nilai `actual` di pesan (setelah dicek). |
| `track/level (...) does not match folder` | Pindahkan file ke folder yang benar atau ubah `level`. |
| `duplicate id` | Ganti salah satu id. |
| `template has N {{blank}} markers but answer.blanks has M` | Samakan jumlah kotak dan jawaban. |
| `Timeout after 3000 ms` | Ada loop tak berujung di solusi referensi. |
| `track "go" ... cannot use executable formats` | Track non-eksekusi; pakai format lain atau `desktop`. |

### Aplikasi tidak menampilkan versi terbaru (cache service worker)
- Biasanya muncul banner **"Versi baru tersedia → Muat ulang"**. Ketuk Muat ulang.
- Kalau tidak muncul: tutup semua tab/aplikasi lalu buka lagi (SW baru aktif setelah semua tab tertutup).
- Paksa: Chrome desktop → DevTools → Application → Service Workers → **Unregister**, lalu
  Storage → **Clear site data** (hati-hati: ini juga menghapus progres — ekspor dulu).
- Di Android: Setelan HP → Aplikasi → Chrome → Penyimpanan → kelola situs, atau uninstall/instal ulang PWA.
- Saat `npm run dev`, SW tidak aktif. Kalau sebelumnya pernah `preview` di port yang sama, unregister SW lama.

### IndexedDB / progres bermasalah
- Gunakan **Setelan → Reset semua progres** (ekspor dulu kalau masih bisa).
- Mode private/incognito: data hilang saat jendela ditutup.
- iOS bisa menghapus data situs yang lama tidak dibuka (> ~7 hari, untuk situs yang tidak di-install).
  Install sebagai PWA dan rutin ekspor.
- Impor gagal dengan pesan skema → file bukan backup aplikasi ini atau rusak.

### Lainnya
- **Tes kode tidak jalan / "Timeout"**: kode punya loop tak berujung; batas 3 detik (SQL 8 detik).
- **"Function `x` was not found"**: jangan ganti nama fungsi dari starter.
- **Keyboard HP menutupi toolbar** (iOS): scroll sedikit; Chrome Android otomatis menyesuaikan.
- **Halaman kosong setelah deploy di GitHub Pages**: pastikan `NEXT_PUBLIC_BASE_PATH` sesuai nama repo
  dan `.nojekyll` ada.

## 12. Rutinitas perawatan

**Mingguan (±30 menit)**
1. `git pull`, lalu di Claude Code: `/gen-questions <track> <level> 10` untuk 2 track
   (mis. track dengan topik lemah di layar Progres) → ±20 soal baru.
2. `/review-content` untuk soal non-eksekusi baru.
3. `npm run content:build`, buka aplikasi lokal (`npm run dev`), coba beberapa soal baru.
4. Commit & push → deploy otomatis.
5. Ekspor backup progres dari HP.

**Bulanan**
- Perbarui `profile.json` (`focusTopics`, `weakAreas`) sesuai layar Progres.
- Naikkan jumlah soal di level yang sudah kamu capai (L4–L5 butuh lebih banyak soal).
- `npm outdated` → update dependensi kecil, jalankan `npm test` dan `npm run build`.

**Target bank soal:** minimal ±30 soal per level yang sedang dikerjakan, supaya sesi tidak berulang.
