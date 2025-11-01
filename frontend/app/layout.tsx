// frontend/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import Header from "../components/Header";
import AnimatedBackground from "../components/AnimatedBackground";
import { Toaster } from "sonner"; 

export const metadata: Metadata = {
  title: "DuBuddy - Developer Platform",
  description: "Build your backend in minutes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen">
        <AuthProvider>
          <AnimatedBackground />
          <Header />
          <main className="relative p-4 sm:p-6 lg:p-8">
            {children}
          </main>
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
}
