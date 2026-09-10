import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteNav } from "@/components/SiteNav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GG HighTech — Enterprise Software & AI Engineering",
  description:
    "GG HighTech builds enterprise-grade web, mobile, and AI-integrated platforms — from interactive scope estimates to live staging previews.",
};

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export default function RootLayout({ children }: LayoutProps<"/">) {
  const body = (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-black text-white">
        <SiteNav clerkEnabled={clerkEnabled} />
        <div className="flex flex-1 flex-col">{children}</div>
      </body>
    </html>
  );

  return clerkEnabled ? <ClerkProvider>{body}</ClerkProvider> : body;
}
