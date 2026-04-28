import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-3xl flex-col justify-center px-5 py-12 sm:px-8">
      <Link className="focus-ring mb-10 w-fit rounded-sm text-sm text-muted underline-offset-4 hover:underline" href="/">
        Back to showtimes
      </Link>

      <p className="mb-4 text-xs uppercase tracking-[0.22em] text-muted">Privacy</p>
      <h1 className="text-5xl font-semibold leading-none tracking-normal text-ink sm:text-6xl">
        Quiet by design.
      </h1>

      <div className="mt-10 space-y-5 border-t border-line pt-8 text-base leading-7 text-ink">
        <p>
          CinemaCalmly is a lightweight prototype that uses fictional local sample data. It does
          not require an account and does not ask for personal information.
        </p>
        <p>
          This prototype does not use advertising cookies, analytics, tracking pixels, or
          third-party scripts. It does not sell data or collect personal preferences.
        </p>
        <p>The prototype keeps browsing local to the page and does not store selections.</p>
      </div>
    </main>
  );
}
