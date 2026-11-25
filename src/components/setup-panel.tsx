export function SetupPanel() {
  return (
    <section className="rounded-lg border border-line bg-card p-6 sm:p-8">
      <p className="text-sm font-medium tracking-wide text-pine uppercase">Setup</p>
      <h2 className="mt-2 font-serif text-3xl text-ink">Add the Firebase web config for Google sign-in.</h2>
      <ol className="mt-5 space-y-3 text-sm leading-6 text-ink/80">
        <li>1. In Firebase, enable Authentication and the Google sign-in provider. Leave Firestore and Storage off.</li>
        <li>2. Copy `.env.example` to `.env.local` and paste the web app config from Project settings.</li>
        <li>3. In Firebase Authentication, add `localhost` to authorized domains, then restart the dev server.</li>
      </ol>
      <p className="mt-4 text-sm text-muted">
        This screen stays up because `.env.local` is missing, so the app has no Firebase keys yet. Notes and files are
        not stored in Firebase.
      </p>
    </section>
  );
}
