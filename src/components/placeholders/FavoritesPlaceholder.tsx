export default function FavoritesPlaceholder() {
  return (
    <div className="px-5 pt-8">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-muted">Saved</p>
        <h1 className="font-display text-3xl text-foreground">Favorites</h1>
      </header>
      <div className="rounded-2xl border border-border bg-surface p-6 text-center">
        <p className="text-sm text-muted">
          Saved outfit gallery — coming soon
        </p>
      </div>
    </div>
  );
}
