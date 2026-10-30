/** Standard screen wrapper: centered column, room for the bottom tab bar. */
export function Page({ title, children, actions }: { title: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-28 pt-[calc(env(safe-area-inset-top)+1rem)]">
      <header className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{title}</h1>
        {actions}
      </header>
      {children}
    </main>
  );
}
