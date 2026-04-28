import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cinema, calmly found.",
  description: "A quieter way to browse Houston cinema showtimes."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen">
          {children}
          <footer className="mx-auto flex w-full max-w-[98rem] items-center justify-between gap-4 px-5 pb-8 pt-4 text-xs text-muted sm:px-8">
            <span>Houston showtime prototype</span>
            <Link className="focus-ring rounded-sm underline-offset-4 hover:underline" href="/privacy">
              Privacy
            </Link>
          </footer>
        </div>
      </body>
    </html>
  );
}
