import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Erasmus Chooser STU in Bratislava",
  description: "Choose your Erasmus partner university: table, notes and map",
  verification: {
    google: "sYi9cAemH4B45IXWlvbhb2mMb2XbBSDPjD9eUKGqHas",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <Script src="https://www.googletagmanager.com/gtm.js?id=GTM-T598JCN2" strategy="afterInteractive" />
        <Script id="google-tag-init" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());`}
        </Script>
      </body>
    </html>
  );
}
