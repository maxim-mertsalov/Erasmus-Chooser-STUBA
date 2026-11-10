import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Erasmus Chooser",
  description: "Privacy Policy for Erasmus Chooser",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-700">
      <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <Link href="/" className="text-sm text-indigo-600 hover:underline">
          ← Back to Erasmus Chooser
        </Link>

        <h1 className="mt-4 text-2xl font-bold text-slate-900">Privacy Policy</h1>
        <p className="mt-1 text-xs text-slate-400">Last updated: November 10, 2026</p>

        <div className="mt-6 space-y-5 text-sm leading-relaxed">
          <section>
            <h2 className="font-semibold text-slate-900">1. Overview</h2>
            <p className="mt-1">
              Erasmus Chooser is a client-first tool for browsing and organizing university exchange agreements. We do not operate a user database,
              do not sell or share personal information, and do not track you with analytics or advertising cookies.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-slate-900">2. Google Account &amp; Google Drive / Sheets Data</h2>
            <p className="mt-1">
              If you sign in with Google, the app requests only the non-sensitive <code>https://www.googleapis.com/auth/drive.file</code> scope.
              This grants access strictly to spreadsheets you explicitly pick via Google Picker or copies created by the app.
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Your Google OAuth access token is kept only in your browser&apos;s <code>sessionStorage</code> and is never sent to or stored on our server.</li>
              <li>Your basic Google profile email/display name is read only in your browser to label notes you create.</li>
              <li>Your notes, priorities, tags, links, and pin coordinates are written directly to the <code>_erasmus_app</code> sheet inside your chosen Google Spreadsheet.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-slate-900">3. Local File Mode</h2>
            <p className="mt-1">
              If you upload a local spreadsheet (<code>.xlsx</code>, <code>.xls</code>, <code>.csv</code>), the file is parsed entirely inside your
              browser. Your file contents and notes stay in your browser&apos;s <code>localStorage</code> and are never uploaded to our server.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-slate-900">4. Map &amp; Geocoding Services</h2>
            <p className="mt-1">
              To display partner universities on the map, university names and country codes (no personal user data) are queried against OpenStreetMap
              Nominatim and Komoot Photon via our geocoding proxy, and map tiles are loaded directly from OpenStreetMap.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-slate-900">5. Data Removal</h2>
            <p className="mt-1">
              You can revoke the app&apos;s access at any time from your Google Account permissions settings, delete the <code>_erasmus_app</code>{" "}
              sheet from your spreadsheet, and clear your browser storage.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
