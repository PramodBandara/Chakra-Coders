import { Suspense } from "react";
import type { Metadata } from "next";
import { Source_Serif_4 } from "next/font/google";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/components/auth-provider";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "AL Notes",
    template: "%s · AL Notes",
  },
  description: "A moderated library of Advanced Level notes shared by students.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${sourceSerif.variable} h-full antialiased`}
    >
      <body className="min-h-dvh bg-white">
        <AuthProvider>
          <div className="flex min-h-dvh flex-col md:flex-row">
            <Suspense fallback={<div className="h-14 border-b border-line bg-white md:h-dvh md:w-[4.75rem] md:border-r lg:w-60" />}>
              <SiteHeader />
            </Suspense>
            <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-24 sm:px-6 md:pb-10 lg:px-10 lg:py-10">{children}</main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
