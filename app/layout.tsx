import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Erasmus Chooser",
  description: "Choose your Erasmus partner university: table, notes and map",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
