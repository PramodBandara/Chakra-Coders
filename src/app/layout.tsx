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
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <Suspense fallback={<div className="h-16 border-b border-line bg-paper" />}>
            <SiteHeader />
          </Suspense>
          <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
