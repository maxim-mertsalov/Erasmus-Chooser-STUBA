import Link from "next/link";
import { ArrowLeft, ExternalLink, Globe2, GraduationCap, Heart, MapPin, Scale, ShieldCheck } from "lucide-react";
import { GITHUB_URL, GitHubIcon } from "@/components/ui";

export const metadata = {
  title: "About — Erasmus Chooser STU",
  description: "About the Erasmus Chooser open-source tool for Slovak University of Technology in Bratislava.",
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-800 dark:bg-slate-950 dark:text-slate-200">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Erasmus Chooser</span>
        </Link>

        <header className="mt-6 border-b border-slate-200 pb-6 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 aspect-square items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md dark:bg-indigo-500">
              <GraduationCap className="h-7 w-7" strokeWidth={1.75} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                About Erasmus Chooser
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Created to make student exchange selection effortless, visual, and informed.
              </p>
            </div>
          </div>
        </header>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          <section>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              🎯 Why this project exists
            </h2>
            <p className="mt-2">
              Every year, hundreds of students at the <b>Slovak University of Technology in Bratislava (STU)</b> and other European
              universities navigate through dense, multi-page spreadsheets of bilateral Erasmus agreements. It was hard to answer
              basic questions: <i>Where are these universities actually located? How much Erasmus grant will I receive? Which cities are better suited for my budget?</i>
            </p>
            <p className="mt-2">
              <b>Erasmus Chooser</b> transforms dry official spreadsheets into a modern, interactive workspace:
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-2 font-semibold text-indigo-600 dark:text-indigo-400">
                  <MapPin className="h-4 w-4" />
                  <span>Interactive Map</span>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Instantly see partner campuses on a world map with geocoding and Google Maps links.
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-2 font-semibold text-emerald-600 dark:text-emerald-400">
                  <Scale className="h-4 w-4" />
                  <span>Side-by-Side Comparison</span>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Compare universities like smartphones: monthly grant rates, agreements, and notes aligned row-by-row.
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-2 font-semibold text-amber-600 dark:text-amber-400">
                  <Globe2 className="h-4 w-4" />
                  <span>Configurable Grants</span>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Pre-configured with official STU grant tiers (~670 €, ~600 €, ~540 €/mo) with full freedom to customize.
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-2 font-semibold text-violet-600 dark:text-violet-400">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Privacy First</span>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Your notes and files stay in your own browser or your own Google Drive. We never store your data.
                </p>
              </div>
            </div>
          </section>

          <section className="border-t border-slate-200 pt-6 dark:border-slate-800">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              💻 Open Source & GitHub
            </h2>
            <p className="mt-2">
              Erasmus Chooser is completely open-source. Anyone can inspect the source code, suggest improvements, report bugs, or
              adapt it for their own university.
            </p>
            <div className="mt-4">
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                <GitHubIcon className="h-4 w-4" />
                <span>View on GitHub</span>
                <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
              </a>
            </div>
          </section>

          <footer className="mt-8 border-t border-slate-200 pt-6 text-xs text-slate-400 dark:border-slate-800">
            <p className="flex items-center gap-1">
              Made with <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500" /> for students going abroad.
            </p>
          </footer>
        </div>
      </div>
    </main>
  );
}
