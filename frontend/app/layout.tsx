// frontend/app/layout.tsx (Complete, Updated File)

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
// --- 1. IMPORT THE TOASTER COMPONENT ---
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Study Buddy",
  description: "Your personal AI-powered study assistant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-900 min-h-screen`}>
        {/* --- 2. ADD THE TOASTER PROVIDER --- */}
        <Toaster
          position="top-center"
          reverseOrder={false}
          toastOptions={{
            style: {
              background: '#1e293b', // slate-800
              color: '#e2e8f0', // slate-200
            },
          }}
        />
        <Header />
        {children}
      </body>
    </html>
  );
}