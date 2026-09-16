import type { Metadata } from "next";
import { Fraunces, Work_Sans } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({ 
  subsets: ["latin"], 
  variable: '--font-fraunces',
  display: 'swap',
});

const workSans = Work_Sans({ 
  subsets: ["latin"],
  variable: '--font-work-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Elaneeru | Farm-fresh tender coconuts, delivered",
  description: "We pick tender coconuts straight from the farm before sunrise and bring them to your door the same day — chilled, hygienically sealed, and ready to open.",
};

import { AuthProvider } from "@/contexts/AuthContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${fraunces.variable} ${workSans.variable} font-sans bg-bg text-ink antialiased`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
