import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold">404</h1>
      <p className="mt-2 text-muted">Halaman tidak ditemukan.</p>
      <Link href="/" className="mt-4 inline-block text-accent underline">Beranda</Link>
    </main>
  );
}
