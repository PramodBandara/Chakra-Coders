export function SetupPanel() {
  return (
    <section className="rounded-3xl border border-line bg-card p-6 sm:p-8">
      <p className="text-sm font-medium tracking-wide text-pine uppercase">Setup</p>
      <h2 className="mt-2 font-serif text-3xl text-ink">Connect Firebase to open the library.</h2>
      <ol className="mt-5 space-y-3 text-sm leading-6 text-ink/80">
        <li>1. Create a Firebase project on the Blaze plan, then enable Google sign-in, Firestore, and Storage.</li>
        <li>2. Copy `.env.example` to `.env.local` and paste the web app config. Add `localhost` to authorized domains.</li>
        <li>3. Deploy `firestore.rules`, `storage.rules`, and `firestore.indexes.json`.</li>
        <li>
          4. Install `firebase-admin`, then promote yourself. Sign out and back in so the admin claim loads.
          <code className="mt-2 block overflow-x-auto rounded-xl bg-paper px-3 py-2 font-mono text-xs text-ink">
            node scripts/set-role.mjs --email you@gmail.com --role admin
          </code>
        </li>
      </ol>
      <p className="mt-4 text-sm text-muted">Set a Google Cloud budget alert before the first upload.</p>
    </section>
  );
}
