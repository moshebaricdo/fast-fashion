import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";

import { AppShell } from "@/components/AppShell";
import { AppPageTransition } from "@/components/AppPageTransition";
import FloatingNav from "@/components/FloatingNav";
import { FloatingNavProvider } from "@/contexts/FloatingNavContext";
import { FLOATING_NAV_INSET } from "@/lib/navLayout";

import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Wardrobe",
  description: "Personal outfit planning from clothes you already own",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} h-full antialiased`}>
      <body className="min-h-full bg-background font-sans text-foreground">
        <FloatingNavProvider>
          <AppShell>
            <main
              className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
              style={{ paddingBottom: FLOATING_NAV_INSET }}
            >
              <AppPageTransition>{children}</AppPageTransition>
            </main>
            <FloatingNav />
          </AppShell>
        </FloatingNavProvider>
      </body>
    </html>
  );
}
