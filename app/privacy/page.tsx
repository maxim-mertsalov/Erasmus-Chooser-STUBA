import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Erasmus Chooser",
  description: "Privacy Policy for Erasmus Chooser",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-700 dark:bg-slate-950 dark:text-slate-300">
      <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-4 text-sm">
          <Link href="/" className="text-indigo-600 hover:underline dark:text-indigo-400">
            ← Back to Erasmus Chooser
          </Link>
          <Link href="/terms" className="text-slate-400 hover:text-slate-600 hover:underline dark:text-slate-500 dark:hover:text-slate-300">
            Terms of Use
          </Link>
        </div>

        <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-slate-100">Privacy Policy</h1>
        <p className="mt-1 text-xs text-slate-400">Last updated: November 10, 2026</p>

        <div className="mt-6 space-y-5 text-sm leading-relaxed">
          <section>
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">1. Overview</h2>
            <p className="mt-1">
              Erasmus Chooser is a client-first tool for browsing and organizing university exchange agreements. We do not operate our own user
              account database and we do not sell or share your spreadsheet data or notes with third parties.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">2. Google Account &amp; Google Drive / Sheets Data</h2>
            <p className="mt-1">
              If you sign in with Google, the app requests only the non-sensitive <code>https://www.googleapis.com/auth/drive.file</code> scope.
              This grants access strictly to spreadsheets you explicitly pick via Google Picker or copies created by the app.
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                Your Google OAuth access token is kept only in your browser&apos;s <code>sessionStorage</code> and is never sent to or stored on our
                server.
              </li>
              <li>Your basic Google profile email/display name is read only in your browser to label notes you create.</li>
              <li>
                Your notes, priorities, tags, links, and pin coordinates are written directly to the <code>_erasmus_app</code> sheet inside your
                chosen Google Spreadsheet.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">3. Local File Mode</h2>
            <p className="mt-1">
              If you upload a local spreadsheet (<code>.xlsx</code>, <code>.xls</code>, <code>.csv</code>), the file is parsed entirely inside your
              browser. Your file contents and notes stay in your browser&apos;s <code>localStorage</code> and are never uploaded to our server.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">4. Analytics &amp; Search Indexing</h2>
            <p className="mt-1">
              We use Google Tag Manager / Google Analytics to collect basic, aggregated usage statistics (such as page views, device type, and
              browser region) in order to understand how the site is used and improve it. Google Analytics may set cookies or collect standard
              usage telemetry as governed by Google&apos;s Privacy Policy. Your spreadsheet contents, university notes, and Google Drive tokens are
              never sent to analytics.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">5. Map &amp; Geocoding Services</h2>
            <p className="mt-1">
              To display partner universities on the map, university names and country codes (no personal user data) are queried against OpenStreetMap
              Nominatim and Komoot Photon via our geocoding proxy, and map tiles are loaded directly from OpenStreetMap.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">6. Data Removal</h2>
            <p className="mt-1">
              You can revoke the app&apos;s access at any time from your Google Account permissions settings, delete the <code>_erasmus_app</code>{" "}
              sheet from your spreadsheet, clear your browser storage, or block analytics cookies in your browser.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
