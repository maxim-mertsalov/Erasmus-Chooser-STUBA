import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Use — Erasmus Chooser",
  description: "Terms of Use for Erasmus Chooser",
};

export default function TermsOfUsePage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-700">
      <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center justify-between gap-4 text-sm">
          <Link href="/" className="text-indigo-600 hover:underline">
            ← Back to Erasmus Chooser
          </Link>
          <Link href="/privacy" className="text-slate-400 hover:text-slate-600 hover:underline">
            Privacy Policy
          </Link>
        </div>

        <h1 className="mt-4 text-2xl font-bold text-slate-900">Terms of Use</h1>
        <p className="mt-1 text-xs text-slate-400">Last updated: November 10, 2026</p>

        <div className="mt-6 space-y-5 text-sm leading-relaxed">
          <section>
            <h2 className="font-semibold text-slate-900">1. Purpose of the Tool</h2>
            <p className="mt-1">
              Erasmus Chooser is a free helper tool created to make browsing, filtering, and annotating university exchange agreements easier. It is
              an independent student/community project and is not an official application system of any university.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-slate-900">2. Accuracy of Information</h2>
            <p className="mt-1">
              All agreement data comes from the spreadsheet you load, and map coordinates may be automatically estimated via OpenStreetMap services.
              Always verify official deadlines, quotas, language requirements, and agreement validity with your home university&apos;s international
              office before applying.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-slate-900">3. Your Files &amp; Responsibility</h2>
            <p className="mt-1">
              You remain the owner of your spreadsheets, notes, and links. When sharing a Google Sheet with others, you are responsible for managing
              Google Drive viewing and editing permissions for that file.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-slate-900">4. Disclaimer</h2>
            <p className="mt-1">
              The service is provided &ldquo;as is&rdquo; without warranties of any kind. We are not liable for data loss, inaccurate geocoding
              results, or third-party service outages (including Google APIs and OpenStreetMap).
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
